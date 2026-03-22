const Event = require('../models/Event');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

/**
 * Check and mark events as completed
 * This should run every hour or be triggered periodically
 */
const checkAndCompleteEvents = async (io) => {
  try {
    console.log('[EventCompletion] Starting event completion check...');
    
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    // Find all approved events on or before today
    const eventsToComplete = await Event.find({
      status: 'approved',
      eventStatus: { $in: ['upcoming', 'ongoing'] },
      date: { $lte: todayEnd }
    })
      .populate('facultyId', 'name email')
      .populate('venueId');

    console.log(`[EventCompletion] Found ${eventsToComplete.length} events to check`);

    let completedCount = 0;

    for (const event of eventsToComplete) {
      // Parse end time and check if event has passed
      const eventDate = new Date(event.date);
      
      if (event.endTime) {
        const [endHour, endMin] = event.endTime.split(':').map(Number);
        eventDate.setHours(endHour, endMin, 0, 0);
      } else {
        // If no end time, assume event ends at 6 PM
        eventDate.setHours(18, 0, 0, 0);
      }

      // Check if event has passed
      if (now > eventDate) {
        console.log(`[EventCompletion] Marking event ${event._id} as completed`);
        
        event.eventStatus = 'completed';
        event.completedAt = now;
        event.history.push({
          action: 'approved',
          role: 'superadmin',
          userId: event.facultyId._id,
          userName: 'System (Auto)',
          reason: 'Event automatically marked as completed',
          timestamp: now
        });

        await event.save();
        completedCount++;

        // Send notification to faculty
        try {
          await sendEmail({
            to: event.facultyId.email,
            subject: 'Event Completed - Feedback Required',
            html: `
              <h2>Event Completed</h2>
              <p>Dear ${event.facultyId.name},</p>
              <p>Your event has been completed:</p>
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

          console.log(`[EventCompletion] Notification sent to ${event.facultyId.email}`);
        } catch (emailError) {
          console.error('[EventCompletion] Email failed:', emailError.message);
        }

        // Send socket notification
        if (io) {
          io.to(event.facultyId._id.toString()).emit('notification', {
            type: 'event_completed',
            message: 'Your event has been completed. Please submit feedback.',
            eventId: event._id,
            timestamp: now
          });
        }
      }
    }

    console.log(`[EventCompletion] Completed ${completedCount} events`);
    return completedCount;
  } catch (error) {
    console.error('[EventCompletion] Error:', error);
    throw error;
  }
};

/**
 * Send reminders for pending feedback
 * This should run daily
 */
const sendFeedbackReminders = async (io) => {
  try {
    console.log('[FeedbackReminder] Starting feedback reminder check...');
    
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    // Find events completed more than 3 days ago without feedback
    const eventsNeedingFeedback = await Event.find({
      status: 'approved',
      eventStatus: 'completed',
      feedbackSubmitted: false,
      completedAt: { $lte: threeDaysAgo },
      feedbackReminderCount: { $lt: 3 } // Max 3 reminders
    })
      .populate('facultyId', 'name email')
      .populate('venueId');

    console.log(`[FeedbackReminder] Found ${eventsNeedingFeedback.length} events needing reminders`);

    for (const event of eventsNeedingFeedback) {
      try {
        await sendEmail({
          to: event.facultyId.email,
          subject: '⚠️ URGENT: Event Feedback Pending - EventMitra',
          html: `
            <h2 style="color: #dc2626;">⚠️ Feedback Submission Required</h2>
            <p>Dear ${event.facultyId.name},</p>
            <p><strong>Your event feedback is still pending:</strong></p>
            <ul>
              <li><strong>Event:</strong> ${event.reason}</li>
              <li><strong>Venue:</strong> ${event.venueId.name}</li>
              <li><strong>Date:</strong> ${event.date.toLocaleDateString()}</li>
              <li><strong>Completed:</strong> ${event.completedAt.toLocaleDateString()}</li>
            </ul>
            <p style="color: #dc2626; font-weight: bold;">
              ⚠️ You cannot book new events until this feedback is submitted.
            </p>
            <p>Please login to EventMitra and submit your feedback immediately.</p>
            <p>This is reminder #${event.feedbackReminderCount + 1}</p>
          `
        });

        event.feedbackReminderSent = true;
        event.feedbackReminderCount += 1;
        await event.save();

        console.log(`[FeedbackReminder] Reminder sent to ${event.facultyId.email}`);

        // Send socket notification
        if (io) {
          io.to(event.facultyId._id.toString()).emit('notification', {
            type: 'feedback_reminder',
            message: 'Urgent: Please submit feedback for your completed event',
            eventId: event._id,
            timestamp: now
          });
        }
      } catch (emailError) {
        console.error('[FeedbackReminder] Email failed:', emailError.message);
      }
    }

    console.log(`[FeedbackReminder] Sent ${eventsNeedingFeedback.length} reminders`);
    return eventsNeedingFeedback.length;
  } catch (error) {
    console.error('[FeedbackReminder] Error:', error);
    throw error;
  }
};

/**
 * Update event status to 'ongoing' for events happening now
 */
const updateOngoingEvents = async () => {
  try {
    console.log('[OngoingEvents] Checking for ongoing events...');
    
    const now = new Date();
    // Use start-of-day and end-of-day to correctly match today's events
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const events = await Event.find({
      status: 'approved',
      eventStatus: 'upcoming',
      date: { $gte: todayStart, $lte: todayEnd }
    });

    let ongoingCount = 0;

    for (const event of events) {
      const eventDate = new Date(event.date);
      
      if (event.startTime) {
        const [startHour, startMin] = event.startTime.split(':').map(Number);
        eventDate.setHours(startHour, startMin, 0, 0);
      }

      let endDate = new Date(event.date);
      if (event.endTime) {
        const [endHour, endMin] = event.endTime.split(':').map(Number);
        endDate.setHours(endHour, endMin, 0, 0);
      } else {
        endDate.setHours(18, 0, 0, 0);
      }

      // Check if event is currently ongoing
      if (now >= eventDate && now <= endDate) {
        event.eventStatus = 'ongoing';
        await event.save();
        ongoingCount++;
        console.log(`[OngoingEvents] Event ${event._id} is now ongoing`);
      }
    }

    console.log(`[OngoingEvents] Updated ${ongoingCount} events to ongoing`);
    return ongoingCount;
  } catch (error) {
    console.error('[OngoingEvents] Error:', error);
    throw error;
  }
};

module.exports = {
  checkAndCompleteEvents,
  sendFeedbackReminders,
  updateOngoingEvents
};
