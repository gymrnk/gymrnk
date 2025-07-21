// routes/workouts.js
const express = require('express');
const Workout = require('../models/Workout');
const Exercise = require('../models/Exercise');
const User = require('../models/User');
const RankingSystem = require('../services/rankingSystem');
const WorkoutValidationService = require('../services/workoutValidationService');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const WeeklySnapshotService = require('../services/weeklySnapshotService');
const StreakService = require('../services/streakService');
const rankingQueue = require('../services/rankingQueue');

const router = express.Router();

// Create workout - FIXED VERSION
router.post('/', auth, [
  body('date').optional().isISO8601(),
  body('exercises').isArray().notEmpty(),
  body('exercises.*.exerciseId').isMongoId(),
  body('exercises.*.sets').isArray().notEmpty(),
  body('exercises.*.sets.*.reps').isInt({ min: 1 }),
  body('exercises.*.sets.*.weight').isNumeric({ min: 0 }),
  body('duration').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { date, exercises, duration, notes } = req.body;
    
    // NEW: Validate workout before processing
    const validation = await WorkoutValidationService.validateWorkout(
      req.user._id,
      { date: date || new Date(), exercises, duration }
    );
    
    // If validation fails, return errors
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Workout validation failed',
        validationErrors: validation.errors,
        warnings: validation.warnings
      });
    }
    
    // Verify all exercises exist
    const exerciseIds = exercises.map(e => e.exerciseId);
    const existingExercises = await Exercise.find({ _id: { $in: exerciseIds } });
    
    if (existingExercises.length !== exerciseIds.length) {
      return res.status(400).json({ error: 'One or more exercises not found' });
    }
    
    // Create workout with validation-modified data
    const workout = new Workout({
      user: req.user._id,
      date: date || new Date(),
      exercises: exercises.map(e => ({
        exercise: e.exerciseId,
        exerciseId: e.exerciseId, // Ensure both fields are set
        sets: e.sets.map(set => ({
          reps: Math.min(100, Math.max(1, parseInt(set.reps) || 1)), // Cap at 100
          weight: Math.max(0, parseFloat(set.weight) || 0),
          restTime: set.restTime ? parseInt(set.restTime) : undefined,
          tempo: set.tempo || undefined,
          rpe: set.rpe ? Math.min(10, Math.max(1, parseInt(set.rpe))) : undefined
        })).filter(set => set.reps > 0),
        notes: e.notes
      })).filter(ex => ex.sets.length > 0),
      duration: Math.max(1, parseInt(duration) || 1),
      notes
    });
    
    if (workout.exercises.length === 0) {
      return res.status(400).json({ error: 'Workout must contain at least one valid exercise with valid sets' });
    }
    
    // IMPORTANT: Save the workout first to get an ID
    await workout.save();
    
    // CRITICAL: Populate exercises BEFORE calculating scores
    await workout.populate('exercises.exercise exercises.exerciseId');
    
    // NOW calculate hypertrophy score with populated exercises
    console.log('Calculating scores for workout with exercises:', 
      workout.exercises.map(ex => ({
        name: ex.exercise?.name || 'Unknown',
        muscleGroup: ex.exercise?.muscleGroup || 'Unknown'
      }))
    );
    
    const scores = await RankingSystem.calculateWorkoutScore(workout);
    
    console.log('Calculated scores:', scores);
    
    // Set the scores
    workout.hypertrophyScore = scores;
    
    // Mark as modified to ensure Mongoose saves the nested object
    workout.markModified('hypertrophyScore');
    
    // Save again with the scores
    await workout.save();
    
    // UPDATE USER'S LAST WORKOUT DATE
    await User.findByIdAndUpdate(req.user._id, {
      lastWorkoutDate: workout.date
    });
    
    // Update user's streak
    const userTimezone = req.headers['x-timezone'] || 'UTC';
    try {
      await StreakService.updateStreak(req.user._id, workout.date, userTimezone);
      console.log('Streak updated successfully for user:', req.user._id);
    } catch (streakError) {
      console.error('Failed to update streak:', streakError);
    }
    
    // Determine which muscle groups were affected
    const muscleGroupsAffected = new Set(['overall']);
    workout.exercises.forEach(ex => {
      if (ex.exercise && ex.exercise.muscleGroup) {
        muscleGroupsAffected.add(ex.exercise.muscleGroup.toLowerCase());
      }
    });
    
    // Add ranking updates to the queue
    rankingQueue.addUpdate(
      req.user._id,
      Array.from(muscleGroupsAffected),
      ['weekly', 'monthly', 'allTime']
    );
    
    // Update weekly snapshot
    await WeeklySnapshotService.updateSnapshotForWorkout(workout);
    
    // NEW: Get consistency multiplier for response
    const consistencyMultiplier = await WorkoutValidationService.getConsistencyMultiplier(req.user._id);
    
    // NEW: Include validation warnings and consistency info in response
    res.status(201).json({
      workout,
      validation: {
        warnings: validation.warnings,
        modifications: validation.modifications
      },
      scoring: {
        totalPoints: workout.hypertrophyScore.total,
        consistencyMultiplier,
        byMuscleGroup: workout.hypertrophyScore.byMuscleGroup
      }
    });
  } catch (error) {
    console.error('Workout creation error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get user's workouts
router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = { user: req.user._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    const workouts = await Workout.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('exercises.exercise', 'name muscleGroup')
    
    const total = await Workout.countDocuments(filter);
    
    res.json({
      workouts,
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

// Get workout stats
router.get('/stats', auth, async (req, res) => {
  try {
    const { period = 'weekly', startDate } = req.query;
    
    // Get date range
    const now = new Date();
    let dateFilter;
    
    if (startDate) {
      dateFilter = new Date(startDate);
    } else {
      switch (period) {
        case 'weekly':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'yearly':
          dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'allTime':
        default:
          dateFilter = new Date(0);
      }
    }
    
    const workouts = await Workout.find({
      user: req.user._id,
      date: { $gte: dateFilter }
    }).populate('exercises.exercise', 'name muscleGroup')
    
    // Calculate stats
    const stats = {
      totalWorkouts: workouts.length,
      totalDuration: workouts.reduce((sum, w) => sum + (w.duration || 0), 0),
      totalVolume: 0,
      exerciseFrequency: {},
      muscleGroupVolume: {
        chest: 0,
        back: 0,
        shoulders: 0,
        biceps: 0,
        triceps: 0,
        legs: 0,
        abs: 0
      },
      hypertrophyScores: {
        total: 0,
        byMuscleGroup: {
          chest: 0,
          back: 0,
          shoulders: 0,
          biceps: 0,
          triceps: 0,
          legs: 0,
          abs: 0
        }
      }
    };
    
    workouts.forEach(workout => {
      // Aggregate hypertrophy scores
      if (workout.hypertrophyScore) {
        stats.hypertrophyScores.total += workout.hypertrophyScore.total || 0;
        
        if (workout.hypertrophyScore.byMuscleGroup) {
          Object.keys(workout.hypertrophyScore.byMuscleGroup).forEach(muscle => {
            if (stats.hypertrophyScores.byMuscleGroup.hasOwnProperty(muscle)) {
              stats.hypertrophyScores.byMuscleGroup[muscle] += 
                workout.hypertrophyScore.byMuscleGroup[muscle] || 0;
            }
          });
        }
      }
      
      // Calculate volume and frequency
      workout.exercises.forEach(({ exercise, sets }) => {
        if (!exercise) {
          console.warn(`Workout ${workout._id} has reference to deleted exercise`);
          return;
        }
        
        const volume = sets.reduce((sum, set) => sum + (set.reps * set.weight), 0);
        stats.totalVolume += volume;
        
        // Exercise frequency
        if (exercise.name) {
          stats.exerciseFrequency[exercise.name] = 
            (stats.exerciseFrequency[exercise.name] || 0) + 1;
        }
        
        // Muscle group volume
        if (exercise.muscleGroup && stats.muscleGroupVolume.hasOwnProperty(exercise.muscleGroup)) {
          stats.muscleGroupVolume[exercise.muscleGroup] += volume;
        }
      });
    });
    
    // Average per workout
    if (workouts.length > 0) {
      stats.averageDuration = stats.totalDuration / workouts.length;
      stats.averageVolume = stats.totalVolume / workouts.length;
    }
    
    // Get consistency multiplier
    const moment = require('moment');
    const sevenDaysAgo = moment().subtract(7, 'days').startOf('day').toDate();
    const workoutsThisWeek = await Workout.countDocuments({
      user: req.user._id,
      date: { $gte: sevenDaysAgo }
    });
    
    let currentMultiplier;
    if (workoutsThisWeek === 0) currentMultiplier = 0.5;
    else if (workoutsThisWeek === 1) currentMultiplier = 0.8;
    else if (workoutsThisWeek <= 3) currentMultiplier = 1.0;
    else if (workoutsThisWeek <= 5) currentMultiplier = 1.3;
    else currentMultiplier = 1.5;
    
    stats.currentMultiplier = currentMultiplier;
    
    // Round all hypertrophy scores
    stats.hypertrophyScores.total = Math.round(stats.hypertrophyScores.total);
    Object.keys(stats.hypertrophyScores.byMuscleGroup).forEach(muscle => {
      stats.hypertrophyScores.byMuscleGroup[muscle] = 
        Math.round(stats.hypertrophyScores.byMuscleGroup[muscle]);
    });
    
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get weekly progress using snapshots
router.get('/weekly-progress', auth, async (req, res) => {
  try {
    const { weeks = 12 } = req.query;
    const weeklyData = await WeeklySnapshotService.getWeeklyProgress(
      req.user._id, 
      parseInt(weeks)
    );
    
    res.json({ weeks: weeklyData });
  } catch (error) {
    console.error('Error fetching weekly progress:', error);
    res.status(500).json({ error: 'Failed to fetch weekly progress' });
  }
});

// NEW: Get scoring breakdown for a specific exercise
router.post('/scoring-preview', auth, async (req, res) => {
  try {
    const { exerciseId, sets } = req.body;
    
    if (!exerciseId || !sets || !Array.isArray(sets)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    
    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    const consistencyMultiplier = await WorkoutValidationService.getConsistencyMultiplier(req.user._id);
    
    // Calculate score breakdown for each set
    const setBreakdowns = sets.map(set => {
      const baseScore = Math.sqrt(set.reps * set.weight) * 10;
      
      let repMultiplier = 1.0;
      if (set.reps >= 8 && set.reps <= 12) {
        repMultiplier = 1.2;
      } else if (set.reps >= 6 && set.reps <= 15) {
        repMultiplier = 1.1;
      } else if (set.reps < 6) {
        repMultiplier = 0.9;
      } else if (set.reps > 20) {
        repMultiplier = 0.8;
      }
      
      let rpeMultiplier = 1.0;
      if (set.rpe >= 7) rpeMultiplier = 1.05;
      if (set.rpe >= 8) rpeMultiplier = 1.1;
      
      const setScore = baseScore * repMultiplier * rpeMultiplier * consistencyMultiplier;
      
      return {
        baseScore: Math.round(baseScore),
        repMultiplier,
        rpeMultiplier,
        consistencyMultiplier,
        totalScore: Math.round(setScore),
        breakdown: {
          reps: set.reps,
          weight: set.weight,
          rpe: set.rpe
        }
      };
    });
    
    const totalScore = setBreakdowns.reduce((sum, set) => sum + set.totalScore, 0);
    
    res.json({
      exercise: {
        name: exercise.name,
        muscleGroup: exercise.muscleGroup
      },
      consistencyMultiplier,
      setBreakdowns,
      totalScore,
      tips: [
        consistencyMultiplier < 1.3 ? 'Train more frequently this week to increase your multiplier!' : null,
        sets.some(s => s.reps < 8 || s.reps > 12) ? 'Try 8-12 reps for optimal hypertrophy bonus' : null,
        sets.some(s => !s.rpe || s.rpe < 8) ? 'Push harder (RPE 8+) for effort bonus' : null
      ].filter(Boolean)
    });
  } catch (error) {
    console.error('Error calculating scoring preview:', error);
    res.status(500).json({ error: 'Failed to calculate scoring preview' });
  }
});

// Debug route to check scores
router.get('/debug-scores', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({
      user: req.user._id,
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
    .populate('exercises.exercise exercises.exerciseId')
    .select('date hypertrophyScore exercises');
    
    const debug = workouts.map(w => ({
      id: w._id,
      date: w.date,
      hasScore: !!w.hypertrophyScore,
      total: w.hypertrophyScore?.total || 0,
      byMuscleGroup: w.hypertrophyScore?.byMuscleGroup || {},
      exercises: w.exercises.map(ex => ({
        name: ex.exercise?.name || 'Unknown',
        muscleGroup: ex.exercise?.muscleGroup || 'Unknown'
      }))
    }));
    
    const totals = debug.reduce((acc, w) => {
      acc.total += w.total;
      Object.entries(w.byMuscleGroup).forEach(([muscle, score]) => {
        acc.byMuscleGroup[muscle] = (acc.byMuscleGroup[muscle] || 0) + score;
      });
      return acc;
    }, { total: 0, byMuscleGroup: {} });
    
    res.json({
      workoutCount: workouts.length,
      totals: {
        total: Math.round(totals.total),
        byMuscleGroup: Object.fromEntries(
          Object.entries(totals.byMuscleGroup).map(([k, v]) => [k, Math.round(v)])
        )
      },
      workouts: debug
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Recalculate all scores for the user
router.post('/recalculate-my-scores', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({
      user: req.user._id
    });
    
    let updated = 0;
    let errors = [];
    
    for (const workout of workouts) {
      try {
        // Populate exercises
        await workout.populate('exercises.exercise exercises.exerciseId');
        
        // Calculate scores
        const scores = await RankingSystem.calculateWorkoutScore(workout);
        
        // Update the workout
        workout.hypertrophyScore = scores;
        workout.markModified('hypertrophyScore');
        
        await workout.save();
        updated++;
      } catch (err) {
        errors.push({ workoutId: workout._id, error: err.message });
      }
    }
    
    res.json({ 
      message: `Updated ${updated} workouts`,
      totalWorkouts: workouts.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single workout
router.get('/:id', auth, async (req, res) => {
  try {
    const workout = await Workout.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('exercises.exercise');
    
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    res.json(workout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a workout - FIXED VERSION
router.put('/:id', auth, async (req, res) => {
  try {
    const { exercises, duration, notes } = req.body;
    
    // First, get the workout with populated exercises to track old muscle groups
    const workout = await Workout.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('exercises.exercise');
    
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    // NEW: Validate updates if exercises are being changed
    if (exercises) {
      const validation = await WorkoutValidationService.validateWorkout(
        req.user._id,
        { date: workout.date, exercises, duration: duration || workout.duration }
      );
      
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Workout validation failed',
          validationErrors: validation.errors,
          warnings: validation.warnings
        });
      }
    }
    
    // Track old muscle groups before update
    const oldMuscleGroups = new Set(['overall']);
    workout.exercises.forEach(ex => {
      if (ex.exercise && ex.exercise.muscleGroup) {
        oldMuscleGroups.add(ex.exercise.muscleGroup.toLowerCase());
      }
    });
    
    // Update fields if provided
    if (exercises) {
      workout.exercises = exercises.map(e => ({
        exercise: e.exerciseId,
        exerciseId: e.exerciseId, // Ensure both fields are set
        sets: e.sets.map(set => ({
          reps: Math.min(100, Math.max(1, parseInt(set.reps) || 1)),
          weight: Math.max(0, parseFloat(set.weight) || 0),
          restTime: set.restTime ? parseInt(set.restTime) : undefined,
          tempo: set.tempo || undefined,
          rpe: set.rpe ? Math.min(10, Math.max(1, parseInt(set.rpe))) : undefined
        })).filter(set => set.reps > 0),
        notes: e.notes
      })).filter(ex => ex.sets.length > 0);
    }
    
    if (duration !== undefined) workout.duration = Math.max(1, parseInt(duration) || 1);
    if (notes !== undefined) workout.notes = notes;
    
    // Save the workout first
    await workout.save();
    
    // Populate exercises before recalculating score
    await workout.populate('exercises.exercise exercises.exerciseId');
    
    // Recalculate hypertrophy score
    const scores = await RankingSystem.calculateWorkoutScore(workout);
    workout.hypertrophyScore = scores;
    workout.markModified('hypertrophyScore');
    
    await workout.save();
    
    // UPDATE USER'S LAST WORKOUT DATE if this is their most recent workout
    const mostRecentWorkout = await Workout.findOne({ 
      user: req.user._id 
    }).sort({ date: -1 }).select('date');
    
    if (mostRecentWorkout && mostRecentWorkout._id.toString() === workout._id.toString()) {
      await User.findByIdAndUpdate(req.user._id, {
        lastWorkoutDate: workout.date
      });
    }
    
    // Track new muscle groups after update
    const newMuscleGroups = new Set(['overall']);
    workout.exercises.forEach(ex => {
      if (ex.exercise && ex.exercise.muscleGroup) {
        newMuscleGroups.add(ex.exercise.muscleGroup.toLowerCase());
      }
    });
    
    // Combine old and new muscle groups
    const allAffectedMuscleGroups = new Set([...oldMuscleGroups, ...newMuscleGroups]);
    
    // Add ranking updates to the queue
    rankingQueue.addUpdate(
      req.user._id,
      Array.from(allAffectedMuscleGroups),
      ['weekly', 'monthly', 'allTime']
    );
    
    // Update weekly snapshot
    await WeeklySnapshotService.updateSnapshotForWorkout(workout);
    
    // NEW: Get consistency multiplier for response
    const consistencyMultiplier = await WorkoutValidationService.getConsistencyMultiplier(req.user._id);
    
    res.json({
      workout,
      scoring: {
        totalPoints: workout.hypertrophyScore.total,
        consistencyMultiplier,
        byMuscleGroup: workout.hypertrophyScore.byMuscleGroup
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a workout
router.delete('/:id', auth, async (req, res) => {
  try {
    // Get the workout with populated exercises to track affected muscle groups
    const workout = await Workout.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('exercises.exercise');
    
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    // Track affected muscle groups before deletion
    const affectedMuscleGroups = new Set(['overall']);
    workout.exercises.forEach(ex => {
      if (ex.exercise && ex.exercise.muscleGroup) {
        affectedMuscleGroups.add(ex.exercise.muscleGroup.toLowerCase());
      }
    });
    
    // Delete the workout
    await workout.deleteOne();
    
    // UPDATE USER'S LAST WORKOUT DATE to the next most recent workout
    const mostRecentWorkout = await Workout.findOne({ 
      user: req.user._id 
    }).sort({ date: -1 }).select('date');
    
    await User.findByIdAndUpdate(req.user._id, {
      lastWorkoutDate: mostRecentWorkout ? mostRecentWorkout.date : null
    });
    
    // Add ranking updates to the queue
    rankingQueue.addUpdate(
      req.user._id,
      Array.from(affectedMuscleGroups),
      ['weekly', 'monthly', 'allTime']
    );
    
    // Update weekly snapshot
    await WeeklySnapshotService.updateSnapshotForWorkout(workout);
    
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;