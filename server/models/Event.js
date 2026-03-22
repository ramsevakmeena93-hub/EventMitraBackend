const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['submitted', 'approved', 'rejected', 'modified'],
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'hod', 'abc', 'superadmin', 'registrar'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: String,
  reason: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  modifications: {
    date: Date,
    time: String,
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue'
    }
  }
});

const eventSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: String,
  branch: String,
  enrollmentNo: String,
  
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  hodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  abcId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  superAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  
  clubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club'
  },
  
  clubName: {
    type: String
  },
  
  date: {
    type: Date,
    required: true
  },
  
  startTime: {
    type: String,
    required: false
  },
  
  endTime: {
    type: String,
    required: false
  },
  
  // Keep for backward compatibility
  time: {
    type: String
  },
  
  reason: {
    type: String,
    required: true
  },
  
  eventDetails: {
    type: String,
    required: false
  },
  
  documentUrl: {
    type: String,
    required: false
  },
  
  documentName: {
    type: String,
    required: false
  },
  
  status: {
    type: String,
    enum: ['pending_faculty', 'pending_hod', 'pending_abc', 'pending_superadmin', 'approved', 'rejected', 'modification_pending', 'completed', 'feedback_pending'],
    default: 'pending_faculty'
  },
  
  currentApprover: {
    type: String,
    enum: ['faculty', 'hod', 'abc', 'superadmin', 'student', null],
    default: 'faculty'
  },
  
  // Event Completion & Feedback
  eventStatus: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'upcoming'
  },
  
  completedAt: {
    type: Date
  },
  
  feedbackSubmitted: {
    type: Boolean,
    default: false
  },
  
  feedbackSubmittedAt: {
    type: Date
  },
  
  feedback: {
    eventSummary: {
      type: String
    },
    successRating: {
      type: Number,
      min: 1,
      max: 5
    },
    attendanceCount: {
      type: Number
    },
    challenges: {
      type: String
    },
    suggestions: {
      type: String
    },
    finalReport: {
      type: String
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  feedbackReminderSent: {
    type: Boolean,
    default: false
  },
  
  feedbackReminderCount: {
    type: Number,
    default: 0
  },
  
  // Key Management
  keyStatus: {
    type: String,
    enum: ['not_required', 'pending_collection', 'collected', 'returned'],
    default: 'not_required'
  },
  
  keyCollectedAt: {
    type: Date
  },
  
  keyReturnedAt: {
    type: Date
  },
  
  keyCollectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  keyReturnedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  keyNotes: {
    type: String
  },
  
  images: { type: [String], default: [] },
  imagesUploadedAt: { type: Date },
  rejectionReason: String,
  
  history: [historySchema],
  
  modificationAccepted: {
    type: Boolean,
    default: null
  }
}, {
  timestamps: true
});

// Index for checking venue availability
eventSchema.index({ venueId: 1, date: 1, time: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema);
