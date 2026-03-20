const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get faculty list
router.get('/faculty', auth, async (req, res) => {
  try {
    const faculty = await User.find({ 
      role: 'faculty', 
      isActive: true 
    }).select('name email department');
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get students list
router.get('/students', auth, async (req, res) => {
  try {
    const students = await User.find({ 
      role: 'student', 
      isActive: true 
    }).select('name email branch enrollmentNo');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get HODs list
router.get('/hods', auth, async (req, res) => {
  try {
    const hods = await User.find({ 
      role: 'hod', 
      isActive: true 
    }).select('name email department');
    res.json(hods);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get ABC list
router.get('/abc', auth, async (req, res) => {
  try {
    const abc = await User.find({ 
      role: 'abc', 
      isActive: true 
    }).select('name email');
    res.json(abc);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Super Admins list
router.get('/superadmins', auth, async (req, res) => {
  try {
    const superadmins = await User.find({ 
      role: 'superadmin', 
      isActive: true 
    }).select('name email');
    res.json(superadmins);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get HOD by department
router.get('/hod/:department', auth, async (req, res) => {
  try {
    const hod = await User.findOne({ 
      role: 'hod', 
      department: req.params.department,
      isActive: true 
    }).select('name email department');
    
    if (!hod) {
      return res.status(404).json({ message: 'HOD not found for this department' });
    }
    
    res.json(hod);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user's club
router.get('/my-club', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('clubId');
    if (!user || !user.clubId) return res.json({ club: null });
    res.json({ club: user.clubId });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save faculty Gmail App Password
router.post('/save-gmail-password', auth, async (req, res) => {
  try {
    const { gmailAppPassword } = req.body;
    if (!gmailAppPassword || gmailAppPassword.trim().length < 16) {
      return res.status(400).json({ message: 'Invalid App Password. Must be 16 characters.' });
    }
    // Test the credentials before saving
    const nodemailer = require('nodemailer');
    const testTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: req.user.email, pass: gmailAppPassword.replace(/\s/g, '') },
      tls: { rejectUnauthorized: false }
    });
    await testTransporter.verify();

    // Save password (plain — faculty owns this account)
    await User.findByIdAndUpdate(req.userId, {
      gmailAppPassword: gmailAppPassword.replace(/\s/g, '')
    });
    res.json({ message: 'Gmail App Password saved successfully! Emails will now be sent from your account.' });
  } catch (error) {
    console.error('[save-gmail-password] Error:', error.message);
    res.status(400).json({ message: 'Invalid credentials. Please check your Gmail App Password and try again.' });
  }
});

// Check if faculty has Gmail password set
router.get('/email-status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('+gmailAppPassword');
    res.json({ hasEmailSetup: !!(user?.gmailAppPassword) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove Gmail App Password
router.delete('/gmail-password', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { $unset: { gmailAppPassword: 1 } });
    res.json({ message: 'Gmail App Password removed.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
