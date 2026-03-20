const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, branch, enrollmentNo } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check enrollment number for students
    if (role === 'student' && enrollmentNo) {
      const existingEnrollment = await User.findOne({ enrollmentNo });
      if (existingEnrollment) {
        return res.status(400).json({ message: 'Enrollment number already exists' });
      }
    }

    const user = new User({
      name,
      email,
      password,
      role,
      department,
      branch,
      enrollmentNo
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        branch: user.branch,
        enrollmentNo: user.enrollmentNo
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        branch: user.branch,
        enrollmentNo: user.enrollmentNo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        department: req.user.department,
        branch: req.user.branch,
        enrollmentNo: req.user.enrollmentNo
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Google OAuth routes - only if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const passport = require('passport');

  // Initiate Google OAuth
  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  // Google OAuth callback
  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // Generate JWT token
      const token = jwt.sign(
        { userId: req.user._id, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      // Redirect to frontend with token
      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').trim()
      res.redirect(`${clientUrl}/auth/google/callback?token=${token}`);
    }
  );
} else {
  // Provide fallback routes when Google OAuth is not configured
  router.get('/google', (req, res) => {
    res.status(503).json({ message: 'Google OAuth is not configured' });
  });

  router.get('/google/callback', (req, res) => {
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').trim()
    res.redirect(`${clientUrl}/login?error=oauth_not_configured`);
  });
}

module.exports = router;
