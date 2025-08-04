const express = require('express');
const WorkoutPlan = require('../models/WorkoutPlan');
const UserPlanProgress = require('../models/UserPlanProgress');
const PlanRating = require('../models/PlanRating');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Create workout plan
router.post('/', auth, [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 1000 }),
  body('duration').isIn([7, 14, 30, 90, 180]),
  body('category').isIn(['bodyweight', 'weighted', 'hybrid']),
  body('visibility').isIn(['global', 'friends', 'private']),
  body('days').isArray().notEmpty(),
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
      duration,
      category,
      visibility,
      days,
      difficulty,
      tags,
      equipment,
      goals
    } = req.body;

    // Validate days array length matches duration
    const workoutDays = days.filter(d => d.dayType === 'workout').length;
    if (days.length !== duration) {
      return res.status(400).json({ 
        error: `Plan duration (${duration} days) must match number of days provided (${days.length})` 
      });
    }

    // Create plan
    const plan = new WorkoutPlan({
      creator: req.user._id,
      name,
      description,
      duration,
      category,
      visibility,
      days: days.map((day, index) => ({
        ...day,
        dayNumber: index + 1
      })),
      difficulty,
      tags: tags || [],
      equipment: equipment || [],
      goals: goals || []
    });

    await plan.save();
    await plan.populate('creator days.template days.customWorkout.exercises.exercise');

    res.status(201).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get marketplace plans
router.get('/marketplace', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20,
      category,
      duration,
      difficulty,
      search,
      sort = 'popular' // popular, recent, topRated, featured
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
    if (category) filter.category = category;
    if (duration) filter.duration = parseInt(duration);
    if (difficulty) filter.difficulty = difficulty;
    if (search) filter.$text = { $search: search };

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case 'popular':
        sortQuery = { usageCount: -1 };
        break;
      case 'recent':
        sortQuery = { createdAt: -1 };
        break;
      case 'topRated':
        sortQuery = { averageRating: -1, totalRatings: -1 };
        break;
      case 'featured':
        filter.isFeatured = true;
        sortQuery = { averageRating: -1 };
        break;
    }

    const plans = await WorkoutPlan.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('creator', 'username profile.displayName profile.avatar')
      .populate('days.template', 'name')
      .select('-days.customWorkout'); // Don't send full workout details in list

    const total = await WorkoutPlan.countDocuments(filter);

    // Add isLiked field
    const plansWithLikes = plans.map(plan => {
      const planObj = plan.toObject();
      planObj.isLiked = plan.isLikedBy(req.user._id);
      planObj.likeCount = plan.likes.length;
      return planObj;
    });

    res.json({
      plans: plansWithLikes,
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

// Get my plans
router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const plans = await WorkoutPlan.find({ 
      creator: req.user._id,
      isActive: true 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('days.template', 'name');

    const total = await WorkoutPlan.countDocuments({ 
      creator: req.user._id,
      isActive: true 
    });

    res.json({
      plans,
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

// Get my active plan progress
router.get('/my-active', auth, async (req, res) => {
  try {
    const activeProgress = await UserPlanProgress.findOne({
      user: req.user._id,
      status: 'active'
    }).populate({
      path: 'plan',
      populate: {
        path: 'creator days.template',
        select: 'username profile.displayName name'
      }
    });

    if (!activeProgress) {
      return res.json({ activeProgress: null });
    }

    // Check for missed days
    const missedInfo = activeProgress.checkMissedDays();

    res.json({
      activeProgress,
      missedInfo,
      nextWorkout: activeProgress.plan.days.find(d => d.dayNumber === activeProgress.currentDay)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start a plan
router.post('/:id/start', auth, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findById(req.params.id);
    
    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check if user already has an active plan
    const existingActive = await UserPlanProgress.findOne({
      user: req.user._id,
      status: 'active'
    });

    if (existingActive) {
      return res.status(400).json({ 
        error: 'You already have an active plan. Please complete or abandon it first.' 
      });
    }

    // Create progress tracking
    const startDate = new Date();
    const scheduledEndDate = new Date();
    scheduledEndDate.setDate(scheduledEndDate.getDate() + plan.duration);

    const progress = new UserPlanProgress({
      user: req.user._id,
      plan: plan._id,
      startDate,
      scheduledEndDate
    });

    await progress.save();

    // Increment plan usage count
    plan.usageCount++;
    await plan.save();

    res.status(201).json({
      message: 'Plan started successfully',
      progress
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete a workout day
router.post('/progress/:progressId/complete-day', auth, async (req, res) => {
  try {
    const { workoutId, dayNumber } = req.body;

    const progress = await UserPlanProgress.findOne({
      _id: req.params.progressId,
      user: req.user._id
    }).populate('plan');

    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    if (progress.status !== 'active') {
      return res.status(400).json({ error: 'Plan is not active' });
    }

    // Verify the day exists and is a workout day
    const planDay = progress.plan.days.find(d => d.dayNumber === dayNumber);
    if (!planDay) {
      return res.status(400).json({ error: 'Invalid day number' });
    }

    if (planDay.dayType === 'rest') {
      return res.status(400).json({ error: 'Cannot complete workout on rest day' });
    }

    // Complete the day
    await progress.completeDay(workoutId, dayNumber);

    res.json({
      message: 'Day completed successfully',
      progress,
      isCompleted: progress.status === 'completed'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Abandon plan
router.post('/progress/:progressId/abandon', auth, async (req, res) => {
  try {
    const progress = await UserPlanProgress.findOne({
      _id: req.params.progressId,
      user: req.user._id
    });

    if (!progress) {
      return res.status(404).json({ error: 'Progress not found' });
    }

    await progress.abandon();

    res.json({
      message: 'Plan abandoned',
      progress
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Rate a plan
router.post('/:id/rate', auth, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('review').optional().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, review, wouldRecommend, pros, cons } = req.body;

    // Check if user has completed or used this plan
    const progress = await UserPlanProgress.findOne({
      user: req.user._id,
      plan: req.params.id,
      status: { $in: ['completed', 'abandoned'] }
    });

    if (!progress) {
      return res.status(400).json({ 
        error: 'You must start and use a plan before rating it' 
      });
    }

    // Check for existing rating
    const existingRating = await PlanRating.findOne({
      user: req.user._id,
      plan: req.params.id
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.review = review;
      existingRating.wouldRecommend = wouldRecommend;
      existingRating.pros = pros || [];
      existingRating.cons = cons || [];
      existingRating.completionRate = progress.completionRate;
      
      await existingRating.save();
      res.json(existingRating);
    } else {
      // Create new rating
      const planRating = new PlanRating({
        user: req.user._id,
        plan: req.params.id,
        progress: progress._id,
        rating,
        review,
        completionRate: progress.completionRate,
        wouldRecommend,
        pros: pros || [],
        cons: cons || []
      });

      await planRating.save();
      res.status(201).json(planRating);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get plan analytics (for creators)
router.get('/:id/analytics', auth, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findOne({
      _id: req.params.id,
      creator: req.user._id
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found or unauthorized' });
    }

    // Get all progress records
    const allProgress = await UserPlanProgress.find({ 
      plan: plan._id 
    }).populate('user', 'username profile.displayName');

    // Get ratings
    const ratings = await PlanRating.find({ 
      plan: plan._id 
    }).populate('user', 'username profile.displayName');

    // Calculate detailed analytics
    const analytics = {
      overview: {
        totalStarts: allProgress.length,
        totalCompletions: allProgress.filter(p => p.status === 'completed').length,
        totalAbandoned: allProgress.filter(p => p.status === 'abandoned').length,
        averageCompletionRate: plan.analytics.averageCompletionRate,
        averageRating: plan.averageRating,
        totalRatings: plan.totalRatings
      },
      dropOffAnalysis: {
        byDay: {},
        byDayOfWeek: plan.analytics.dropOffByDayOfWeek,
        commonDropOffDay: plan.analytics.commonDropOffDay
      },
      userProgress: allProgress.map(p => ({
        user: p.user,
        status: p.status,
        startDate: p.startDate,
        currentDay: p.currentDay,
        completionRate: p.completionRate,
        lastWorkoutDate: p.lastWorkoutDate
      })),
      ratings: ratings.map(r => ({
        user: r.user,
        rating: r.rating,
        review: r.review,
        completionRate: r.completionRate,
        wouldRecommend: r.wouldRecommend,
        createdAt: r.createdAt
      })),
      dayByDayCompletion: {}
    };

    // Calculate day-by-day completion rates
    for (let day = 1; day <= plan.duration; day++) {
      const completedThisDay = allProgress.filter(p => 
        p.completedWorkouts.some(w => w.dayNumber === day)
      ).length;
      
      analytics.dayByDayCompletion[day] = {
        completed: completedThisDay,
        completionRate: allProgress.length > 0 ? 
          (completedThisDay / allProgress.length * 100).toFixed(1) : 0
      };
    }

    // Calculate drop-off by specific day
    allProgress.filter(p => p.status === 'abandoned').forEach(p => {
      const day = p.currentDay - 1; // Last completed day
      analytics.dropOffAnalysis.byDay[day] = 
        (analytics.dropOffAnalysis.byDay[day] || 0) + 1;
    });

    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/unlike plan
router.post('/:id/like', auth, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findById(req.params.id);

    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const likeIndex = plan.likes.findIndex(
      like => like.user.toString() === req.user._id.toString()
    );

    if (likeIndex > -1) {
      // Unlike
      plan.likes.splice(likeIndex, 1);
    } else {
      // Like
      plan.likes.push({ user: req.user._id });
    }

    await plan.save();

    res.json({ 
      liked: likeIndex === -1,
      likeCount: plan.likes.length 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;