const https = require('https');

const isEmailConfigured = () => !!(process.env.BREVO_API_KEY);

const sendEmail = async ({ to, subject, html, attachments }) => {
  if (!isEmailConfigured()) {
    console.log(`[Email] SKIPPED (BREVO_API_KEY not set) → To: ${to}`);
    return { success: false, error: 'Email not configured' };
  }

  const payload = JSON.stringify({
    sender: { name: 'EventMitra MITS', email: 'eventmitramits@gmail.com' },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    ...(attachments && attachments.length > 0 ? {
      attachment: attachments.map(a => ({
        name: a.filename,
        content: require('fs').readFileSync(a.path).toString('base64')
      }))
    } : {})
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          const parsed = JSON.parse(data);
          console.log(`[Email] SENT → To: ${to} | Subject: ${subject} | ID: ${parsed.messageId}`);
          resolve({ success: true, messageId: parsed.messageId });
        } else {
          console.error(`[Email] FAILED → To: ${to} | Status: ${res.statusCode} | ${data}`);
          resolve({ success: false, error: data });
        }
      });
    });

    req.on('error', (e) => {
      console.error(`[Email] FAILED → To: ${to} | Error: ${e.message}`);
      resolve({ success: false, error: e.message });
    });

    req.write(payload);
    req.end();
  });
};

const emailTemplates = {
  eventSubmitted: (studentName, eventDetails) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2563eb;">✅ Event Application Submitted</h2>
      <p>Dear <strong>${studentName}</strong>,</p>
      <p>Your event application has been submitted successfully and is now under review.</p>
      <div style="background: #f0f9ff; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px; color: #1e40af;">Event Details</h3>
        <p><strong>Venue:</strong> ${eventDetails.venue}</p>
        <p><strong>Date:</strong> ${eventDetails.date}</p>
        <p><strong>Time:</strong> ${eventDetails.time}</p>
        <p><strong>Reason:</strong> ${eventDetails.reason}</p>
      </div>
      <p>You will receive updates as your application moves through the approval process.</p>
      <p style="color: #6b7280; font-size: 12px;">— EventMitra Team</p>
    </div>
  `,

  eventApproved: (userName, role, eventDetails) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #16a34a;">✅ Event Approved by ${role}</h2>
      <p>Dear <strong>${userName}</strong>,</p>
      <p>Your event application has been approved by <strong>${role}</strong>.</p>
      <div style="background: #f0fdf4; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px; color: #15803d;">Event Details</h3>
        <p><strong>Venue:</strong> ${eventDetails.venue}</p>
        <p><strong>Date:</strong> ${eventDetails.date}</p>
        <p><strong>Time:</strong> ${eventDetails.time}</p>
        <p><strong>Status:</strong> ${eventDetails.status}</p>
        ${eventDetails.comment ? `<p><strong>Comment:</strong> ${eventDetails.comment}</p>` : ''}
      </div>
      <p style="color: #6b7280; font-size: 12px;">— EventMitra Team</p>
    </div>
  `,

  eventRejected: (userName, role, reason, eventDetails) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #dc2626;">❌ Event Application Rejected</h2>
      <p>Dear <strong>${userName}</strong>,</p>
      <p>Your event application has been rejected by <strong>${role}</strong>.</p>
      <div style="background: #fef2f2; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px; color: #b91c1c;">Rejection Reason</h3>
        <p>${reason}</p>
      </div>
      <div style="background: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <p><strong>Venue:</strong> ${eventDetails.venue}</p>
        <p><strong>Date:</strong> ${eventDetails.date}</p>
        <p><strong>Time:</strong> ${eventDetails.time}</p>
      </div>
      <p>You may submit a new application after addressing the concerns.</p>
      <p style="color: #6b7280; font-size: 12px;">— EventMitra Team</p>
    </div>
  `,

  pendingApproval: (userName, role, studentName, eventDetails) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #7c3aed;">🔔 New Event Approval Required</h2>
      <p>Dear <strong>${userName}</strong>,</p>
      <p>A new event application from <strong>${studentName}</strong> requires your approval as <strong>${role}</strong>.</p>
      <div style="background: #faf5ff; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px; color: #6d28d9;">Event Details</h3>
        <p><strong>Venue:</strong> ${eventDetails.venue}</p>
        <p><strong>Date:</strong> ${eventDetails.date}</p>
        <p><strong>Time:</strong> ${eventDetails.time}</p>
        <p><strong>Reason:</strong> ${eventDetails.reason}</p>
        ${eventDetails.comment ? `<p><strong>Comment:</strong> ${eventDetails.comment}</p>` : ''}
      </div>
      <p>Please log in to review and approve/reject this application.</p>
      <p style="color: #6b7280; font-size: 12px;">— EventMitra Team</p>
    </div>
  `,

  feedbackReminder: (facultyName, eventDetails) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #0891b2;">📋 Feedback Required for Completed Event</h2>
      <p>Dear <strong>${facultyName}</strong>,</p>
      <p>Your event has been completed. Please submit feedback to unlock future event bookings.</p>
      <div style="background: #ecfeff; padding: 16px; border-radius: 6px; margin: 16px 0;">
        <p><strong>Venue:</strong> ${eventDetails.venue}</p>
        <p><strong>Date:</strong> ${eventDetails.date}</p>
        <p><strong>Time:</strong> ${eventDetails.time}</p>
      </div>
      <p><strong>Note:</strong> You cannot book new events until feedback is submitted.</p>
      <p style="color: #6b7280; font-size: 12px;">— EventMitra Team</p>
    </div>
  `,

  eventModified: (studentName, modifications, eventDetails) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #d97706;">✏️ Event Application Modified</h2>
      <p>Dear <strong>${studentName}</strong>,</p>
      <p>The ABC has modified your event application.</p>
      <div style="background: #fffbeb; padding: 16px; border-radius: 6px; margin: 16px 0;">
        ${modifications.date ? `<p><strong>New Date:</strong> ${modifications.date}</p>` : ''}
        ${modifications.time ? `<p><strong>New Time:</strong> ${modifications.time}</p>` : ''}
        ${modifications.venue ? `<p><strong>New Venue:</strong> ${modifications.venue}</p>` : ''}
      </div>
      <p>Please log in to accept or reject these modifications.</p>
      <p style="color: #6b7280; font-size: 12px;">— EventMitra Team</p>
    </div>
  `
};

module.exports = { sendEmail, emailTemplates, isEmailConfigured };
