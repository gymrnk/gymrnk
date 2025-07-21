// services/workoutValidationService.js
const User = require('../models/User');
const Workout = require('../models/Workout');
const moment = require('moment-timezone');

// World record limits (kg) - add 10% buffer
const WORLD_RECORDS = {
  // Powerlifting records
  'bench press': 355 * 1.1,        // 390.5kg
  'barbell bench press': 355 * 1.1,
  'squat': 525 * 1.1,              // 577.5kg
  'barbell squat': 525 * 1.1,
  'deadlift': 501 * 1.1,           // 551.1kg
  'barbell deadlift': 501 * 1.1,
  
  // Olympic lifts
  'clean and jerk': 267 * 1.1,     // 293.7kg
  'snatch': 225 * 1.1,             // 247.5kg
  
  // Common exercises (estimated maximums)
  'overhead press': 250 * 1.1,      // 275kg
  'barbell row': 350 * 1.1,        // 385kg
  'pull up': 200 * 1.1,            // 220kg added weight
  'dip': 250 * 1.1,                // 275kg added weight
  
  // Default for unlisted exercises
  'default': 400                   // 400kg cap for safety
};

class WorkoutValidationService {
  /**
   * Validate workout submission
   */
  static async validateWorkout(userId, workoutData) {
    const validationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      modifications: []
    };
    
    try {
      // 1. Check session limits
      const sessionCheck = await this.checkSessionLimits(userId, workoutData.date);
      if (!sessionCheck.isValid) {
        validationResult.errors.push(sessionCheck.message);
        validationResult.isValid = false;
      }
      
      // 2. Validate each exercise
      for (const exercise of workoutData.exercises) {
        const exerciseValidation = await this.validateExercise(
          userId, 
          exercise, 
          workoutData.date
        );
        
        validationResult.warnings.push(...exerciseValidation.warnings);
        validationResult.errors.push(...exerciseValidation.errors);
        validationResult.modifications.push(...exerciseValidation.modifications);
        
        if (exerciseValidation.errors.length > 0) {
          validationResult.isValid = false;
        }
      }
      
      // 3. Check for suspicious patterns
      const patternCheck = await this.checkSuspiciousPatterns(userId, workoutData);
      validationResult.warnings.push(...patternCheck.warnings);
      
    } catch (error) {
      console.error('Workout validation error:', error);
      validationResult.errors.push('Validation system error');
      validationResult.isValid = false;
    }
    
    return validationResult;
  }
  
  /**
   * Check daily session limits
   */
  static async checkSessionLimits(userId, workoutDate) {
    const startOfDay = moment(workoutDate).startOf('day').toDate();
    const endOfDay = moment(workoutDate).endOf('day').toDate();
    
    const todaysWorkouts = await Workout.countDocuments({
      user: userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    
    if (todaysWorkouts >= 3) {
      return {
        isValid: false,
        message: '⚠️ Maximum 3 workout sessions per day. Additional workouts will not earn points.'
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validate individual exercise
   */
  static async validateExercise(userId, exerciseData, workoutDate) {
    const result = {
      warnings: [],
      errors: [],
      modifications: []
    };
    
    const Exercise = require('../models/Exercise');
    const exercise = await Exercise.findById(exerciseData.exerciseId || exerciseData.exercise);
    
    if (!exercise) {
      result.errors.push('Exercise not found');
      return result;
    }
    
    // Check each set
    for (let i = 0; i < exerciseData.sets.length; i++) {
      const set = exerciseData.sets[i];
      
      // 1. World record check
      const maxWeight = WORLD_RECORDS[exercise.name.toLowerCase()] || WORLD_RECORDS.default;
      if (set.weight > maxWeight) {
        result.errors.push(
          `❌ ${exercise.name} weight (${set.weight}kg) exceeds world record limit (${maxWeight}kg)`
        );
      }
      
      // 2. Rep sanity check
      if (set.reps > 100) {
        result.warnings.push(
          `⚠️ ${exercise.name} set ${i+1}: ${set.reps} reps is unusually high`
        );
        set.reps = 100; // Cap at 100
        result.modifications.push('Reps capped at 100');
      }
    }
    
    // 3. Check for weight jumps (if user has history)
    const jumpCheck = await this.checkWeightJumps(userId, exercise, exerciseData);
    result.warnings.push(...jumpCheck.warnings);
    
    return result;
  }
  
  /**
   * Check for suspicious weight jumps
   */
  static async checkWeightJumps(userId, exercise, exerciseData) {
    const warnings = [];
    
    try {
      // Get user's recent history for this exercise
      const recentWorkouts = await Workout.find({
        user: userId,
        'exercises.exercise': exercise._id,
        date: { $gte: moment().subtract(30, 'days').toDate() }
      }).sort({ date: -1 }).limit(10);
      
      if (recentWorkouts.length === 0) {
        return { warnings }; // No history to compare
      }
      
      // Find max weight from recent history
      let recentMaxWeight = 0;
      let lastWorkoutDate = null;
      
      for (const workout of recentWorkouts) {
        const exerciseEntry = workout.exercises.find(
          ex => ex.exercise.toString() === exercise._id.toString()
        );
        
        if (exerciseEntry) {
          const maxInWorkout = Math.max(...exerciseEntry.sets.map(s => s.weight));
          if (maxInWorkout > recentMaxWeight) {
            recentMaxWeight = maxInWorkout;
            lastWorkoutDate = workout.date;
          }
        }
      }
      
      // Check for deload pattern
      const currentMaxWeight = Math.max(...exerciseData.sets.map(s => s.weight));
      const isDeload = currentMaxWeight < recentMaxWeight * 0.6;
      
      if (isDeload) {
        // Store deload flag (you might want to save this to user profile)
        console.log(`Deload detected for ${exercise.name}`);
        return { warnings, isDeload: true };
      }
      
      // Check for suspicious jumps
      const daysSinceLastWorkout = lastWorkoutDate ? 
        moment().diff(moment(lastWorkoutDate), 'days') : 0;
      
      let allowedIncrease = 0.3; // 30% default
      if (daysSinceLastWorkout > 7) allowedIncrease = 0.5;
      if (daysSinceLastWorkout > 14) allowedIncrease = 0.75;
      if (daysSinceLastWorkout > 30) allowedIncrease = 1.0; // No limit after 30 days
      
      const percentIncrease = (currentMaxWeight - recentMaxWeight) / recentMaxWeight;
      
      if (percentIncrease > allowedIncrease && recentMaxWeight > 0) {
        warnings.push(
          `💪 Big jump detected on ${exercise.name}: ${Math.round(percentIncrease * 100)}% increase. ` +
          `Previous max: ${recentMaxWeight}kg → Current: ${currentMaxWeight}kg`
        );
      }
      
    } catch (error) {
      console.error('Error checking weight jumps:', error);
    }
    
    return { warnings };
  }
  
  /**
   * Check for suspicious patterns
   */
  static async checkSuspiciousPatterns(userId, workoutData) {
    const warnings = [];
    
    // 1. Check for too-perfect numbers
    let perfectNumberCount = 0;
    for (const exercise of workoutData.exercises) {
      for (const set of exercise.sets) {
        // Check if weight ends in 0 or 5 (common), but flag if ALL are perfect
        if (set.weight % 5 === 0) perfectNumberCount++;
      }
    }
    
    const totalSets = workoutData.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    if (perfectNumberCount === totalSets && totalSets > 5) {
      warnings.push('🤔 All weights are round numbers - consider tracking more precisely');
    }
    
    // 2. Check workout duration vs volume
    if (workoutData.duration) {
      const setsPerMinute = totalSets / workoutData.duration;
      if (setsPerMinute > 1) {
        warnings.push('⚡ Very fast workout pace detected - ensure proper rest between sets');
      }
    }
    
    return { warnings };
  }
  
  /**
   * Get consistency multiplier for user
   */
  static async getConsistencyMultiplier(userId) {
    // Count workouts in last 7 days
    const sevenDaysAgo = moment().subtract(7, 'days').startOf('day').toDate();
    
    const workoutCount = await Workout.countDocuments({
      user: userId,
      date: { $gte: sevenDaysAgo }
    });
    
    // Return multiplier based on frequency
    if (workoutCount === 0) return 0.5;      // Penalty for no workouts
    if (workoutCount === 1) return 0.8;      // Below baseline
    if (workoutCount <= 3) return 1.0;       // Baseline
    if (workoutCount <= 5) return 1.3;       // Good consistency
    if (workoutCount <= 7) return 1.5;       // Excellent consistency
    return 1.5; // Cap at 1.5x
  }
  
  /**
   * Get user's training phase (for deload detection)
   */
  static async detectTrainingPhase(userId) {
    const fourWeeksAgo = moment().subtract(4, 'weeks').toDate();
    
    const recentWorkouts = await Workout.find({
      user: userId,
      date: { $gte: fourWeeksAgo }
    }).sort({ date: 1 });
    
    if (recentWorkouts.length < 8) {
      return { phase: 'building', confidence: 'low' };
    }
    
    // Calculate weekly tonnage
    const weeklyTonnage = [];
    for (let week = 0; week < 4; week++) {
      const weekStart = moment().subtract(week + 1, 'weeks').startOf('week');
      const weekEnd = weekStart.clone().endOf('week');
      
      const weekWorkouts = recentWorkouts.filter(w => 
        moment(w.date).isBetween(weekStart, weekEnd)
      );
      
      const tonnage = weekWorkouts.reduce((sum, workout) => {
        return sum + (workout.totalVolume || 0);
      }, 0);
      
      weeklyTonnage.unshift(tonnage); // Add to beginning
    }
    
    // Detect deload pattern (significant drop in last week)
    const lastWeek = weeklyTonnage[3];
    const avgPreviousWeeks = (weeklyTonnage[0] + weeklyTonnage[1] + weeklyTonnage[2]) / 3;
    
    if (lastWeek < avgPreviousWeeks * 0.6) {
      return { phase: 'deload', confidence: 'high' };
    }
    
    return { phase: 'building', confidence: 'medium' };
  }
}

module.exports = WorkoutValidationService;