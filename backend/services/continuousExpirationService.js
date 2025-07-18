// services/continuousExpirationService.js
const OptimizedRankingSystem = require('./optimizedRankingSystem');
const Workout = require('../models/Workout');
const User = require('../models/User');

/**
 * Service to continuously handle workout expiration from ranking windows
 * Designed to run frequently without causing CPU spikes
 */
class ContinuousExpirationService {
  constructor() {
    this.isProcessing = false;
    this.lastProcessedHour = null;
    this.processedUsers = new Set();
  }

  /**
   * Main processing function - should be called every 5-10 minutes
   */
  async processExpirations() {
    if (this.isProcessing) {
      console.log('Expiration processing already in progress, skipping...');
      return;
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

      // Process weekly expirations
      const weeklyResults = await this.processExpiringWorkouts('weekly');
      
      // Process monthly expirations (less frequently - only every 6th run)
      let monthlyResults = { processed: 0, updated: 0 };
      if (now.getMinutes() % 30 < 10) {
        monthlyResults = await this.processExpiringWorkouts('monthly');
      }

      const duration = Date.now() - startTime;
      console.log(`Expiration processing complete in ${duration}ms - Weekly: ${weeklyResults.updated}/${weeklyResults.processed}, Monthly: ${monthlyResults.updated}/${monthlyResults.processed}`);

      return {
        weekly: weeklyResults,
        monthly: monthlyResults,
        duration
      };
    } catch (error) {
      console.error('Error in continuous expiration processing:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process workouts that are about to expire from a ranking window
   */
  async processExpiringWorkouts(period = 'weekly') {
    const now = new Date();
    const windowSize = period === 'weekly' ? 7 : 30;
    
    // Find workouts that are about to expire (within next 15 minutes)
    const expirationBoundary = new Date(now.getTime() - windowSize * 24 * 60 * 60 * 1000);
    const expirationStart = new Date(expirationBoundary.getTime() - 15 * 60 * 1000);
    
    // Get users with workouts in the expiration window
    const usersWithExpiringWorkouts = await Workout.distinct('user', {
      date: { 
        $gte: expirationStart, 
        $lt: expirationBoundary 
      }
    });

    // Filter out already processed users
    const usersToProcess = usersWithExpiringWorkouts.filter(
      userId => !this.processedUsers.has(userId.toString())
    );

    if (usersToProcess.length === 0) {
      return { processed: 0, updated: 0 };
    }

    console.log(`Found ${usersToProcess.length} users with expiring ${period} workouts`);

    // Process users in small batches
    const results = await OptimizedRankingSystem.efficientBatchUpdate(usersToProcess, period);
    
    // Mark users as processed
    usersToProcess.forEach(userId => this.processedUsers.add(userId.toString()));

    // Update global rankings if any scores changed
    if (results.updated > 0) {
      // Update rankings for affected muscle groups
      const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
      
      // Process muscle groups in parallel batches
      for (let i = 0; i < muscleGroups.length; i += 4) {
        const batch = muscleGroups.slice(i, i + 4);
        await Promise.all(
          batch.map(mg => 
            OptimizedRankingSystem.updateGlobalRankingsOptimized(period, mg)
              .catch(err => console.error(`Failed to update ${mg} rankings:`, err))
          )
        );
      }
    }

    return {
      processed: usersToProcess.length,
      updated: results.updated
    };
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
   * Force clear processed users cache
   */
  clearCache() {
    this.processedUsers.clear();
    console.log('Cleared processed users cache');
  }
}

// Create singleton instance
const continuousExpirationService = new ContinuousExpirationService();

module.exports = continuousExpirationService;