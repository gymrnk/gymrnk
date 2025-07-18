const express = require('express');
const WorkoutTemplate = require('../models/WorkoutTemplate');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Create template
router.post('/', auth, [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('visibility').isIn(['global', 'friends', 'private']),
  body('exercises').isArray().notEmpty(),
  body('exercises.*.exerciseId').isMongoId(),
  body('exercises.*.sets').isArray().notEmpty(),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      description,
      visibility,
      exercises,
      tags,
      difficulty,
      estimatedDuration
    } = req.body;

    // Calculate target muscle groups based on exercises
    const Exercise = require('../models/Exercise');
    const exerciseIds = exercises.map(e => e.exerciseId);
    const exerciseDocs = await Exercise.find({ _id: { $in: exerciseIds } });
    
    const targetMuscleGroups = [...new Set(
      exerciseDocs.map(e => e.muscleGroup)
    )];

    // Create template
    const template = new WorkoutTemplate({
      creator: req.user._id,
      name,
      description,
      visibility,
      exercises: exercises.map((e, index) => ({
        exercise: e.exerciseId || e.exercise, // Handle both formats
        sets: e.sets,
        notes: e.notes,
        orderIndex: e.orderIndex !== undefined ? e.orderIndex : index
      })),
      tags: tags || [],
      targetMuscleGroups,
      difficulty,
      estimatedDuration
    });

    await template.save();
    await template.populate('exercises.exercise creator', 'name muscleGroup username profile.displayName profile.avatar');

    res.status(201).json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get marketplace templates
router.get('/marketplace', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      muscleGroup, 
      difficulty,
      search,
      sort = 'popular' // popular, recent, mostUsed
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = { isActive: true };

    // Build visibility filter
    filter.$or = [
      { visibility: 'global' },
      { 
        visibility: 'friends', 
        creator: { $in: [...req.user.friends, req.user._id] }
      }
    ];

    // Add filters
    if (muscleGroup) {
      filter.targetMuscleGroups = muscleGroup;
    }
    if (difficulty) {
      filter.difficulty = difficulty;
    }
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case 'popular':
        sortQuery = { 'likes.length': -1 };
        break;
      case 'recent':
        sortQuery = { createdAt: -1 };
        break;
      case 'mostUsed':
        sortQuery = { usageCount: -1 };
        break;
    }

    const templates = await WorkoutTemplate.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('creator', 'username profile.displayName profile.avatar rankings.overall')
      .populate('exercises.exercise', 'name muscleGroup category');

    const total = await WorkoutTemplate.countDocuments(filter);

    // Add isLiked field for each template
    const templatesWithLikes = templates.map(template => {
      const templateObj = template.toObject();
      templateObj.isLiked = template.isLikedBy(req.user._id);
      templateObj.likeCount = template.likes.length;
      return templateObj;
    });

    res.json({
      templates: templatesWithLikes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my templates
router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const templates = await WorkoutTemplate.find({ 
      creator: req.user._id,
      isActive: true 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('exercises.exercise', 'name muscleGroup category');

    const total = await WorkoutTemplate.countDocuments({ 
      creator: req.user._id,
      isActive: true 
    });

    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single template
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id)
      .populate('creator', 'username profile.displayName profile.avatar rankings.overall')
      .populate('exercises.exercise');

    if (!template || !template.isActive) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check visibility permissions
    const canView = 
      template.visibility === 'global' ||
      template.creator._id.toString() === req.user._id.toString() ||
      (template.visibility === 'friends' && req.user.friends.includes(template.creator._id));

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const templateObj = template.toObject();
    templateObj.isLiked = template.isLikedBy(req.user._id);
    templateObj.likeCount = template.likes.length;
    templateObj.totalVolume = template.calculateTotalVolume();

    res.json(templateObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update template
router.put('/:id', auth, async (req, res) => {
    try {
      const template = await WorkoutTemplate.findOne({
        _id: req.params.id,
        creator: req.user._id
      });
  
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
  
      const allowedUpdates = ['name', 'description', 'visibility', 'exercises', 'tags', 'difficulty', 'estimatedDuration'];
      const updates = Object.keys(req.body).filter(key => allowedUpdates.includes(key));
  
      updates.forEach(update => {
        if (update === 'exercises') {
          // Map exerciseId to exercise field
          template[update] = req.body[update].map(ex => ({
            exercise: ex.exerciseId || ex.exercise, // Handle both formats
            sets: ex.sets,
            notes: ex.notes,
            orderIndex: ex.orderIndex
          }));
        } else {
          template[update] = req.body[update];
        }
      });
  
      // Recalculate target muscle groups if exercises changed
      if (req.body.exercises) {
        const Exercise = require('../models/Exercise');
        const exerciseIds = req.body.exercises.map(e => e.exerciseId || e.exercise);
        const exerciseDocs = await Exercise.find({ _id: { $in: exerciseIds } });
        
        template.targetMuscleGroups = [...new Set(
          exerciseDocs.map(e => e.muscleGroup)
        )];
      }
  
      await template.save();
      await template.populate('exercises.exercise creator', 'name muscleGroup username profile.displayName profile.avatar');
  
      res.json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  });

// Delete template (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await WorkoutTemplate.findOne({
      _id: req.params.id,
      creator: req.user._id
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    template.isActive = false;
    await template.save();

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/unlike template
router.post('/:id/like', auth, async (req, res) => {
  try {
    const template = await WorkoutTemplate.findById(req.params.id);

    if (!template || !template.isActive) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const likeIndex = template.likes.findIndex(
      like => like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      template.likes.splice(likeIndex, 1);
    } else {
      // Like
      template.likes.push({ user: req.user._id });
    }

    await template.save();

    res.json({ 
      liked: likeIndex === -1,
      likeCount: template.likes.length 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Use template (increment usage count)
router.post('/:id/use', auth, async (req, res) => {
  try {
    const template = await WorkoutTemplate.findByIdAndUpdate(
      req.params.id,
      { $inc: { usageCount: 1 } },
      { new: true }
    ).populate('exercises.exercise');

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;