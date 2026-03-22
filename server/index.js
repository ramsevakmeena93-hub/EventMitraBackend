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

// One-time fix endpoint for ABC user
app.get('/api/fix-abc', async (req, res) => {
  const User = require('./models/User');
  const abcUsers = await User.find({ role: 'abc' });
  const result = await User.findOneAndUpdate(
    { role: 'abc' },
    { name: 'Aditya Kumar Vaidey', email: '25it1ad12@mitsgwl.ac.in', isActive: true },
    { new: true }
  );
  res.json({ before: abcUsers.map(u => ({ name: u.name, email: u.email, isActive: u.isActive })), after: result ? { name: result.name, email: result.email, isActive: result.isActive } : null });
});

// Debug: show all users
app.get('/api/debug-users', async (req, res) => {
  const User = require('./models/User');
  const users = await User.find({}, 'name email role isActive').sort({ role: 1 });
  res.json(users);
});

// Promote users to correct roles by email
app.get('/api/fix-roles', async (req, res) => {
  const User = require('./models/User');
  const updates = [];

  const roles = [
    { email: '25it1ad12@mitsgwl.ac.in', name: 'Aditya Kumar Vaidey', role: 'abc' },
    { email: '25ai1am15@mitsgwl.ac.in', name: 'AmanVeer Singh Dugal', role: 'superadmin' },
    { email: '25mc1ma70@mitsgwl.ac.in', name: 'Manash Gupta', role: 'registrar' },
  ];

  for (const u of roles) {
    const result = await User.findOneAndUpdate(
      { email: u.email },
      { name: u.name, role: u.role, isActive: true },
      { new: true, upsert: false }
    );
    updates.push({ email: u.email, found: !!result, role: result?.role, isActive: result?.isActive });
  }

  res.json({ updates, note: 'If found=false, the user has not logged in with Google yet. Ask them to login first, then call this endpoint again.' });
});

// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  const { sendEmail } = require('./utils/email');
  const to = req.query.to;
  if (!to) return res.status(400).json({ message: 'Pass ?to=youremail@gmail.com' });
  const result = await sendEmail({
    to,
    subject: 'EventMitra Test Email',
    html: '<h2>✅ Email is working!</h2><p>This is a test from EventMitra system.</p>'
  });
  res.json(result);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running', version: '2.0' });
});

// Frontend is deployed on Vercel - no static files needed here

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
