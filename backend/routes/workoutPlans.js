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
      populate: [
        {
          path: 'creator',
          select: 'username profile.displayName'
        },
        {
          path: 'days.template',
          populate: {
            path: 'exercises.exercise',
            model: 'Exercise'
          }
        }
      ]
    })
    .populate('completedWorkouts.workoutId'); // Make sure to populate the completed workouts

    if (!activeProgress) {
      return res.json({ activeProgress: null });
    }

    // Check for missed days
    const missedInfo = activeProgress.checkMissedDays();

    // Debug log to see what we're sending
    console.log('Active Progress Debug:', {
      progressId: activeProgress._id,
      currentDay: activeProgress.currentDay,
      completedDays: activeProgress.completedDays,
      completedWorkoutsCount: activeProgress.completedWorkouts?.length || 0,
      completedWorkouts: activeProgress.completedWorkouts
    });

    res.json({
      activeProgress,
      missedInfo,
      nextWorkout: activeProgress.plan.days.find(d => d.dayNumber === activeProgress.currentDay)
    });
  } catch (error) {
    console.error('Error in /my-active:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get plan by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findById(req.params.id)
      .populate('creator', 'username profile.displayName profile.avatar')
      .populate({
        path: 'days.template',
        populate: {
          path: 'exercises.exercise',
          model: 'Exercise'
        }
      })
      .populate('days.customWorkout.exercises.exercise');

    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check visibility
    const isOwner = plan.creator._id.toString() === req.user._id.toString();
    const isFriend = req.user.friends && req.user.friends.includes(plan.creator._id);
    
    if (plan.visibility === 'private' && !isOwner) {
      return res.status(403).json({ error: 'This plan is private' });
    }
    
    if (plan.visibility === 'friends' && !isOwner && !isFriend) {
      return res.status(403).json({ error: 'This plan is only visible to friends' });
    }

    // Add isLiked field
    const planObj = plan.toObject();
    planObj.isLiked = plan.isLikedBy(req.user._id);
    planObj.likeCount = plan.likes.length;

    res.json(planObj);
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 1000 }),
  body('visibility').optional().isIn(['global', 'friends', 'private']),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const plan = await WorkoutPlan.findOne({
      _id: req.params.id,
      creator: req.user._id
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found or unauthorized' });
    }

    // Check if plan has active users
    const activeUsers = await UserPlanProgress.countDocuments({
      plan: plan._id,
      status: 'active'
    });

    if (activeUsers > 0) {
      return res.status(400).json({ 
        error: 'Cannot edit plan while users are actively using it',
        activeUsers 
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'visibility', 'difficulty', 'tags', 'equipment', 'goals'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    Object.assign(plan, updates);
    await plan.save();

    await plan.populate('creator days.template days.customWorkout.exercises.exercise');

    res.json(plan);
  } catch (error) {
    console.error('Update plan error:', error);
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

    // Update analytics if they're stale or don't exist
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!plan.analytics.lastUpdated || plan.analytics.lastUpdated < oneHourAgo) {
      await plan.updateAnalytics();
      // Reload the plan to get updated analytics
      await plan.reload();
    }

    // Get all progress records for detailed data
    const allProgress = await UserPlanProgress.find({ 
      plan: plan._id 
    }).populate('user', 'username profile.displayName profile.avatar');

    // Get ratings
    const ratings = await PlanRating.find({ 
      plan: plan._id 
    }).populate('user', 'username profile.displayName profile.avatar');

    // Calculate day-by-day completion rates
    const dayByDayCompletion = {};
    const totalStarts = plan.analytics.totalStarts || allProgress.length;
    
    for (let day = 1; day <= plan.duration; day++) {
      const completedThisDay = allProgress.filter(p => 
        p.completedWorkouts && p.completedWorkouts.some(w => w.dayNumber === day)
      ).length;
      
      dayByDayCompletion[day] = {
        completed: completedThisDay,
        completionRate: totalStarts > 0 
          ? ((completedThisDay / totalStarts) * 100).toFixed(1) 
          : '0'
      };
    }

    // Calculate drop-off by specific day (for the byDay object)
    const dropOffByDay = {};
    allProgress.filter(p => p.status === 'abandoned').forEach(p => {
      const day = p.currentDay > 0 ? p.currentDay - 1 : 0;
      dropOffByDay[day] = (dropOffByDay[day] || 0) + 1;
    });

    // Build analytics response
    const analytics = {
      overview: {
        totalStarts: plan.analytics.totalStarts || 0,
        totalCompletions: plan.completionCount || 0,
        totalAbandoned: allProgress.filter(p => p.status === 'abandoned').length,
        averageCompletionRate: plan.analytics.averageCompletionRate || 0,
        averageRating: plan.averageRating || 0,
        totalRatings: plan.totalRatings || 0,
        commonDropOffDay: plan.analytics.commonDropOffDay || 0
      },
      dropOffAnalysis: {
        byDay: dropOffByDay,
        dropOffByDayOfWeek: plan.analytics.dropOffByDayOfWeek || {
          monday: 0,
          tuesday: 0,
          wednesday: 0,
          thursday: 0,
          friday: 0,
          saturday: 0,
          sunday: 0
        }
      },
      userProgress: allProgress.map(p => ({
        user: {
          _id: p.user._id,
          username: p.user.username,
          profile: p.user.profile
        },
        status: p.status,
        startDate: p.startDate,
        currentDay: p.currentDay,
        completionRate: p.completionRate || 0,
        lastWorkoutDate: p.lastWorkoutDate
      })),
      ratings: ratings.map(r => ({
        user: {
          _id: r.user._id,
          username: r.user.username,
          profile: r.user.profile
        },
        rating: r.rating,
        review: r.review,
        completionRate: r.completionRate || 0,
        wouldRecommend: r.wouldRecommend,
        createdAt: r.createdAt
      })),
      dayByDayCompletion
    };

    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findOne({
      _id: req.params.id,
      creator: req.user._id
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found or unauthorized' });
    }

    // Check if plan has any users (active or completed)
    const userProgress = await UserPlanProgress.countDocuments({
      plan: plan._id
    });

    if (userProgress > 0) {
      // Soft delete - mark as inactive instead of deleting
      plan.isActive = false;
      await plan.save();
      
      res.json({ 
        message: 'Plan archived (not deleted) because it has been used by users',
        archived: true 
      });
    } else {
      // Hard delete - completely remove the plan
      await WorkoutPlan.deleteOne({ _id: plan._id });
      
      // Also delete any ratings for this plan
      await PlanRating.deleteMany({ plan: plan._id });
      
      res.json({ 
        message: 'Plan deleted successfully',
        deleted: true 
      });
    }
  } catch (error) {
    console.error('Delete plan error:', error);
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