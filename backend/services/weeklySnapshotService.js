// services/weeklySnapshotService.js
const WeeklySnapshot = require('../models/WeeklySnapshot');
const User = require('../models/User');
const Workout = require('../models/Workout');

class WeeklySnapshotService {
  /**
   * Get the week start date for a user (based on their join date)
   */
  static getWeekStartForUser(user, date = new Date()) {
    const userStartDate = new Date(user.createdAt);
    const dayOfWeek = userStartDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate days since user joined
    const daysSinceJoined = Math.floor((date - userStartDate) / (1000 * 60 * 60 * 24));
    
    // Calculate which week we're in (0-indexed)
    const weeksSinceJoined = Math.floor(daysSinceJoined / 7);
    
    // Calculate the start of the current week for this user
    const weekStart = new Date(userStartDate);
    weekStart.setDate(weekStart.getDate() + (weeksSinceJoined * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    return {
      weekStart,
      weekNumber: weeksSinceJoined + 1 // 1-indexed for display
    };
  }

  /**
   * Get or create weekly snapshot for a user and date
   */
  static async getOrCreateSnapshot(userId, date = new Date()) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    const { weekStart, weekNumber } = this.getWeekStartForUser(user, date);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Try to find existing snapshot
    let snapshot = await WeeklySnapshot.findOne({
      user: userId,
      weekStart: weekStart
    });
    
    // Create if doesn't exist
    if (!snapshot) {
      snapshot = new WeeklySnapshot({
        user: userId,
        weekStart,
        weekEnd,
        weekNumber,
        scores: {
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
        },
        stats: {
          workoutCount: 0,
          totalDuration: 0,
          totalVolume: 0
        },
        isComplete: false
      });
      await snapshot.save();
    }
    
    return snapshot;
  }

  /**
   * Update snapshot when a workout is added/updated
   */
  static async updateSnapshotForWorkout(workout) {
    try {
      // Get the snapshot for this workout's date
      const snapshot = await this.getOrCreateSnapshot(workout.user, workout.date);
      
      // Only update if the workout is within this snapshot's week
      if (workout.date >= snapshot.weekStart && workout.date <= snapshot.weekEnd) {
        // Recalculate all stats for this week (safest approach)
        await this.recalculateSnapshot(snapshot);
      }
    } catch (error) {
      console.error('Error updating snapshot for workout:', error);
    }
  }

  /**
   * Recalculate a snapshot from all workouts in that week
   */
  static async recalculateSnapshot(snapshot) {
    const workouts = await Workout.find({
      user: snapshot.user,
      date: {
        $gte: snapshot.weekStart,
        $lte: snapshot.weekEnd
      }
    }).populate('exercises.exercise');
    
    // Reset scores
    snapshot.scores = {
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
    };
    
    snapshot.stats = {
      workoutCount: workouts.length,
      totalDuration: 0,
      totalVolume: 0
    };
    
    // Aggregate data from workouts
    for (const workout of workouts) {
      // Add scores
      if (workout.hypertrophyScore) {
        snapshot.scores.total += workout.hypertrophyScore.total || 0;
        
        for (const [muscle, score] of Object.entries(workout.hypertrophyScore.byMuscleGroup || {})) {
          if (snapshot.scores.byMuscleGroup[muscle] !== undefined) {
            snapshot.scores.byMuscleGroup[muscle] += score || 0;
          }
        }
      }
      
      // Add stats
      snapshot.stats.totalDuration += workout.duration || 0;
      
      // Calculate volume
      workout.exercises.forEach(({ exercise, sets }) => {
        if (!exercise) return;
        
        sets.forEach(set => {
          const volume = (set.weight || 0) * (set.reps || 0);
          snapshot.stats.totalVolume += volume;
        });
      });
    }
    
    // Update completion status
    snapshot.isComplete = snapshot.checkIfComplete();
    
    await snapshot.save();
    return snapshot;
  }

  /**
   * Get weekly progress for a user
   */
  static async getWeeklyProgress(userId, weeks = 12) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    // Get current week info
    const { weekNumber } = this.getWeekStartForUser(user, new Date());
    
    // Calculate how many weeks to actually fetch (don't go before user joined)
    const weeksToFetch = Math.min(weeks, weekNumber);
    const startWeekNumber = Math.max(1, weekNumber - weeksToFetch + 1);
    
    // Fetch snapshots
    const snapshots = await WeeklySnapshot.find({
      user: userId,
      weekNumber: { $gte: startWeekNumber, $lte: weekNumber }
    }).sort({ weekNumber: 1 });
    
    // Ensure all weeks have snapshots (create missing ones)
    const result = [];
    for (let i = startWeekNumber; i <= weekNumber; i++) {
      let snapshot = snapshots.find(s => s.weekNumber === i);
      
      if (!snapshot) {
        // Calculate date for this week number
        const weekStart = new Date(user.createdAt);
        weekStart.setDate(weekStart.getDate() + ((i - 1) * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        // Create snapshot for missing week
        snapshot = await this.getOrCreateSnapshot(userId, weekStart);
        await this.recalculateSnapshot(snapshot);
      }
      
      result.push({
        weekStart: snapshot.weekStart,
        weekEnd: snapshot.weekEnd,
        weekNumber: snapshot.weekNumber,
        totalWorkouts: snapshot.stats.workoutCount,
        totalDuration: snapshot.stats.totalDuration,
        totalVolume: snapshot.stats.totalVolume,
        hypertrophyScores: snapshot.scores,
        isComplete: snapshot.isComplete
      });
    }
    
    return result;
  }

  /**
   * Scheduled job to finalize completed weeks
   */
  static async finalizeCompletedWeeks() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Find incomplete snapshots that should be complete
    const snapshots = await WeeklySnapshot.find({
      isComplete: false,
      weekEnd: { $lt: oneWeekAgo }
    });
    
    console.log(`Finalizing ${snapshots.length} completed weeks`);
    
    for (const snapshot of snapshots) {
      await this.recalculateSnapshot(snapshot);
      snapshot.isComplete = true;
      await snapshot.save();
    }
    
    return snapshots.length;
  }
}

module.exports = WeeklySnapshotService;