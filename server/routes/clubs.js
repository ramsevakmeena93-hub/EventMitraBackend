const express = require('express');
const router = express.Router();
const Club = require('../models/Club');
const Event = require('../models/Event');
const { auth, authorize } = require('../middleware/auth');

// Get all clubs
router.get('/', auth, async (req, res) => {
  try {
    const clubs = await Club.find({ isActive: true })
      .sort({ name: 1 });
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single club
router.get('/:id', auth, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }
    res.json(club);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create club (ABC only)
router.post('/create', auth, authorize('abc'), async (req, res) => {
  try {
    const { name, coordinators, description } = req.body;

    // Check if club already exists
    const existingClub = await Club.findOne({ name });
    if (existingClub) {
      return res.status(400).json({ message: 'Club with this name already exists' });
    }

    const club = new Club({
      name,
      coordinators,
      description,
      createdBy: req.userId
    });

    await club.save();

    // Auto-link faculty users whose email matches coordinator emails
    const User = require('../models/User');
    const coordinatorEmails = coordinators.map(c => c.email.toLowerCase());
    const linkedFaculty = await User.updateMany(
      { email: { $in: coordinatorEmails }, role: 'faculty' },
      { $set: { clubId: club._id } }
    );

    console.log(`[create-club] Linked ${linkedFaculty.modifiedCount} faculty to club "${name}"`);

    res.status(201).json({ 
      message: `Club created successfully. ${linkedFaculty.modifiedCount} faculty linked.`, 
      club 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update club (ABC only)
router.put('/:id', auth, authorize('abc'), async (req, res) => {
  try {
    const { name, coordinators, description, isActive } = req.body;
    
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Check if new name conflicts with another club
    if (name && name !== club.name) {
      const existingClub = await Club.findOne({ name, _id: { $ne: req.params.id } });
      if (existingClub) {
        return res.status(400).json({ message: 'Club with this name already exists' });
      }
    }

    if (name) club.name = name;
    if (coordinators) {
      club.coordinators = coordinators;
      // Re-link faculty by email when coordinators are updated
      const User = require('../models/User');
      // Remove old links for this club
      await User.updateMany({ clubId: club._id }, { $unset: { clubId: '' } });
      // Add new links
      const coordinatorEmails = coordinators.map(c => c.email.toLowerCase());
      const linked = await User.updateMany(
        { email: { $in: coordinatorEmails }, role: 'faculty' },
        { $set: { clubId: club._id } }
      );
      console.log(`[update-club] Re-linked ${linked.modifiedCount} faculty to club "${club.name}"`);
    }
    if (description !== undefined) club.description = description;
    if (isActive !== undefined) club.isActive = isActive;

    await club.save();
    res.json({ message: 'Club updated successfully', club });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete club (ABC only) - Soft delete
router.delete('/:id', auth, authorize('abc'), async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    club.isActive = false;
    await club.save();

    res.json({ message: 'Club deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get club statistics (ABC only)
router.get('/:id/stats', auth, authorize('abc'), async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    const events = await Event.find({ clubId: req.params.id });
    
    const stats = {
      totalEvents: events.length,
      approvedEvents: events.filter(e => e.status === 'approved').length,
      pendingEvents: events.filter(e => e.status.includes('pending')).length,
      rejectedEvents: events.filter(e => e.status === 'rejected').length
    };

    res.json({ club, stats, events });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
