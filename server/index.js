const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: (process.env.CLIENT_URL || 'http://localhost:5173').trim(),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
const allowedOrigin = (process.env.CLIENT_URL || 'http://localhost:5173').trim()
app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware - only if Google OAuth is configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const passport = require('./config/passport');
  app.use(passport.initialize());
  app.use(passport.session());
  console.log('Google OAuth enabled');
} else {
  console.log('Google OAuth not configured - using email/password authentication only');
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clubs', require('./routes/clubs'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/feedback', require('./routes/feedback'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  
  // Serve static files from client/dist
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Handle React routing - return index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Start Event Completion Service
const { checkAndCompleteEvents, sendFeedbackReminders, updateOngoingEvents } = require('./services/eventCompletionService');

// Run event completion check every hour
setInterval(() => {
  console.log('[Scheduler] Running event completion check...');
  checkAndCompleteEvents(io).catch(err => console.error('[Scheduler] Event completion error:', err));
}, 60 * 60 * 1000); // Every hour

// Run ongoing events check every 15 minutes
setInterval(() => {
  console.log('[Scheduler] Checking for ongoing events...');
  updateOngoingEvents().catch(err => console.error('[Scheduler] Ongoing events error:', err));
}, 15 * 60 * 1000); // Every 15 minutes

// Run feedback reminders once per day at 9 AM
const scheduleDaily = () => {
  const now = new Date();
  const scheduledTime = new Date();
  scheduledTime.setHours(9, 0, 0, 0);
  
  if (now > scheduledTime) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  
  const timeUntilScheduled = scheduledTime - now;
  
  setTimeout(() => {
    console.log('[Scheduler] Running daily feedback reminders...');
    sendFeedbackReminders(io).catch(err => console.error('[Scheduler] Feedback reminder error:', err));
    
    // Schedule next day
    setInterval(() => {
      console.log('[Scheduler] Running daily feedback reminders...');
      sendFeedbackReminders(io).catch(err => console.error('[Scheduler] Feedback reminder error:', err));
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }, timeUntilScheduled);
};

scheduleDaily();

// Run initial checks on startup
setTimeout(() => {
  console.log('[Startup] Running initial event checks...');
  checkAndCompleteEvents(io).catch(err => console.error('[Startup] Event completion error:', err));
  updateOngoingEvents().catch(err => console.error('[Startup] Ongoing events error:', err));
}, 5000); // Wait 5 seconds after startup

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
