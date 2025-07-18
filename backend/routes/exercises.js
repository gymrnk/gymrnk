const express = require('express');
const Exercise = require('../models/Exercise');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all exercises
router.get('/', auth, async (req, res) => {
  try {
    const { muscleGroup, category } = req.query;
    const filter = {};
    
    if (muscleGroup) filter.muscleGroup = muscleGroup;
    if (category) filter.category = category;
    
    const exercises = await Exercise.find(filter).sort('name');
    res.json(exercises);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Search exercises
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const exercises = await Exercise.find({
      name: { $regex: q, $options: 'i' }
    }).limit(20);
    
    res.json(exercises);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;