// services/continuousExpirationService.js
const RankingSystem = require('./rankingSystem');
const Workout = require('../models/Workout');
const User = require('../models/User');
const Ranking = require('../models/Ranking');

/**
 * Service to continuously handle workout expiration from ranking windows
 * This recalculates rankings to ensure only workouts within the rolling window are counted
 */
class ContinuousExpirationService {
  constructor() {
    this.isProcessing = false;
    this.lastProcessedHour = null;
    this.processedUsers = new Set();
  }

  /**
   * Main processing function - called every 10 minutes by your cron job
   */
  async processExpirations() {
    if (this.isProcessing) {
      console.log('Expiration processing already in progress, skipping...');
      return { weekly: { updated: 0 }, monthly: { updated: 0 } };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Reset processed users set every hour
      if (currentHour !== this.lastProcessedHour) {
        this.processedUsers.clear();
        this.lastProcessedHour = currentHour;
      }

      // Process both weekly and monthly expirations
      const [weeklyResults, monthlyResults] = await Promise.all([
        this.processRollingWindow('weekly'),
        this.processRollingWindow('monthly')
      ]);

      const duration = Date.now() - startTime;
      console.log(`Expiration processing complete in ${duration}ms - Weekly: ${weeklyResults.updated} users, Monthly: ${monthlyResults.updated} users`);

      return {
        weekly: weeklyResults,
        monthly: monthlyResults,
        duration
      };
    } catch (error) {
      console.error('Error in continuous expiration processing:', error);
      return { weekly: { updated: 0, error: error.message }, monthly: { updated: 0 } };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process rolling window for a specific period
   */
  async processRollingWindow(period = 'weekly') {
    const now = new Date();
    const windowDays = period === 'weekly' ? 7 : 30;
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    
    // Find users who have:
    // 1. Workouts that just expired (just passed the window boundary)
    // 2. Rankings that haven't been updated recently
    const usersNeedingUpdate = await this.findUsersNeedingUpdate(period, windowStart);
    
    if (usersNeedingUpdate.length === 0) {
      return { updated: 0, checked: 0 };
    }

    console.log(`Found ${usersNeedingUpdate.length} users needing ${period} ranking updates`);

    let updated = 0;
    const batchSize = 10;

    // Process users in batches
    for (let i = 0; i < usersNeedingUpdate.length; i += batchSize) {
      const batch = usersNeedingUpdate.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(userId => this.recalculateUserRanking(userId, period))
      );

      updated += results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      // Small pause between batches to prevent CPU spikes
      if (i + batchSize < usersNeedingUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Update global rankings if any changes were made
    if (updated > 0) {
      await this.updateGlobalRankingsForPeriod(period);
    }

    return {
      updated,
      checked: usersNeedingUpdate.length
    };
  }

  /**
   * Find users who need ranking updates
   */
  async findUsersNeedingUpdate(period, windowStart) {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    // Users with workouts that just expired (crossed the window boundary in last 10 minutes)
    const usersWithNewlyExpiredWorkouts = await Workout.distinct('user', {
      date: {
        $lt: windowStart,
        $gte: new Date(windowStart.getTime() - 10 * 60 * 1000)
      }
    });

    // Users with stale rankings (not updated in last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const usersWithStaleRankings = await Ranking.distinct('user', {
      period,
      muscleGroup: 'overall',
      calculatedAt: { $lt: oneHourAgo }
    });

    // Users who worked out in the last 10 minutes (new workouts)
    const usersWithRecentWorkouts = await Workout.distinct('user', {
      createdAt: { $gte: tenMinutesAgo }
    });

    // Combine all users and deduplicate
    const allUsers = [
      ...new Set([
        ...usersWithNewlyExpiredWorkouts.map(id => id.toString()),
        ...usersWithStaleRankings.map(id => id.toString()),
        ...usersWithRecentWorkouts.map(id => id.toString())
      ])
    ];

    // Filter out already processed users
    return allUsers.filter(userId => !this.processedUsers.has(userId));
  }

  /**
   * Recalculate a user's ranking for a specific period
   */
  async recalculateUserRanking(userId, period) {
    try {
      const now = new Date();
      const boundaries = RankingSystem.getDateBoundaries(period);
      
      // Get all workouts in the current window
      const workouts = await Workout.find({
        user: userId,
        date: { 
          $gte: boundaries.start, 
          $lte: boundaries.end 
        }
      }).populate('exercises.exercise exercises.exerciseId');

      // Calculate total scores
      const aggregateScores = {
        overall: 0,
        chest: 0,
        back: 0,
        shoulders: 0,
        biceps: 0,
        triceps: 0,
        legs: 0,
        abs: 0
      };

      // Sum up scores from all workouts in window
      for (const workout of workouts) {
        if (!workout.hypertrophyScore || !workout.hypertrophyScore.total) {
          // Calculate score if missing
          const scores = await RankingSystem.calculateWorkoutScore(workout);
          workout.hypertrophyScore = scores;
          await workout.save();
        }

        if (workout.hypertrophyScore && workout.hypertrophyScore.total > 0) {
          aggregateScores.overall += workout.hypertrophyScore.total;
          
          for (const [muscle, score] of Object.entries(workout.hypertrophyScore.byMuscleGroup)) {
            if (aggregateScores.hasOwnProperty(muscle)) {
              aggregateScores[muscle] += score || 0;
            }
          }
        }
      }

      // Update rankings in database
      const bulkOps = [];
      let hasChanges = false;

      for (const [muscleGroup, newScore] of Object.entries(aggregateScores)) {
        // Check if score actually changed
        const existingRanking = await Ranking.findOne({
          user: userId,
          period,
          muscleGroup
        });

        const oldScore = existingRanking?.score || 0;
        
        if (Math.abs(oldScore - newScore) > 0.01) { // Account for floating point
          hasChanges = true;
          
          if (newScore > 0) {
            bulkOps.push({
              updateOne: {
                filter: { user: userId, period, muscleGroup },
                update: { 
                  score: newScore,
                  calculatedAt: now
                },
                upsert: true
              }
            });
          } else {
            // Remove ranking if score is 0
            bulkOps.push({
              deleteOne: {
                filter: { user: userId, period, muscleGroup }
              }
            });
          }
        }
      }

      if (bulkOps.length > 0) {
        await Ranking.bulkWrite(bulkOps);
        
        // Update user's rank position
        await RankingSystem.fastUpdateUserRank(userId, period, 'overall');
        
        // Clear cache for this user
        RankingSystem.clearCache({ userId });
      }

      // Mark user as processed
      this.processedUsers.add(userId.toString());

      console.log(`Updated ${period} rankings for user ${userId}: ${aggregateScores.overall} points (${workouts.length} workouts)`);
      
      return hasChanges;
    } catch (error) {
      console.error(`Error recalculating ${period} ranking for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Update global rankings for all muscle groups
   */
  async updateGlobalRankingsForPeriod(period) {
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    
    // Process in parallel batches of 4
    for (let i = 0; i < muscleGroups.length; i += 4) {
      const batch = muscleGroups.slice(i, i + 4);
      
      await Promise.all(
        batch.map(muscleGroup => 
          RankingSystem.updateGlobalRankingsOptimized(period, muscleGroup)
            .catch(err => console.error(`Failed to update ${period} ${muscleGroup} rankings:`, err))
        )
      );
      
      // Small pause between batches
      if (i + 4 < muscleGroups.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Clear the cache for this period
    RankingSystem.clearCache({ period });
  }

  /**
   * Force update for a specific user (useful for debugging)
   */
  async forceUpdateUser(userId) {
    this.processedUsers.delete(userId.toString());
    
    const results = {
      weekly: await this.recalculateUserRanking(userId, 'weekly'),
      monthly: await this.recalculateUserRanking(userId, 'monthly')
    };
    
    // Update global rankings
    if (results.weekly) {
      await RankingSystem.updateGlobalRankingsOptimized('weekly', 'overall');
    }
    if (results.monthly) {
      await RankingSystem.updateGlobalRankingsOptimized('monthly', 'overall');
    }
    
    return results;
  }

  /**
   * Get system status for monitoring
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      processedUsersCount: this.processedUsers.size,
      lastProcessedHour: this.lastProcessedHour
    };
  }

  /**
   * Clear processed users cache
   */
  clearCache() {
    this.processedUsers.clear();
    console.log('Cleared processed users cache');
  }
}

// Create singleton instance
const continuousExpirationService = new ContinuousExpirationService();

module.exports = continuousExpirationService;