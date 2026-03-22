const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { emitNotification } = require('../utils/socket');

// Check if faculty has pending feedback
router.get('/check-pending', auth, authorize('faculty'), async (req, res) => {
  try {
    console.log('[check-pending-feedback] Checking for faculty:', req.userId);
    
    const pendingFeedback = await Event.findOne({
      facultyId: req.userId,
      status: 'approved',
      eventStatus: 'completed',
      feedbackSubmitted: false
    }).populate('venueId');

    if (pendingFeedback) {
      console.log('[check-pending-feedback] Found pending feedback:', pendingFeedback._id);
      return res.json({
        hasPendingFeedback: true,
        event: pendingFeedback,
        message: 'You have a completed event that requires feedback submission before booking a new event.'
      });
    }

    console.log('[check-pending-feedback] No pending feedback found');
    res.json({ hasPendingFeedback: false });
  } catch (error) {
    console.error('[check-pending-feedback] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get events requiring feedback (for faculty)
router.get('/pending-events', auth, authorize('faculty'), async (req, res) => {
  try {
    const events = await Event.find({
      facultyId: req.userId,
      status: 'approved',
      eventStatus: 'completed',
      feedbackSubmitted: false
    })
      .populate('venueId')
      .populate('clubId', 'name')
      .sort({ completedAt: -1 });

    res.json(events);
  } catch (error) {
    console.error('[pending-events] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit feedback
router.post('/:eventId/submit', auth, authorize('faculty'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { eventSummary, successRating, attendanceCount, challenges, suggestions, finalReport } = req.body;

    console.log('[submit-feedback] Event:', eventId, '| Faculty:', req.userId);

    // Validate required fields
    if (!eventSummary || !successRating || !finalReport) {
      return res.status(400).json({ 
        message: 'Event summary, success rating, and final report are required' 
      });
    }

    if (successRating < 1 || successRating > 5) {
      return res.status(400).json({ 
        message: 'Success rating must be between 1 and 5' 
      });
    }

    const event = await Event.findById(eventId)
      .populate('venueId')
      .populate('facultyId', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Verify this is the faculty who booked the event
    if (event.facultyId._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You can only submit feedback for your own events' });
    }

    // Verify event is completed
    if (event.eventStatus !== 'completed') {
      return res.status(400).json({ message: 'Feedback can only be submitted for completed events' });
    }

    // Verify feedback not already submitted
    if (event.feedbackSubmitted) {
      return res.status(400).json({ message: 'Feedback has already been submitted for this event' });
    }

    // Update event with feedback
    event.feedback = {
      eventSummary,
      successRating,
      attendanceCount: attendanceCount || null,
      challenges: challenges || '',
      suggestions: suggestions || '',
      finalReport,
      submittedBy: req.userId
    };
    event.feedbackSubmitted = true;
    event.feedbackSubmittedAt = new Date();

    event.history.push({
      action: 'approved',
      role: 'faculty',
      userId: req.userId,
      userName: req.user.name,
      reason: 'Event feedback submitted',
      timestamp: new Date()
    });

    await event.save();

    console.log('[submit-feedback] Feedback submitted successfully');

    // Send confirmation email
    try {
      await sendEmail({
        to: event.facultyId.email,
        subject: 'Event Feedback Submitted - EventMitra',
        html: `
          <h2>Feedback Submitted Successfully</h2>
          <p>Dear ${event.facultyId.name},</p>
          <p>Thank you for submitting feedback for your event:</p>
          <ul>
            <li><strong>Event:</strong> ${event.reason}</li>
            <li><strong>Venue:</strong> ${event.venueId.name}</li>
            <li><strong>Date:</strong> ${event.date.toLocaleDateString()}</li>
            <li><strong>Rating:</strong> ${successRating}/5 ⭐</li>
          </ul>
          <p>You can now book new events.</p>
          <p>Thank you for using EventMitra!</p>
        `
      });

      // Notify ABC about feedback submission
      const abcUsers = await User.find({ role: 'abc', isActive: true });
      for (const abc of abcUsers) {
        await sendEmail({
          to: abc.email,
          subject: 'Event Feedback Received - EventMitra',
          html: `
            <h2>New Event Feedback</h2>
            <p>Dear ${abc.name},</p>
            <p>Feedback has been submitted for an event:</p>
            <ul>
              <li><strong>Event:</strong> ${event.reason}</li>
              <li><strong>Faculty:</strong> ${event.facultyId.name}</li>
              <li><strong>Venue:</strong> ${event.venueId.name}</li>
              <li><strong>Date:</strong> ${event.date.toLocaleDateString()}</li>
              <li><strong>Rating:</strong> ${successRating}/5 ⭐</li>
            </ul>
          `
        });
      }
    } catch (emailError) {
      console.error('[submit-feedback] Email sending failed (non-critical):', emailError.message);
    }

    // Send socket notification
    const io = req.app.get('io');
    if (io) {
      emitNotification(io, req.userId, {
        type: 'feedback_submitted',
        message: 'Feedback submitted successfully. You can now book new events.',
        eventId: event._id
      });
    }

    res.json({ 
      message: 'Feedback submitted successfully. You can now book new events.', 
      event 
    });
  } catch (error) {
    console.error('[submit-feedback] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get feedback for an event (ABC/Admin can view)
router.get('/:eventId', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate('venueId')
      .populate('facultyId', 'name email')
      .populate('feedback.submittedBy', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Only faculty who created event, ABC, or Super Admin can view feedback
    const canView = 
      event.facultyId._id.toString() === req.userId.toString() ||
      req.user.role === 'abc' ||
      req.user.role === 'superadmin';

    if (!canView) {
      return res.status(403).json({ message: 'Not authorized to view this feedback' });
    }

    if (!event.feedbackSubmitted) {
      return res.status(404).json({ message: 'Feedback not yet submitted for this event' });
    }

    res.json({
      event: {
        _id: event._id,
        reason: event.reason,
        venue: event.venueId,
        date: event.date,
        time: event.time,
        faculty: event.facultyId
      },
      feedback: event.feedback,
      submittedAt: event.feedbackSubmittedAt
    });
  } catch (error) {
    console.error('[get-feedback] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all feedback (ABC/Admin only)
router.get('/all/list', auth, authorize(['abc', 'superadmin']), async (req, res) => {
  try {
    const events = await Event.find({
      feedbackSubmitted: true
    })
      .populate('venueId')
      .populate('facultyId', 'name email department')
      .populate('clubId', 'name')
      .populate('feedback.submittedBy', 'name email')
      .sort({ feedbackSubmittedAt: -1 })
      .limit(100);

    res.json(events);
  } catch (error) {
    console.error('[all-feedback] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload event images after completion (faculty only, event creator only)
router.post('/:eventId/upload-images', auth, authorize('faculty'), async (req, res, next) => {
  // Lazy-load cloudinary upload to avoid crash if env vars not set
  let uploadImages;
  try {
    uploadImages = require('../config/cloudinary').uploadImages;
  } catch (e) {
    return res.status(500).json({ message: 'Image upload not configured', error: e.message });
  }
  uploadImages.array('images', 20)(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).populate('facultyId', 'name email');

    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.facultyId._id.toString() !== req.userId.toString())
      return res.status(403).json({ message: 'Only the event creator can upload images' });
    if (event.eventStatus !== 'completed')
      return res.status(400).json({ message: 'Images can only be uploaded for completed events' });
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: 'No images uploaded' });
    if (req.files.length < 5)
      return res.status(400).json({ message: 'Please upload at least 5 images' });

    const imageUrls = req.files.map(f => f.path);
    event.images = imageUrls;
    event.imagesUploadedAt = new Date();
    await event.save();

    console.log(`[upload-images] ${req.files.length} images uploaded for event ${eventId}`);
    res.json({ message: `${req.files.length} images uploaded successfully`, images: imageUrls });
  } catch (error) {
    console.error('[upload-images] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get gallery — latest completed event with images (public, no auth needed)
router.get('/gallery/latest', async (req, res) => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const event = await Event.findOne({
      eventStatus: 'completed',
      'images.0': { $exists: true },
      imagesUploadedAt: { $gte: oneWeekAgo }
    })
      .populate('venueId', 'name')
      .populate('facultyId', 'name')
      .sort({ imagesUploadedAt: -1 });

    if (!event) return res.json({ event: null, images: [] });

    res.json({
      event: {
        _id: event._id,
        reason: event.reason,
        venue: event.venueId?.name,
        faculty: event.facultyId?.name,
        date: event.date,
        completedAt: event.completedAt
      },
      images: event.images
    });
  } catch (error) {
    console.error('[gallery-latest] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

