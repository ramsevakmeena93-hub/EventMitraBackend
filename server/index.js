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
  .then(async () => {
    console.log('MongoDB connected');
    // Auto-fix roles on every startup
    const User = require('./models/User');
    const roleAssignments = [
      { email: '25it1ad12@mitsgwl.ac.in', name: 'Aditya Kumar Vaidey', role: 'abc' },
      { email: '25ai1am15@mitsgwl.ac.in', name: 'AmanVeer Singh Dugal', role: 'superadmin' },
      { email: '25mc1ma70@mitsgwl.ac.in', name: 'Manash Gupta', role: 'registrar' },
    ];
    for (const u of roleAssignments) {
      const updated = await User.findOneAndUpdate(
        { email: u.email },
        { name: u.name, role: u.role, isActive: true },
        { new: true }
      );
      if (updated) console.log(`[AutoFix] ${u.email} → role: ${updated.role}`);
    }
  })
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

// Force fix: delete old roles, upsert new ones directly
app.get('/api/force-fix-roles', async (req, res) => {
  const User = require('./models/User');
  const bcrypt = require('bcryptjs');

  // Delete all old abc/superadmin/registrar
  const deleted = await User.deleteMany({ role: { $in: ['abc', 'superadmin', 'registrar'] } });

  const randomPass = await bcrypt.hash('EventMitra@2026', 10);

  const newUsers = [
    { email: '25it1ad12@mitsgwl.ac.in', name: 'Aditya Kumar Vaidey', role: 'abc' },
    { email: '25ai1am15@mitsgwl.ac.in', name: 'AmanVeer Singh Dugal', role: 'superadmin' },
    { email: '25mc1ma70@mitsgwl.ac.in', name: 'Manash Gupta', role: 'registrar' },
  ];

  const results = [];
  for (const u of newUsers) {
    // Try to find existing (may have logged in as student)
    let user = await User.findOne({ email: u.email });
    if (user) {
      user.name = u.name;
      user.role = u.role;
      user.isActive = true;
      await user.save();
      results.push({ email: u.email, status: 'updated existing' });
    } else {
      // Create fresh with password
      await User.create({
        name: u.name,
        email: u.email,
        password: randomPass,
        role: u.role,
        isActive: true,
        branch: 'N/A',
        enrollmentNo: 'ADMIN-' + u.role.toUpperCase()
      });
      results.push({ email: u.email, status: 'created new' });
    }
  }

  res.json({ deletedOldUsers: deleted.deletedCount, results });
});

// Clean old roles and promote new users
app.get('/api/fix-roles', async (req, res) => {
  const User = require('./models/User');

  // Delete ALL old abc, superadmin, registrar users
  const deleted = await User.deleteMany({
    role: { $in: ['abc', 'superadmin', 'registrar'] }
  });

  const newUsers = [
    { email: '25it1ad12@mitsgwl.ac.in', name: 'Aditya Kumar Vaidey', role: 'abc' },
    { email: '25ai1am15@mitsgwl.ac.in', name: 'AmanVeer Singh Dugal', role: 'superadmin' },
    { email: '25mc1ma70@mitsgwl.ac.in', name: 'Manash Gupta', role: 'registrar' },
  ];

  const updates = [];
  for (const u of newUsers) {
    // Check if they've already logged in with Google (exist as student)
    const existing = await User.findOneAndUpdate(
      { email: u.email },
      { name: u.name, role: u.role, isActive: true },
      { new: true }
    );
    updates.push({
      email: u.email,
      name: u.name,
      role: u.role,
      status: existing ? 'promoted' : 'not_logged_in_yet'
    });
  }

  res.json({
    deletedOldUsers: deleted.deletedCount,
    updates,
    note: 'If status=not_logged_in_yet, ask them to login with Google first, then call this URL again.'
  });
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
