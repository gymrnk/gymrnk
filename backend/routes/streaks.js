// routes/streaks.js
const express = require('express');
const auth = require('../middleware/auth');
const StreakService = require('../services/streakService');

const router = express.Router();

// Get current user's streak data
router.get('/my', auth, async (req, res) => {
  try {
    const user = req.user; // Already populated from auth middleware
    
    // Check current streak status
    const status = await StreakService.checkStreakStatus(req.user._id);
    
    res.json({
      current: user.streak.current,
      longest: user.streak.longest,
      status,
      milestone: StreakService.getMilestone(user.streak.current.count)
    });
  } catch (error) {
    console.error('Error fetching streak data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get streak calendar for a specific month
router.get('/calendar', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }
    
    const calendar = await StreakService.getStreakCalendar(
      req.user._id,
      parseInt(month),
      parseInt(year)
    );
    
    res.json({ calendar });
  } catch (error) {
    console.error('Error fetching streak calendar:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;