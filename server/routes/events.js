const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Event = require('../models/Event');
const Venue = require('../models/Venue');
const User = require('../models/User');
const Club = require('../models/Club');
const { auth, authorize } = require('../middleware/auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const { emitEventUpdate, emitNotification } = require('../utils/socket');

// Ensure uploads directory exists (works on Render and local)
const uploadsDir = path.join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('[uploads] Created uploads/documents directory');
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = /\.(pdf|doc|docx|jpg|jpeg|png)$/i;
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/octet-stream' // fallback for some browsers
  ];
  const extOk = allowedExts.test(path.extname(file.originalname));
  const mimeOk = allowedMimes.includes(file.mimetype);
  
  if (extOk || mimeOk) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Check venue availability
router.post('/check-availability', auth, async (req, res) => {
  try {
    const { venueId, date, startTime, endTime, excludeEventId } = req.body;
    
    console.log('[check-availability] Request:', { venueId, date, startTime, endTime, excludeEventId });
    
    // Validate time is within allowed hours (8 AM to 6 PM)
    const [startHour] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    if (startHour < 8 || endHour > 18 || (endHour === 18 && endMin > 0)) {
      return res.json({ 
        available: false, 
        message: 'Bookings are only allowed between 8:00 AM and 6:00 PM' 
      });
    }
    
    if (startTime >= endTime) {
      return res.json({ 
        available: false, 
        message: 'End time must be after start time' 
      });
    }
    
    // Check for overlapping bookings
    // Only check events that are NOT rejected or cancelled
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const query = {
      venueId,
      date: bookingDate,
      status: { 
        $in: ['pending_hod', 'pending_abc', 'pending_superadmin', 'approved'] 
      }
    };
    
    // Exclude current event if editing
    if (excludeEventId) {
      query._id = { $ne: excludeEventId };
    }
    
    const existingEvents = await Event.find(query);
    
    console.log(`[check-availability] Found ${existingEvents.length} existing bookings for this venue on this date`);

    // Check for time overlap
    for (const event of existingEvents) {
      const existingStart = event.startTime;
      const existingEnd = event.endTime;
      
      if (existingStart && existingEnd) {
        // Check if times overlap
        const hasOverlap = (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        );
        
        if (hasOverlap) {
          console.log(`[check-availability] CONFLICT with event ${event._id}: ${existingStart} - ${existingEnd}`);
          return res.json({ 
            available: false, 
            message: `Venue is already booked from ${existingStart} to ${existingEnd}. Please choose a different time slot.`,
            conflictingEvent: {
              startTime: existingStart,
              endTime: existingEnd,
              reason: event.reason
            }
          });
        }
      }
    }

    console.log('[check-availability] Venue is AVAILABLE');
    res.json({ available: true, message: 'Venue is available' });
  } catch (error) {
    console.error('[check-availability] Error:', error);
    res.status(500).json({ message: 'Server error while checking availability', error: error.message });
  }
});

// Create event (Faculty creates for themselves)
router.post('/create', auth, authorize('faculty'), (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err) {
      console.error('[create-event] Multer error:', err.message);
      return res.status(400).json({ message: err.message || 'File upload error' });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('[create-event] Starting event creation...');
    console.log('[create-event] User:', req.user.name, '| Role:', req.user.role);
    
    // CHECK FOR PENDING FEEDBACK FIRST
    const pendingFeedback = await Event.findOne({
      facultyId: req.userId,
      status: 'approved',
      eventStatus: 'completed',
      feedbackSubmitted: false
    }).populate('venueId');

    if (pendingFeedback) {
      console.log('[create-event] BLOCKED: Faculty has pending feedback for event:', pendingFeedback._id);
      return res.status(403).json({
        message: 'Feedback submission for your previous event is mandatory before booking a new event.',
        pendingEvent: {
          _id: pendingFeedback._id,
          reason: pendingFeedback.reason,
          venue: pendingFeedback.venueId.name,
          date: pendingFeedback.date,
          completedAt: pendingFeedback.completedAt
        },
        requiresFeedback: true
      });
    }
    
    const { clubId, venueId, date, startTime, endTime, reason, eventDetails } = req.body;
    const io = req.app.get('io');

    console.log('[create-event] Request data:', { clubId, venueId, date, startTime, endTime, reason });

    // Validate time is within allowed hours
    const [startHour] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    if (startHour < 8 || endHour > 18 || (endHour === 18 && endMin > 0)) {
      console.log('[create-event] REJECTED: Time outside allowed hours');
      return res.status(400).json({ 
        message: 'Bookings are only allowed between 8:00 AM and 6:00 PM' 
      });
    }

    // Check availability ONE MORE TIME before creating
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);
    
    const existingEvents = await Event.find({
      venueId,
      date: bookingDate,
      status: { $in: ['pending_hod', 'pending_abc', 'pending_superadmin', 'approved'] }
    });

    console.log(`[create-event] Found ${existingEvents.length} existing events for this venue/date`);

    // Check for time overlap
    for (const event of existingEvents) {
      const existingStart = event.startTime;
      const existingEnd = event.endTime;
      
      if (existingStart && existingEnd) {
        const hasOverlap = (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        );
        
        if (hasOverlap) {
          console.log(`[create-event] REJECTED: Time conflict with event ${event._id}`);
          return res.status(400).json({ 
            message: `Venue is already booked from ${existingStart} to ${existingEnd}. Please choose a different time.` 
          });
        }
      }
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      console.log('[create-event] REJECTED: Venue not found');
      return res.status(404).json({ message: 'Venue not found' });
    }

    console.log('[create-event] Venue:', venue.name);

    // Use faculty as the applicant
    const faculty = req.user;

    // All venues go through HOD if a HOD exists for the faculty's department
    let hod = null;
    let initialStatus = 'pending_abc'; // Default: go to ABC directly
    let currentApprover = 'abc';

    // Try to find HOD by venue's hodDepartment first, then faculty's department
    const deptToSearch = venue.hodDepartment || faculty.department;
    if (deptToSearch) {
      hod = await User.findOne({
        role: 'hod',
        department: deptToSearch,
        isActive: true
      });
    }

    if (hod) {
      initialStatus = 'pending_hod';
      currentApprover = 'hod';
      console.log('[create-event] Workflow: Faculty → HOD (' + hod.name + ') → ABC → Super Admin');
    } else {
      console.log('[create-event] Workflow: Faculty → ABC → Super Admin (no HOD found for dept: ' + deptToSearch + ')');
    }

    const isSeminarHall = venue.name && venue.name.includes('Seminar Hall');

    // Get club if provided
    let club = null;
    if (clubId) {
      club = await Club.findById(clubId);
    }

    // Format time display
    const formatTime = (timeStr) => {
      const [hour, min] = timeStr.split(':').map(Number);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
    };
    const timeDisplay = `${formatTime(startTime)} - ${formatTime(endTime)}`;

    const event = new Event({
      studentId: req.userId, // Faculty is the applicant
      studentName: faculty.name,
      branch: faculty.department || 'Faculty',
      enrollmentNo: faculty.email, // Use email as identifier
      facultyId: req.userId,
      hodId: hod ? hod._id : undefined,
      clubId: clubId || undefined,
      clubName: club ? club.name : undefined,
      venueId,
      date: bookingDate,
      startTime,
      endTime,
      time: timeDisplay,
      reason,
      eventDetails,
      documentUrl: req.file ? `/uploads/documents/${req.file.filename}` : undefined,
      documentName: req.file ? req.file.originalname : undefined,
      status: initialStatus, // Either 'pending_hod' or 'pending_abc'
      currentApprover: currentApprover, // Either 'hod' or 'abc'
      eventStatus: 'upcoming', // Set event status to upcoming by default
      history: [{
        action: 'submitted',
        role: 'faculty',
        userId: req.userId,
        userName: req.user.name,
        timestamp: new Date(),
        reason: isSeminarHall ? 'Application submitted by faculty (Seminar Hall - requires HOD approval)' : 'Application submitted by faculty (Non-Seminar Hall - goes to ABC directly)'
      }]
    });

    await event.save();
    console.log('[create-event] Event saved to database:', event._id);

    // Respond immediately — emails sent in background
    res.status(201).json({ 
      message: 'Event application submitted successfully!', 
      event,
      workflow: hod ? 'Goes to HOD first → ABC → Super Admin' : 'Goes to ABC directly → Super Admin'
    });

    // Send emails in background (non-blocking)
    setImmediate(async () => {
      try {
        const attachments = req.file
          ? [{ filename: req.file.originalname, path: path.join(uploadsDir, req.file.filename) }]
          : [];

        // Confirmation email to faculty
        sendEmail({
          to: faculty.email,
          subject: 'Event Application Submitted - EventMitra',
          html: emailTemplates.eventSubmitted(faculty.name, {
            venue: venue.name,
            date: bookingDate.toLocaleDateString(),
            time: timeDisplay,
            reason
          })
        }).then(() => console.log('[create-event] Confirmation email sent to faculty'))
          .catch(e => console.error('[create-event] Faculty email failed:', e.message));

        if (hod) {
          sendEmail({
            to: hod.email,
            subject: `New Event Approval Required from ${faculty.name}`,
            html: emailTemplates.pendingApproval(hod.name, 'HOD', faculty.name, {
              venue: venue.name,
              date: bookingDate.toLocaleDateString(),
              time: timeDisplay,
              reason
            }),
            attachments
          }).then(() => console.log('[create-event] Email sent to HOD'))
            .catch(e => console.error('[create-event] HOD email failed:', e.message));

          if (io) {
            emitNotification(io, hod._id.toString(), {
              type: 'new_event',
              message: `New event approval required from ${faculty.name}`,
              eventId: event._id
            });
          }
        } else {
          const abcUsers = await User.find({ role: 'abc', isActive: true });
          for (const abc of abcUsers) {
            sendEmail({
              to: abc.email,
              subject: `New Event Approval Required from ${faculty.name}`,
              html: emailTemplates.pendingApproval(abc.name, 'Student Dean Welfare', faculty.name, {
                venue: venue.name,
                date: bookingDate.toLocaleDateString(),
                time: timeDisplay,
                reason
              }),
              attachments
            }).then(() => console.log('[create-event] Email sent to ABC:', abc.email))
              .catch(e => console.error('[create-event] ABC email failed:', e.message));

            if (io) {
              emitNotification(io, abc._id.toString(), {
                type: 'new_event',
                message: `New event approval required from ${faculty.name}`,
                eventId: event._id
              });
            }
          }
        }

        // Socket update
        if (io) {
          const userIdsToNotify = [req.userId];
          if (hod) {
            userIdsToNotify.push(hod._id);
          } else {
            const abcUsers = await User.find({ role: 'abc', isActive: true });
            abcUsers.forEach(abc => userIdsToNotify.push(abc._id));
          }
          emitEventUpdate(io, userIdsToNotify, event);
        }
      } catch (bgError) {
        console.error('[create-event] Background task error:', bgError.message);
      }
    });
  } catch (error) {
    console.error('[create-event] CRITICAL ERROR:', error);
    console.error('[create-event] Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Failed to create event. Please try again or contact support.', 
      error: error.message 
    });
  }
});

// Approve event
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('facultyId', 'name email')
      .populate('venueId');
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const io = req.app.get('io');
    const userRole = req.user.role;

    // Build attachment from event document if exists
    const eventAttachments = (event.documentUrl && event.documentName)
      ? [{ filename: event.documentName, path: path.join(uploadsDir, path.basename(event.documentUrl)) }]
      : [];

    // HOD approval
    if (userRole === 'hod' && event.status === 'pending_hod') {
      const abc = await User.findOne({ role: 'abc', isActive: true });

      if (!abc) {
        return res.status(404).json({ message: 'ABC not found' });
      }

      event.abcId = abc._id;
      event.status = 'pending_abc';
      event.currentApprover = 'abc';
      event.history.push({
        action: 'approved',
        role: 'hod',
        userId: req.userId,
        userName: req.user.name,
        timestamp: new Date()
      });

      await event.save();

      if (io) emitEventUpdate(io, [event.studentId._id, abc._id], event);
      res.json({ message: 'Event approved and forwarded to ABC', event });

      // Send emails in background
      setImmediate(() => {
        sendEmail({
          to: event.studentId.email,
          subject: 'Event Approved by HOD',
          html: emailTemplates.eventApproved(event.studentId.name, 'HOD', {
            venue: event.venueId.name,
            date: event.date.toLocaleDateString(),
            time: event.time,
            status: 'Pending ABC Approval'
          })
        }).catch(e => console.error('[approve-hod] Faculty email failed:', e.message));

        sendEmail({
          to: abc.email,
          subject: 'New Event Approval Required',
          html: emailTemplates.pendingApproval(abc.name, 'ABC', event.studentId.name, {
            venue: event.venueId.name,
            date: event.date.toLocaleDateString(),
            time: event.time,
            reason: event.reason
          }),
          attachments: eventAttachments
        }).catch(e => console.error('[approve-hod] ABC email failed:', e.message));
      });
      return;
    }

    // ABC approval (with super admin selection OR final approval)
    if (userRole === 'abc' && event.status === 'pending_abc') {
      const { superAdminId, abcFinalApproval, comment } = req.body;

      // ABC gives final approval directly
      if (abcFinalApproval) {
        event.status = 'approved';
        event.currentApprover = null;
        event.keyStatus = 'pending_collection';
        event.abcId = req.userId;
        event.history.push({
          action: 'approved',
          role: 'abc',
          userId: req.userId,
          userName: req.user.name,
          reason: comment || 'Final approval by ABC (Ultimate Authority)',
          timestamp: new Date()
        });

        await event.save();

        if (io) emitEventUpdate(io, [event.studentId._id, event.facultyId, event.hodId], event);
        res.json({ message: 'Event finally approved by ABC', event });

        // Send emails in background
        setImmediate(async () => {
          sendEmail({
            to: event.studentId.email,
            subject: 'Event Finally Approved by ABC - Collect Key',
            html: emailTemplates.eventApproved(event.studentId.name, 'ABC (Final Authority)', {
              venue: event.venueId.name,
              date: event.date.toLocaleDateString(),
              time: event.time,
              status: 'APPROVED - Please collect key from Registrar Office',
              comment: comment || ''
            })
          }).catch(e => console.error('[approve-abc-final] Faculty email failed:', e.message));

          try {
            const registrar = await User.findOne({ role: 'registrar', isActive: true });
            if (registrar) {
              sendEmail({
                to: registrar.email,
                subject: 'New Key Collection Pending',
                html: `
                  <h2>Key Collection Required</h2>
                  <p>Dear ${registrar.name},</p>
                  <p>A new event has been approved and requires key collection:</p>
                  <ul>
                    <li><strong>Student:</strong> ${event.studentId.name}</li>
                    <li><strong>Venue:</strong> ${event.venueId.name}</li>
                    <li><strong>Date:</strong> ${event.date.toLocaleDateString()}</li>
                    <li><strong>Time:</strong> ${event.time}</li>
                  </ul>
                  <p>Please prepare the key for collection.</p>
                `
              }).catch(e => console.error('[approve-abc-final] Registrar email failed:', e.message));
            }
          } catch (e) { console.error('[approve-abc-final] BG error:', e.message); }
        });
        return;
      }

      // ABC forwards to Super Admin(s)
      const { superAdminIds } = req.body;

      const adminIds = superAdminIds && superAdminIds.length > 0
        ? (Array.isArray(superAdminIds) ? superAdminIds : [superAdminIds])
        : superAdminId ? [superAdminId] : [];

      if (adminIds.length === 0) {
        return res.status(400).json({ message: 'Please select at least one Super Admin to forward to' });
      }

      const superAdminDocs = await User.find({ _id: { $in: adminIds }, role: 'superadmin' });
      if (superAdminDocs.length === 0) {
        return res.status(404).json({ message: 'No valid Super Admins found' });
      }

      event.superAdminId = superAdminDocs[0]._id;
      event.abcId = req.userId;
      event.status = 'pending_superadmin';
      event.currentApprover = 'superadmin';
      event.history.push({
        action: 'approved',
        role: 'abc',
        userId: req.userId,
        userName: req.user.name,
        reason: comment || `Approved and forwarded to ${superAdminDocs.length} Super Admin(s)`,
        timestamp: new Date()
      });

      await event.save();

      if (io) emitEventUpdate(io, [event.studentId._id, ...adminIds], event);
      res.json({ message: `Event approved and forwarded to ${superAdminDocs.length} Super Admin(s)`, event });

      // Send emails in background
      setImmediate(() => {
        sendEmail({
          to: event.studentId.email,
          subject: 'Event Approved by ABC',
          html: emailTemplates.eventApproved(event.studentId.name, 'ABC', {
            venue: event.venueId.name,
            date: event.date.toLocaleDateString(),
            time: event.time,
            status: 'Pending Super Admin Approval',
            comment: comment || ''
          })
        }).catch(e => console.error('[approve-abc] Faculty email failed:', e.message));

        for (const sa of superAdminDocs) {
          sendEmail({
            to: sa.email,
            subject: 'New Event Approval Required',
            html: emailTemplates.pendingApproval(sa.name, 'Super Admin', event.studentId.name, {
              venue: event.venueId.name,
              date: event.date.toLocaleDateString(),
              time: event.time,
              reason: event.reason,
              comment: comment || ''
            }),
            attachments: eventAttachments
          }).catch(e => console.error('[approve-abc] SuperAdmin email failed:', e.message));
        }
      });
      return;
    }

    // Super Admin final approval
    if (userRole === 'superadmin' && event.status === 'pending_superadmin') {
      event.status = 'approved';
      event.currentApprover = null;
      event.keyStatus = 'pending_collection';
      event.history.push({
        action: 'approved',
        role: 'superadmin',
        userId: req.userId,
        userName: req.user.name,
        timestamp: new Date()
      });

      await event.save();

      if (io) emitEventUpdate(io, [event.studentId._id, event.facultyId, event.hodId, event.abcId], event);
      res.json({ message: 'Event finally approved', event });

      // Send email in background
      setImmediate(() => {
        sendEmail({
          to: event.studentId.email,
          subject: 'Event Finally Approved - Collect Key from Registrar',
          html: emailTemplates.eventApproved(event.studentId.name, 'Super Admin', {
            venue: event.venueId.name,
            date: event.date.toLocaleDateString(),
            time: event.time,
            status: 'APPROVED - Please collect key from Registrar Office'
          })
        }).catch(e => console.error('[approve-superadmin] Email failed:', e.message));
      });
      return;
    }

    res.status(403).json({ message: 'Not authorized to approve at this stage' });
  } catch (error) {
    console.error('[approve] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject event
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const event = await Event.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('venueId');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const io = req.app.get('io');

    event.status = 'rejected';
    event.rejectionReason = reason;
    event.currentApprover = null;
    event.history.push({
      action: 'rejected',
      role: req.user.role,
      userId: req.userId,
      userName: req.user.name,
      reason,
      timestamp: new Date()
    });

    await event.save();

    if (io) {
      emitNotification(io, event.studentId._id, {
        type: 'event_rejected',
        message: `Your event application has been rejected by ${req.user.role}`,
        eventId: event._id,
        reason
      });
    }

    res.json({ message: 'Event rejected', event });

    // Send email in background
    setImmediate(() => {
      sendEmail({
        to: event.studentId.email,
        subject: 'Event Application Rejected',
        html: emailTemplates.eventRejected(event.studentId.name, req.user.role.toUpperCase(), reason, {
          venue: event.venueId.name,
          date: event.date.toLocaleDateString(),
          time: event.time
        })
      }).catch(e => console.error('[reject] Email failed:', e.message));
    });
  } catch (error) {
    console.error('[reject] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get my events
router.get('/my-events', auth, async (req, res) => {
  try {
    let query = {};

    switch (req.user.role) {
      case 'student':
        query = { studentId: req.userId };
        break;
      case 'faculty':
        query = { facultyId: req.userId };
        break;
      case 'hod':
        query = { hodId: req.userId };
        break;
      case 'abc':
        query = { status: 'pending_abc' };
        break;
      case 'superadmin':
        query = { superAdminId: req.userId };
        break;
      case 'registrar':
        query = { status: 'approved', keyStatus: { $in: ['pending_collection', 'collected'] } };
        break;
    }

    const events = await Event.find(query)
      .populate('studentId', 'name email branch enrollmentNo')
      .populate('facultyId', 'name email')
      .populate('hodId', 'name email')
      .populate('abcId', 'name email')
      .populate('superAdminId', 'name email')
      .populate('venueId')
      .populate('clubId', 'name')
      .sort({ createdAt: -1 });

    res.json(events);
  } catch (error) {
    console.error('[my-events] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending approvals
router.get('/pending', auth, async (req, res) => {
  try {
    let query = {};

    switch (req.user.role) {
      case 'hod':
        query = { status: 'pending_hod' };
        break;
      case 'abc':
        query = { status: 'pending_abc' };
        break;
      case 'superadmin':
        query = { superAdminId: req.userId, status: 'pending_superadmin' };
        break;
      default:
        return res.json([]);
    }

    const events = await Event.find(query)
      .populate('studentId', 'name email branch enrollmentNo')
      .populate('facultyId', 'name email')
      .populate('venueId')
      .populate('clubId', 'name')
      .sort({ createdAt: -1 });

    res.json(events);
  } catch (error) {
    console.error('[pending] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all events (for ABC/admins to view all college events)
router.get('/all', auth, async (req, res) => {
  try {
    const events = await Event.find({})
      .populate('studentId', 'name email branch enrollmentNo')
      .populate('facultyId', 'name email department')
      .populate('hodId', 'name email department')
      .populate('abcId', 'name email')
      .populate('superAdminId', 'name email')
      .populate('venueId')
      .populate('clubId', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(events);
  } catch (error) {
    console.error('[all-events] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all approved upcoming/ongoing events (PROTECTED - requires login)
router.get('/public/approved', auth, async (req, res) => {
  try {
    const events = await Event.find({
      status: 'approved',
      eventStatus: { $in: ['upcoming', 'ongoing'] }
    })
      .populate('studentId', 'name email branch enrollmentNo')
      .populate('facultyId', 'name email department')
      .populate('venueId')
      .populate('clubId', 'name')
      .sort({ date: 1, startTime: 1 })
      .limit(50);
    res.json(events);
  } catch (error) {
    console.error('[approved-events] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get event by ID  ← must stay AFTER all named routes
router.get('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('studentId', 'name email branch enrollmentNo')
      .populate('facultyId', 'name email')
      .populate('hodId', 'name email')
      .populate('abcId', 'name email')
      .populate('superAdminId', 'name email')
      .populate('venueId')
      .populate('clubId', 'name')
      .populate('keyCollectedBy', 'name email')
      .populate('keyReturnedTo', 'name email')
      .populate('history.userId', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('[get-event] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get events pending key collection (for Registrar)
router.get('/keys/pending', auth, authorize('registrar'), async (req, res) => {
  try {
    const events = await Event.find({
      status: 'approved',
      keyStatus: 'pending_collection'
    })
      .populate('studentId', 'name email branch enrollmentNo')
      .populate('venueId')
      .sort({ date: 1 });

    res.json(events);
  } catch (error) {
    console.error('[keys-pending] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get events with collected keys (for Registrar)
router.get('/keys/collected', auth, authorize('registrar'), async (req, res) => {
  try {
    const events = await Event.find({
      status: 'approved',
      keyStatus: 'collected'
    })
      .populate('studentId', 'name email branch enrollmentNo')
      .populate('venueId')
      .populate('keyCollectedBy', 'name email')
      .sort({ keyCollectedAt: -1 });

    res.json(events);
  } catch (error) {
    console.error('[keys-collected] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark key as collected (Registrar)
router.post('/:id/key-collected', auth, authorize('registrar'), async (req, res) => {
  try {
    const { notes } = req.body;
    const event = await Event.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('venueId');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.keyStatus !== 'pending_collection') {
      return res.status(400).json({ message: 'Key is not pending collection' });
    }

    const io = req.app.get('io');

    event.keyStatus = 'collected';
    event.keyCollectedAt = new Date();
    event.keyCollectedBy = req.userId;
    event.keyNotes = notes || '';

    event.history.push({
      action: 'approved',
      role: 'registrar',
      userId: req.userId,
      userName: req.user.name,
      reason: 'Key collected by student',
      timestamp: new Date()
    });

    await event.save();

    try {
      await sendEmail({
        to: event.studentId.email,
        subject: 'Key Collected - EventMitra',
        html: `
          <h2>Key Collected Successfully</h2>
          <p>Dear ${event.studentId.name},</p>
          <p>You have successfully collected the key for:</p>
          <ul>
            <li><strong>Venue:</strong> ${event.venueId.name}</li>
            <li><strong>Date:</strong> ${event.date.toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${event.time}</li>
          </ul>
          <p><strong>Please return the key after your event.</strong></p>
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        `
      });
    } catch (emailError) {
      console.error('[key-collected] Email sending failed (non-critical):', emailError.message);
    }

    if (io) {
      emitNotification(io, event.studentId._id, {
        type: 'key_collected',
        message: 'Key collected successfully. Please return after event.',
        eventId: event._id
      });
    }

    res.json({ message: 'Key marked as collected', event });
  } catch (error) {
    console.error('[key-collected] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark key as returned (Registrar)
router.post('/:id/key-returned', auth, authorize('registrar'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('venueId');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.keyStatus !== 'collected') {
      return res.status(400).json({ message: 'Key is not collected yet' });
    }

    const io = req.app.get('io');

    event.keyStatus = 'returned';
    event.keyReturnedAt = new Date();
    event.keyReturnedTo = req.userId;

    event.history.push({
      action: 'approved',
      role: 'registrar',
      userId: req.userId,
      userName: req.user.name,
      reason: 'Key returned by student',
      timestamp: new Date()
    });

    await event.save();

    try {
      await sendEmail({
        to: event.studentId.email,
        subject: 'Key Returned - EventMitra',
        html: `
          <h2>Key Returned Successfully</h2>
          <p>Dear ${event.studentId.name},</p>
          <p>Thank you for returning the key for:</p>
          <ul>
            <li><strong>Venue:</strong> ${event.venueId.name}</li>
            <li><strong>Date:</strong> ${event.date.toLocaleDateString()}</li>
            <li><strong>Time:</strong> ${event.time}</li>
          </ul>
          <p>Your booking is now complete.</p>
        `
      });
    } catch (emailError) {
      console.error('[key-returned] Email sending failed (non-critical):', emailError.message);
    }

    if (io) {
      emitNotification(io, event.studentId._id, {
        type: 'key_returned',
        message: 'Key returned successfully. Booking complete.',
        eventId: event._id
      });
    }

    res.json({ message: 'Key marked as returned', event });
  } catch (error) {
    console.error('[key-returned] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark event as completed (Registrar) - Triggers feedback requirement
router.post('/:id/mark-completed', auth, authorize('registrar'), async (req, res) => {
  try {
    console.log('[mark-completed] Registrar marking event as completed:', req.params.id);
    
    const event = await Event.findById(req.params.id)
      .populate('facultyId', 'name email')
      .populate('studentId', 'name email')
      .populate('venueId');

    if (!event) {
      console.log('[mark-completed] Event not found');
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.status !== 'approved') {
      console.log('[mark-completed] Event not approved');
      return res.status(400).json({ message: 'Only approved events can be marked as completed' });
    }

    if (event.eventStatus === 'completed') {
      console.log('[mark-completed] Event already completed');
      return res.status(400).json({ message: 'Event is already marked as completed' });
    }

    const io = req.app.get('io');
    const now = new Date();

    // Mark event as completed
    event.eventStatus = 'completed';
    event.completedAt = now;
    event.history.push({
      action: 'approved',
      role: 'registrar',
      userId: req.userId,
      userName: req.user.name,
      reason: 'Event marked as completed by Registrar',
      timestamp: now
    });

    await event.save();
    console.log('[mark-completed] Event marked as completed successfully');

    // Send notification to faculty to submit feedback
    const facultyEmail = event.facultyId?.email || event.studentId?.email;
    const facultyName = event.facultyId?.name || event.studentId?.name;
    const facultyId = event.facultyId?._id || event.studentId?._id;

    if (facultyEmail && facultyName) {
      try {
        await sendEmail({
          to: facultyEmail,
          subject: 'Event Completed - Feedback Required',
          html: `
            <h2>Event Completed</h2>
            <p>Dear ${facultyName},</p>
            <p>Your event has been marked as completed by the Registrar:</p>
            <ul>
              <li><strong>Event:</strong> ${event.reason}</li>
              <li><strong>Venue:</strong> ${event.venueId.name}</li>
              <li><strong>Date:</strong> ${event.date.toLocaleDateString()}</li>
              <li><strong>Time:</strong> ${event.time}</li>
            </ul>
            <p><strong>⚠️ IMPORTANT: Please submit your event feedback form.</strong></p>
            <p>You will not be able to book new events until feedback is submitted.</p>
            <p>Login to EventMitra to submit your feedback.</p>
          `
        });
        console.log('[mark-completed] Feedback notification email sent to:', facultyEmail);
      } catch (emailError) {
        console.error('[mark-completed] Email failed:', emailError.message);
      }

      // Send socket notification
      if (io && facultyId) {
        emitNotification(io, facultyId.toString(), {
          type: 'event_completed',
          message: 'Your event has been completed. Please submit feedback.',
          eventId: event._id,
          timestamp: now
        });
        console.log('[mark-completed] Socket notification sent');
      }
    }

    res.json({ 
      message: 'Event marked as completed. Faculty has been notified to submit feedback.', 
      event 
    });
  } catch (error) {
    console.error('[mark-completed] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ABC Create Event (ABC creates directly — no student/faculty needed, auto HOD assign)
router.post('/abc-create', auth, authorize('abc'), async (req, res) => {
  try {
    const { venueId, date, startTime, endTime, reason, clubName } = req.body;
    const io = req.app.get('io');

    if (!venueId || !date || !startTime || !endTime || !reason) {
      return res.status(400).json({ message: 'venueId, date, startTime, endTime, and reason are required' });
    }

    // Validate time range
    const [startHour] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    if (startHour < 8 || endHour > 18 || (endHour === 18 && endMin > 0)) {
      return res.status(400).json({ message: 'Bookings are only allowed between 8:00 AM and 6:00 PM' });
    }

    // Check venue availability
    const bookingDate = new Date(date);
    const existingEvents = await Event.find({
      venueId,
      date: bookingDate,
      status: { $in: ['pending_hod', 'pending_abc', 'pending_superadmin', 'approved'] }
    });
    for (const ev of existingEvents) {
      const es = ev.startTime, ee = ev.endTime;
      if (es && ee) {
        if ((startTime >= es && startTime < ee) || (endTime > es && endTime <= ee) || (startTime <= es && endTime >= ee)) {
          return res.status(400).json({ message: 'Venue already booked for this time slot' });
        }
      }
    }

    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ message: 'Venue not found' });

    console.log(`[abc-create] Venue: "${venue.name}", hodDepartment: "${venue.hodDepartment}"`);

    // Auto-assign HOD: primary by venue.hodDepartment, fallback for Seminar Hall
    let hod = null;
    const isSeminarHallABC = venue.name && /seminar hall/i.test(venue.name);
    const deptToSearch = venue.hodDepartment || venue.department;

    if (deptToSearch) {
      hod = await User.findOne({
        role: 'hod',
        department: { $regex: new RegExp('^' + deptToSearch.trim() + '$', 'i') },
        isActive: true
      });
      console.log('[abc-create] HOD search for dept ' + deptToSearch + ': ' + (hod ? hod.name : 'NOT FOUND'));
    } else {
      console.log('[abc-create] No hodDepartment on venue: ' + venue.name);
    }

    // Fallback: Seminar Hall always needs a HOD approval
    if (!hod && isSeminarHallABC) {
      hod = await User.findOne({ role: 'hod', isActive: true });
      console.log('[abc-create] Seminar Hall fallback HOD: ' + (hod ? hod.name + ' (' + hod.department + ')' : 'NONE IN DB'));
    }

    if (!hod) console.log('[abc-create] No HOD found — event goes directly to ABC');

    const formatTime = (t) => {
      const [h, m] = t.split(':').map(Number);
      const p = h >= 12 ? 'PM' : 'AM';
      const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${dh}:${m.toString().padStart(2, '0')} ${p}`;
    };
    const timeDisplay = `${formatTime(startTime)} - ${formatTime(endTime)}`;

    // Use ABC user as organizer (studentId + facultyId both set to ABC user)
    const abcUser = await User.findById(req.userId);

    const initialStatus = hod ? 'pending_hod' : 'pending_abc';
    const currentApprover = hod ? 'hod' : 'abc';

    const event = new Event({
      studentId: req.userId,
      studentName: abcUser.name,
      branch: abcUser.department || 'ABC',
      enrollmentNo: 'ABC-ADMIN',
      facultyId: req.userId,
      venueId,
      hodId: hod ? hod._id : undefined,
      date: bookingDate,
      startTime,
      endTime,
      time: timeDisplay,
      reason,
      clubName: clubName || undefined,
      status: initialStatus,
      currentApprover,
      eventStatus: 'upcoming',
      history: [{
        action: 'submitted',
        role: 'abc',
        userId: req.userId,
        userName: abcUser.name,
        reason: 'Event created directly by ABC Admin',
        timestamp: new Date()
      }]
    });

    await event.save();

    // Notify HOD or ABC (self)
    if (hod) {
      try {
        await sendEmail({
          to: hod.email,
          subject: 'New Event Approval Required (Created by ABC)',
          html: emailTemplates.pendingApproval(hod.name, 'HOD', abcUser.name, {
            venue: venue.name,
            date: bookingDate.toLocaleDateString(),
            time: timeDisplay,
            reason
          })
        });
        if (io) emitNotification(io, hod._id.toString(), { type: 'new_event', message: `New event created by ABC requires your approval`, eventId: event._id });
      } catch (e) { console.error('Email error:', e.message); }
    }

    res.status(201).json({ message: 'Event created successfully by ABC', event, workflow: hod ? `HOD (${hod.name}) → ABC → Super Admin` : 'ABC → Super Admin' });
  } catch (error) {
    console.error('ABC create event error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

