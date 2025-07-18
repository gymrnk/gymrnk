// services/rankingSystem.js
const User = require('../models/User');
const Workout = require('../models/Workout');
const Ranking = require('../models/Ranking');
const Exercise = require('../models/Exercise');

// Tier thresholds based on percentiles
const TIER_SYSTEM = {
  tiers: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'],
  divisions: [5, 4, 3, 2, 1], // Each tier has 5 divisions (5 being lowest)
  percentiles: {
    'Challenger': 0.002,    // Top 0.2%
    'Grandmaster': 0.005,   // Top 0.5%
    'Master': 0.01,         // Top 1%
    'Diamond': 0.02,        // Top 2%
    'Emerald': 0.05,        // Top 5%
    'Platinum': 0.10,       // Top 10%
    'Gold': 0.20,           // Top 20%
    'Silver': 0.40,         // Top 40%
    'Bronze': 0.70,         // Top 70%
    'Iron': 1.0             // Everyone else
  }
};

class RankingSystem {
  /**
   * NEW: Get exact date boundaries for rolling windows
   */
  static getDateBoundaries(period = 'weekly') {
    const now = new Date();
    const boundaries = {
      weekly: {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end: now
      },
      monthly: {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now
      },
      allTime: {
        start: new Date(0),
        end: now
      }
    };
    
    return boundaries[period];
  }

  /**
   * Calculate hypertrophy score for a single set
   * Rewards: volume, time under tension, moderate rep ranges (8-12)
   */
  static calculateSetScore(set, exercise) {
    try {
      // Parse and validate inputs with more robust handling
      const reps = this.parseNumber(set.reps);
      const weight = this.parseNumber(set.weight);
      
      // Log for debugging
      console.log(`Set calculation - Reps: ${reps}, Weight: ${weight}, Exercise: ${exercise?.name}`);
      
      // Both reps and weight must be positive numbers
      if (reps <= 0 || weight <= 0) {
        console.log(`Invalid set data: reps=${reps}, weight=${weight}`);
        return 0;
      }
      
      // Base volume (reps * weight)
      let score = reps * weight;
      
      // Optimal rep range multiplier (peak at 8-12 reps for hypertrophy)
      let repMultiplier = 1.0;
      if (reps >= 8 && reps <= 12) {
        repMultiplier = 1.5;
      } else if (reps >= 6 && reps <= 15) {
        repMultiplier = 1.2;
      } else if (reps < 6) {
        repMultiplier = 0.8; // Less effective for hypertrophy
      } else if (reps > 20) {
        repMultiplier = 0.7; // Endurance range
      }
      
      // Time under tension multiplier
      let tempoMultiplier = 1.0;
      if (set.tempo && typeof set.tempo === 'string') {
        try {
          const tempoNumbers = set.tempo.split('-').map(n => parseInt(n) || 0);
          const totalTempo = tempoNumbers.reduce((a, b) => a + b, 0);
          if (totalTempo >= 4) tempoMultiplier = 1.3; // Good TUT
          if (totalTempo >= 6) tempoMultiplier = 1.5; // Excellent TUT
        } catch (e) {
          console.log('Error parsing tempo:', e);
        }
      }
      
      // RPE multiplier (effort matters, but not too much)
      let rpeMultiplier = 1.0;
      const rpe = this.parseNumber(set.rpe);
      if (rpe >= 7) rpeMultiplier = 1.1;
      if (rpe >= 8) rpeMultiplier = 1.2;
      
      // Apply exercise-specific factors
      let exerciseMultiplier = 1.0;
      if (exercise && exercise.hypertrophyFactors) {
        const factors = exercise.hypertrophyFactors;
        exerciseMultiplier = 
          (factors.timeUnderTension || 1.0) * 
          (factors.muscleActivation || 1.0) * 
          (factors.volumeWeight || 1.0);
      }
      
      const finalScore = score * repMultiplier * tempoMultiplier * rpeMultiplier * exerciseMultiplier;
      
      console.log(`Final set score: ${finalScore} (base: ${score}, multipliers: rep=${repMultiplier}, tempo=${tempoMultiplier}, rpe=${rpeMultiplier}, exercise=${exerciseMultiplier})`);
      
      return Math.max(0, finalScore); // Ensure non-negative
    } catch (error) {
      console.error('Error calculating set score:', error);
      return 0;
    }
  }

  /**
   * Helper to parse numbers safely
   */
  static parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Calculate total hypertrophy score for a workout
   */
  static async calculateWorkoutScore(workout) {
    const scoresByMuscleGroup = {
      chest: 0,
      back: 0,
      shoulders: 0,
      biceps: 0,
      triceps: 0,
      legs: 0,
      abs: 0
    };
    
    console.log(`Calculating workout score for workout ${workout._id}`);
    
    for (const exerciseData of workout.exercises) {
      try {
        // Handle both populated and non-populated exercises
        let exercise;
        if (exerciseData.exercise && typeof exerciseData.exercise === 'object' && exerciseData.exercise._id) {
          // Already populated
          exercise = exerciseData.exercise;
        } else if (exerciseData.exerciseId) {
          // Use exerciseId field
          exercise = await Exercise.findById(exerciseData.exerciseId);
        } else if (exerciseData.exercise) {
          // exercise field contains ID
          exercise = await Exercise.findById(exerciseData.exercise);
        }
        
        if (!exercise) {
          console.log(`Exercise not found for data:`, exerciseData);
          continue;
        }
        
        let exerciseScore = 0;
        
        // Calculate score for all sets
        if (exerciseData.sets && Array.isArray(exerciseData.sets)) {
          for (const set of exerciseData.sets) {
            const setScore = this.calculateSetScore(set, exercise);
            exerciseScore += setScore;
          }
        }
        
        console.log(`Exercise ${exercise.name} total score: ${exerciseScore}`);
        
        // Add to primary muscle group
        const primaryMuscle = exercise.muscleGroup?.toLowerCase();
        if (primaryMuscle && scoresByMuscleGroup.hasOwnProperty(primaryMuscle)) {
          scoresByMuscleGroup[primaryMuscle] += exerciseScore;
        } else {
          console.log(`Unknown muscle group: ${primaryMuscle}`);
        }
        
        // Add partial credit to secondary muscles
        if (exercise.secondaryMuscles && Array.isArray(exercise.secondaryMuscles)) {
          for (const secondary of exercise.secondaryMuscles) {
            const secondaryMuscle = secondary?.toLowerCase();
            if (secondaryMuscle && scoresByMuscleGroup.hasOwnProperty(secondaryMuscle)) {
              scoresByMuscleGroup[secondaryMuscle] += exerciseScore * 0.3;
            }
          }
        }
      } catch (error) {
        console.error('Error processing exercise:', error);
      }
    }
    
    // Calculate total score
    const totalScore = Object.values(scoresByMuscleGroup).reduce((a, b) => a + b, 0);
    
    console.log(`Workout total score: ${totalScore}, by muscle group:`, scoresByMuscleGroup);
    
    return {
      total: totalScore,
      byMuscleGroup: scoresByMuscleGroup
    };
  }

  /**
   * NEW OPTIMIZED: Incremental ranking update - only recalculate what's changed
   * This is the KEY improvement for rolling windows
   */
  static async incrementalUserRankingUpdate(userId, period = 'weekly') {
    try {
      const boundaries = this.getDateBoundaries(period);
      
      // Get current ranking
      const currentRanking = await Ranking.findOne({
        user: userId,
        period,
        muscleGroup: 'overall'
      });
      
      // Find workouts that have been added/modified since last calculation
      const newOrModifiedWorkouts = await Workout.find({
        user: userId,
        date: { $gte: boundaries.start, $lte: boundaries.end },
        $or: [
          { createdAt: { $gt: currentRanking?.calculatedAt || new Date(0) } },
          { updatedAt: { $gt: currentRanking?.calculatedAt || new Date(0) } }
        ]
      }).populate('exercises.exercise exercises.exerciseId');
      
      // Find workouts that have expired since last calculation
      const expiredWorkouts = currentRanking?.calculatedAt ? 
        await Workout.find({
          user: userId,
          date: { 
            $lt: boundaries.start,
            $gte: new Date(currentRanking.calculatedAt.getTime() - 
              (period === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000)
          }
        }).populate('exercises.exercise exercises.exerciseId') : [];
      
      // If nothing changed, return current scores
      if (newOrModifiedWorkouts.length === 0 && expiredWorkouts.length === 0) {
        return currentRanking ? {
          overall: currentRanking.score,
          changed: false
        } : null;
      }
      
      // Calculate score changes
      const scoreChanges = {
        overall: 0,
        chest: 0,
        back: 0,
        shoulders: 0,
        biceps: 0,
        triceps: 0,
        legs: 0,
        abs: 0
      };
      
      // Add scores from new/modified workouts
      for (const workout of newOrModifiedWorkouts) {
        if (!workout.hypertrophyScore || !workout.hypertrophyScore.total) {
          const scores = await this.calculateWorkoutScore(workout);
          workout.hypertrophyScore = scores;
          await workout.save();
        }
        
        if (workout.hypertrophyScore && workout.hypertrophyScore.total > 0) {
          scoreChanges.overall += workout.hypertrophyScore.total;
          for (const [muscle, score] of Object.entries(workout.hypertrophyScore.byMuscleGroup)) {
            if (scoreChanges.hasOwnProperty(muscle)) {
              scoreChanges[muscle] += score || 0;
            }
          }
        }
      }
      
      // Subtract scores from expired workouts
      for (const workout of expiredWorkouts) {
        if (workout.hypertrophyScore && workout.hypertrophyScore.total > 0) {
          scoreChanges.overall -= workout.hypertrophyScore.total;
          for (const [muscle, score] of Object.entries(workout.hypertrophyScore.byMuscleGroup)) {
            if (scoreChanges.hasOwnProperty(muscle)) {
              scoreChanges[muscle] -= score || 0;
            }
          }
        }
      }
      
      // Update rankings with the changes
      const bulkOps = [];
      for (const [muscleGroup, scoreChange] of Object.entries(scoreChanges)) {
        if (scoreChange !== 0 || !currentRanking) {
          // Get current score for this muscle group
          const existingRanking = await Ranking.findOne({
            user: userId,
            period,
            muscleGroup
          });
          
          const newScore = Math.max(0, (existingRanking?.score || 0) + scoreChange);
          
          bulkOps.push({
            updateOne: {
              filter: { user: userId, period, muscleGroup },
              update: { 
                score: newScore,
                calculatedAt: new Date()
              },
              upsert: true
            }
          });
        }
      }
      
      if (bulkOps.length > 0) {
        await Ranking.bulkWrite(bulkOps);
      }
      
      return {
        overall: scoreChanges.overall,
        changed: true
      };
      
    } catch (error) {
      console.error('Error in incremental ranking update:', error);
      throw error;
    }
  }

  /**
   * Update user rankings based on recent workouts
   * UPDATED to use incremental updates for efficiency
   */
  static async updateUserRankings(userId, period = 'weekly') {
    try {
      // Use the new incremental update
      const result = await this.incrementalUserRankingUpdate(userId, period);
      
      if (!result) {
        // Fallback to full recalculation if needed
        return await this.fullUserRankingRecalculation(userId, period);
      }
      
      // Return aggregated scores for backward compatibility
      const ranking = await Ranking.findOne({
        user: userId,
        period,
        muscleGroup: 'overall'
      });
      
      const aggregateScores = { overall: ranking?.score || 0 };
      
      // Get scores for all muscle groups if needed
      const muscleGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
      for (const muscle of muscleGroups) {
        const muscleRanking = await Ranking.findOne({
          user: userId,
          period,
          muscleGroup: muscle
        });
        aggregateScores[muscle] = muscleRanking?.score || 0;
      }
      
      return aggregateScores;
    } catch (error) {
      console.error('Error updating user rankings:', error);
      throw error;
    }
  }

  /**
   * Full recalculation fallback (original method)
   */
  static async fullUserRankingRecalculation(userId, period = 'weekly') {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');
      
      // Get date range based on period
      const boundaries = this.getDateBoundaries(period);
      
      // Get user's workouts in period
      const workouts = await Workout.find({
        user: userId,
        date: { $gte: boundaries.start, $lte: boundaries.end }
      }).populate('exercises.exercise exercises.exerciseId');
      
      console.log(`Found ${workouts.length} workouts for user ${userId} in period ${period}`);
      
      // Calculate aggregate scores
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
      
      // Process each workout
      for (const workout of workouts) {
        // Calculate score if not already calculated
        if (!workout.hypertrophyScore || !workout.hypertrophyScore.total) {
          const scores = await this.calculateWorkoutScore(workout);
          workout.hypertrophyScore = scores;
          await workout.save();
        }
        
        // Add to aggregate scores
        if (workout.hypertrophyScore && workout.hypertrophyScore.total > 0) {
          aggregateScores.overall += workout.hypertrophyScore.total;
          for (const [muscle, score] of Object.entries(workout.hypertrophyScore.byMuscleGroup)) {
            if (aggregateScores.hasOwnProperty(muscle)) {
              aggregateScores[muscle] += score || 0;
            }
          }
        }
      }
      
      console.log(`User ${userId} aggregate scores:`, aggregateScores);
      
      // Update or create rankings
      for (const [muscleGroup, score] of Object.entries(aggregateScores)) {
        await Ranking.findOneAndUpdate(
          { user: userId, period, muscleGroup },
          { 
            score: Math.max(0, score), // Ensure non-negative
            calculatedAt: new Date()
          },
          { upsert: true, new: true }
        );
      }
      
      return aggregateScores;
    } catch (error) {
      console.error('Error in full user ranking recalculation:', error);
      throw error;
    }
  }

  /**
   * NEW: Find users with expiring workouts in the next time window
   */
  static async getUsersWithExpiringWorkouts(period = 'weekly', hoursAhead = 1) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 
      (period === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000);
    const windowEnd = new Date(windowStart.getTime() + hoursAhead * 60 * 60 * 1000);
    
    // Find workouts that will expire in the next hour
    const expiringWorkouts = await Workout.find({
      date: { $gte: windowStart, $lt: windowEnd }
    }).distinct('user');
    
    return expiringWorkouts;
  }

  /**
   * NEW: Efficient batch processing with minimal database queries
   */
  static async efficientBatchUpdate(userIds, period = 'weekly') {
    const results = { updated: 0, unchanged: 0, failed: 0 };
    const boundaries = this.getDateBoundaries(period);
    
    // Process in small batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      try {
        // Parallel processing within batch
        const batchResults = await Promise.allSettled(
          batch.map(userId => this.incrementalUserRankingUpdate(userId, period))
        );
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            if (result.value?.changed) {
              results.updated++;
            } else {
              results.unchanged++;
            }
          } else {
            results.failed++;
            console.error('Batch update error:', result.reason);
          }
        });
        
        // Micro-pause between batches to prevent CPU spikes
        if (i + batchSize < userIds.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error('Batch processing error:', error);
        results.failed += batch.length;
      }
    }
    
    return results;
  }

  /**
   * OPTIMIZED: Fast update single user's rank after score change
   * This is much faster than recalculating all users
   */
  static async fastUpdateUserRank(userId, period, muscleGroup) {
    try {
      // Get the user's current ranking
      const userRanking = await Ranking.findOne({
        user: userId,
        period,
        muscleGroup
      });
      
      if (!userRanking) {
        console.log('No ranking found for user');
        return;
      }
      
      // Count how many users have a higher score
      const higherScoreCount = await Ranking.countDocuments({
        period,
        muscleGroup,
        score: { $gt: userRanking.score }
      });
      
      // User's rank is count + 1
      const newRank = higherScoreCount + 1;
      
      // Get total count for percentile calculation
      const totalCount = await Ranking.countDocuments({
        period,
        muscleGroup
      });
      
      const percentile = newRank / totalCount;
      const { tier, division } = this.getTierAndDivision(percentile);
      
      // Update the user's ranking
      userRanking.rank = newRank;
      userRanking.percentile = percentile;
      userRanking.tier = tier;
      userRanking.division = division;
      await userRanking.save();
      
      // Update user document if it's overall ranking
      if (muscleGroup === 'overall') {
        await User.findByIdAndUpdate(userId, {
          'rankings.overall': { tier, division, points: userRanking.score }
        });
      } else {
        await User.findByIdAndUpdate(userId, {
          [`rankings.muscleGroups.${muscleGroup}`]: { 
            tier, 
            division, 
            points: userRanking.score 
          }
        });
      }
      
      console.log(`Fast updated rank for user ${userId}: #${newRank} (${tier} ${division})`);
      
      return { rank: newRank, percentile, tier, division };
    } catch (error) {
      console.error('Error in fast rank update:', error);
      throw error;
    }
  }

  /**
   * Calculate tier and division based on percentile rank
   */
  static getTierAndDivision(percentile) {
    // Ensure percentile is between 0 and 1
    percentile = Math.max(0, Math.min(1, percentile));
    
    // Find appropriate tier
    let tier = 'Iron';
    for (const [tierName, threshold] of Object.entries(TIER_SYSTEM.percentiles)) {
      if (percentile <= threshold) {
        tier = tierName;
        break;
      }
    }
    
    // Calculate division within tier (1-5, where 1 is highest)
    const tierIndex = TIER_SYSTEM.tiers.indexOf(tier);
    const nextTierPercentile = tierIndex > 0 ? 
      Object.values(TIER_SYSTEM.percentiles)[tierIndex - 1] : 0;
    const currentTierPercentile = TIER_SYSTEM.percentiles[tier];
    
    const tierRange = currentTierPercentile - nextTierPercentile;
    const positionInTier = tierRange > 0 ? (percentile - nextTierPercentile) / tierRange : 0;
    
    // Division 1 is top 20% of tier, Division 5 is bottom 20%
    let division = Math.ceil(positionInTier * 5);
    division = Math.max(1, Math.min(5, division));
    
    return { tier, division };
  }

  /**
   * OPTIMIZED: Update global rankings using aggregation pipeline
   */
  static async updateGlobalRankingsOptimized(period = 'weekly', muscleGroup = 'overall') {
    try {
      const startTime = Date.now();
      
      // Use MongoDB aggregation for efficient ranking
      const pipeline = [
        { $match: { period, muscleGroup } },
        { $sort: { score: -1 } },
        { $group: {
          _id: null,
          rankings: { $push: { _id: '$_id', user: '$user', score: '$score' } },
          total: { $sum: 1 }
        }}
      ];
      
      const [result] = await Ranking.aggregate(pipeline);
      
      if (!result || result.rankings.length === 0) {
        console.log('No rankings to update');
        return 0;
      }
      
      const { rankings, total } = result;
      const bulkOps = [];
      let ranksChanged = 0;
      
      // Update only changed ranks
      for (let i = 0; i < rankings.length; i++) {
        const rank = i + 1;
        const percentile = rank / total;
        const { tier, division } = this.getTierAndDivision(percentile);
        
        bulkOps.push({
          updateOne: {
            filter: { _id: rankings[i]._id },
            update: {
              $set: { rank, percentile, tier, division }
            }
          }
        });
        ranksChanged++;
      }
      
      if (bulkOps.length > 0) {
        await Ranking.bulkWrite(bulkOps, { ordered: false });
      }
      
      const duration = Date.now() - startTime;
      console.log(`Updated ${ranksChanged} ranks for ${muscleGroup} (${period}) in ${duration}ms`);
      
      return ranksChanged;
    } catch (error) {
      console.error('Error updating global rankings:', error);
      throw error;
    }
  }

  /**
   * Update global rankings and assign tiers
   * UPDATED to use optimized method
   */
  static async updateGlobalRankings(period = 'weekly', muscleGroup = 'overall') {
    return this.updateGlobalRankingsOptimized(period, muscleGroup);
  }

  /**
   * SUPER FAST: Update only users whose ranks have changed
   * UPDATED to use optimized method
   */
  static async incrementalGlobalRankingUpdate(period = 'weekly', muscleGroup = 'overall') {
    return this.updateGlobalRankingsOptimized(period, muscleGroup);
  }

  /**
   * Parallel processing for multiple muscle groups
   * Processes multiple muscle groups concurrently for faster overall completion
   */
  static async updateAllRankingsParallel(period = 'weekly', batchSize = 3) {
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    const startTime = Date.now();
    
    console.log(`Starting parallel ranking update for ${period}...`);
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < muscleGroups.length; i += batchSize) {
      const batch = muscleGroups.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(muscleGroup => 
          this.updateGlobalRankingsOptimized(period, muscleGroup)
        )
      );
    }
    
    const duration = Date.now() - startTime;
    console.log(`Completed all ${period} rankings update in ${duration}ms`);
  }

  /**
   * NEW: Batch update user rankings for efficiency
   */
  static async batchUpdateUserRankings(userIds, period = 'weekly', batchSize = 10) {
    return this.efficientBatchUpdate(userIds, period);
  }

  /**
   * NEW: Recalculate all user scores for a specific period
   */
  static async recalculateAllUserScores(period = 'weekly', batchSize = 50) {
    const User = require('../models/User');
    let processedCount = 0;
    let skip = 0;
    
    while (true) {
      const users = await User.find({ isActive: { $ne: false } })
        .select('_id')
        .skip(skip)
        .limit(batchSize)
        .lean();
      
      if (users.length === 0) break;
      
      // Process batch
      await Promise.all(
        users.map(user => 
          this.updateUserRankings(user._id, period)
            .then(() => processedCount++)
            .catch(err => console.error(`Failed to update ${user._id}:`, err.message))
        )
      );
      
      skip += batchSize;
    }
    
    return processedCount;
  }

  /**
   * Cache-based ranking for super fast reads
   * Store pre-calculated leaderboards in Redis or memory
   */
  static cachedLeaderboards = new Map();
  static cacheExpiry = 3 * 60 * 1000; // 3 minutes (reduced from 5 since we update every 5 mins)

  static async getCachedLeaderboard(options) {
    const { muscleGroup, period, limit, friendsOnly, crewOnly, crewId, userId } = options;
    
    // Create cache key
    let cacheKey = `leaderboard:${muscleGroup}:${period}:${limit}`;
    
    if (friendsOnly && userId) {
      cacheKey = `leaderboard:friends:${userId}:${muscleGroup}:${period}:${limit}`;
    } else if (crewOnly && crewId) {
      cacheKey = `leaderboard:crew:${crewId}:${muscleGroup}:${period}:${limit}`;
    }
    
    // Check cache
    const cached = this.cachedLeaderboards.get(cacheKey);
    
    if (cached && cached.timestamp > Date.now() - this.cacheExpiry) {
      console.log('Returning cached leaderboard');
      return cached.data;
    }
    
    // Generate fresh leaderboard
    const leaderboard = await this.getLeaderboard(options);
    
    // Cache it
    this.cachedLeaderboards.set(cacheKey, {
      data: leaderboard,
      timestamp: Date.now()
    });
    
    // Clean old cache entries
    if (this.cachedLeaderboards.size > 100) {
      const sortedEntries = Array.from(this.cachedLeaderboards.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest half
      for (let i = 0; i < sortedEntries.length / 2; i++) {
        this.cachedLeaderboards.delete(sortedEntries[i][0]);
      }
    }
    
    return leaderboard;
  }

  /**
   * Clear cache for specific keys or all cache
   */
  static clearCache(options = null) {
    if (!options) {
      this.cachedLeaderboards.clear();
      console.log('Cleared all cached leaderboards');
      return;
    }
    
    // Clear specific cache entries matching the options
    const keysToDelete = [];
    for (const [key, value] of this.cachedLeaderboards.entries()) {
      if (options.muscleGroup && key.includes(options.muscleGroup)) {
        keysToDelete.push(key);
      } else if (options.period && key.includes(options.period)) {
        keysToDelete.push(key);
      } else if (options.userId && key.includes(options.userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cachedLeaderboards.delete(key));
    console.log(`Cleared ${keysToDelete.length} cached entries`);
  }

  /**
   * Database index optimization check
   * Ensures proper indexes exist for optimal performance
   */
  static async ensureOptimalIndexes() {
    try {
      // Check existing indexes
      const indexes = await Ranking.collection.getIndexes();
      console.log('Current indexes:', indexes);
      
      // Create compound index for fast sorting if it doesn't exist
      const optimalIndexName = 'period_1_muscleGroup_1_score_-1';
      if (!indexes[optimalIndexName]) {
        console.log('Creating optimal compound index...');
        await Ranking.collection.createIndex(
          { period: 1, muscleGroup: 1, score: -1 },
          { background: true }
        );
      }
      
      // Index for fast user lookups
      const userIndexName = 'user_1_period_1_muscleGroup_1';
      if (!indexes[userIndexName]) {
        console.log('Creating user lookup index...');
        await Ranking.collection.createIndex(
          { user: 1, period: 1, muscleGroup: 1 },
          { background: true }
        );
      }
      
      // NEW: Index for calculatedAt to help with smart updates
      const calculatedAtIndexName = 'user_1_period_1_muscleGroup_1_calculatedAt_1';
      if (!indexes[calculatedAtIndexName]) {
        console.log('Creating calculatedAt index...');
        await Ranking.collection.createIndex(
          { user: 1, period: 1, muscleGroup: 1, calculatedAt: 1 },
          { background: true }
        );
      }
      
      console.log('Database indexes optimized');
    } catch (error) {
      console.error('Error ensuring indexes:', error);
    }
  }

  /**
   * Get leaderboard for a specific muscle group and period
   */
  static async getLeaderboard(options = {}) {
    const {
      muscleGroup = 'overall',
      period = 'weekly',
      limit = 100,
      friendsOnly = false,
      crewOnly = false,
      crewId = null,
      userId = null
    } = options;
    
    let query = { period, muscleGroup };
    
    if (friendsOnly && userId) {
      const user = await User.findById(userId);
      const friendIds = [...(user.friends || []), userId];
      query.user = { $in: friendIds };
    } else if (crewOnly && crewId) {
      // Get all users in the crew
      const crewMembers = await User.find({ crew: crewId }).select('_id');
      const crewMemberIds = crewMembers.map(member => member._id);
      query.user = { $in: crewMemberIds };
    }
    
    const rankings = await Ranking.find(query)
      .sort({ score: -1 })
      .limit(limit)
      .populate('user', 'username profile.displayName profile.avatar rankings');
    
    return rankings.map((r, index) => ({
      rank: index + 1,
      user: {
        id: r.user._id,
        username: r.user.username,
        displayName: r.user.profile?.displayName,
        avatar: r.user.profile?.avatar
      },
      score: r.score,
      tier: r.tier,
      division: r.division,
      percentile: r.percentile
    }));
  }
}

module.exports = RankingSystem;