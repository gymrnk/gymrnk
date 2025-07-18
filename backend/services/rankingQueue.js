// services/rankingQueue.js
const EventEmitter = require('events');
const RankingSystem = require('./rankingSystem');

class RankingQueue extends EventEmitter {
  constructor() {
    super();
    
    // Enhanced queue configuration
    this.highPriorityQueue = []; // For immediate user feedback
    this.lowPriorityQueue = [];  // For background updates
    this.queue = []; // Legacy queue for backward compatibility
    this.processing = false;
    this.batchSize = 5; // Reduced for better responsiveness
    this.processInterval = 500; // Process every 500ms (faster)
    
    // Deduplication tracking
    this.pendingUpdates = new Map(); // userId -> Set of periods
    
    // Start processing loop
    this.startProcessing();
  }

  /**
   * Add a ranking update to the queue
   * ENHANCED: Now supports priority and deduplication
   */
  addUpdate(userId, muscleGroups, periods, priority = 'high') {
    const update = {
      userId,
      muscleGroups: Array.isArray(muscleGroups) ? muscleGroups : [muscleGroups],
      periods: Array.isArray(periods) ? periods : [periods],
      timestamp: new Date(),
      priority
    };
    
    // Deduplicate - merge with existing pending updates
    const userIdStr = userId.toString();
    if (this.pendingUpdates.has(userIdStr)) {
      const existing = this.pendingUpdates.get(userIdStr);
      update.periods.forEach(period => existing.add(period));
    } else {
      this.pendingUpdates.set(userIdStr, new Set(update.periods));
    }
    
    // Add to appropriate queue
    if (priority === 'high') {
      this.highPriorityQueue.push(update);
    } else {
      this.lowPriorityQueue.push(update);
    }
    
    // Also add to legacy queue for backward compatibility
    this.queue.push(update);
    
    this.emit('updateQueued', update);
  }

  /**
   * Start the processing loop
   */
  startProcessing() {
    setInterval(() => {
      if (!this.processing) {
        this.processQueue();
      }
    }, this.processInterval);
  }

  /**
   * Process the queue - OPTIMIZED VERSION
   */
  async processQueue() {
    if (this.processing) return;
    
    // Prioritize high priority queue
    const activeQueue = this.highPriorityQueue.length > 0 ? 
      this.highPriorityQueue : 
      (this.lowPriorityQueue.length > 0 ? this.lowPriorityQueue : this.queue);
    
    if (activeQueue.length === 0) return;
    
    this.processing = true;
    
    try {
      // Take a batch of updates
      const batch = activeQueue.splice(0, this.batchSize);
      
      // Also remove from legacy queue
      if (activeQueue !== this.queue) {
        batch.forEach(update => {
          const index = this.queue.findIndex(item => 
            item.userId === update.userId && 
            item.timestamp === update.timestamp
          );
          if (index !== -1) this.queue.splice(index, 1);
        });
      }
      
      console.log(`Processing ${batch.length} ranking updates (${
        activeQueue === this.highPriorityQueue ? 'high' : 
        activeQueue === this.lowPriorityQueue ? 'low' : 'normal'
      } priority)`);
      
      // Group by period for efficient processing
      const updatesByPeriod = {
        weekly: [],
        monthly: [],
        allTime: []
      };
      
      batch.forEach(update => {
        update.periods.forEach(period => {
          if (updatesByPeriod[period]) {
            updatesByPeriod[period].push(update.userId);
          }
        });
        
        // Clear from pending updates
        this.pendingUpdates.delete(update.userId.toString());
      });
      
      // Process each period using the new efficient batch update
      const results = {};
      for (const [period, userIds] of Object.entries(updatesByPeriod)) {
        if (userIds.length > 0) {
          // Use the new efficient batch update from RankingSystem
          results[period] = await RankingSystem.efficientBatchUpdate(userIds, period);
          
          // Update global rankings for overall muscle group only (most important)
          if (results[period].updated > 0) {
            await RankingSystem.updateGlobalRankingsOptimized(period, 'overall');
          }
        }
      }
      
      // Clear cache for updated periods
      Object.keys(results).forEach(period => {
        if (results[period].updated > 0) {
          RankingSystem.clearCache({ period });
        }
      });
      
      // Emit completion events
      batch.forEach(update => {
        this.emit('updateProcessed', update);
      });
      
    } catch (error) {
      console.error('Error processing ranking queue:', error);
      
      // Re-queue failed updates with lower priority
      batch.forEach(update => {
        if (!update.retries) update.retries = 0;
        if (update.retries < 3) {
          update.retries++;
          update.priority = 'low';
          this.lowPriorityQueue.push(update);
        }
      });
    } finally {
      this.processing = false;
    }
  }

  /**
   * NEW: Process a single user immediately (for instant feedback)
   */
  async processImmediate(userId) {
    try {
      console.log(`Immediate ranking update for user ${userId}`);
      
      // Update weekly and monthly (most relevant for users)
      const weeklyResult = await RankingSystem.incrementalUserRankingUpdate(userId, 'weekly');
      const monthlyResult = await RankingSystem.incrementalUserRankingUpdate(userId, 'monthly');
      
      // Fast update user's rank position
      if (weeklyResult?.changed) {
        await RankingSystem.updateGlobalRankingsOptimized('weekly', 'overall');
        RankingSystem.clearCache({ period: 'weekly', userId });
      }
      
      if (monthlyResult?.changed) {
        await RankingSystem.updateGlobalRankingsOptimized('monthly', 'overall');
        RankingSystem.clearCache({ period: 'monthly', userId });
      }
      
      return { 
        weekly: weeklyResult, 
        monthly: monthlyResult 
      };
      
    } catch (error) {
      console.error(`Error in immediate update for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Legacy process update method for backward compatibility
   */
  async processUpdate(update) {
    const { userId, muscleGroups, periods } = update;
    
    // Update user rankings first
    const updatePromises = [];
    for (const period of periods) {
      updatePromises.push(RankingSystem.updateUserRankings(userId, period));
    }
    await Promise.all(updatePromises);
    
    // Fast update ranks
    const fastUpdatePromises = [];
    for (const muscleGroup of muscleGroups) {
      for (const period of periods) {
        fastUpdatePromises.push(
          RankingSystem.fastUpdateUserRank(userId, period, muscleGroup)
        );
      }
    }
    await Promise.all(fastUpdatePromises);
    
    this.emit('updateProcessed', update);
  }

  /**
   * Get queue status - ENHANCED
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      highPriorityQueue: this.highPriorityQueue.length,
      lowPriorityQueue: this.lowPriorityQueue.length,
      processing: this.processing,
      pendingUsers: this.pendingUpdates.size,
      batchSize: this.batchSize,
      processInterval: this.processInterval
    };
  }

  /**
   * Clear the queue - ENHANCED
   */
  clearQueue() {
    const cleared = this.queue.length + this.highPriorityQueue.length + this.lowPriorityQueue.length;
    this.queue = [];
    this.highPriorityQueue = [];
    this.lowPriorityQueue = [];
    this.pendingUpdates.clear();
    console.log(`Cleared ${cleared} updates from all queues`);
    return cleared;
  }

  /**
   * NEW: Adjust processing rate based on load
   */
  adjustProcessingRate(queueSize) {
    if (queueSize > 100) {
      this.batchSize = Math.min(10, this.batchSize + 1);
      this.processInterval = Math.max(250, this.processInterval - 50);
    } else if (queueSize < 20) {
      this.batchSize = Math.max(3, this.batchSize - 1);
      this.processInterval = Math.min(1000, this.processInterval + 50);
    }
  }
}

// Create singleton instance
const rankingQueue = new RankingQueue();

// Optional: Log queue events
rankingQueue.on('updateQueued', (update) => {
  console.log(`Ranking update queued for user ${update.userId}`);
});

rankingQueue.on('updateProcessed', (update) => {
  console.log(`Ranking update processed for user ${update.userId}`);
});

// NEW: Auto-adjust processing rate based on queue size
setInterval(() => {
  const status = rankingQueue.getStatus();
  const totalQueued = status.highPriorityQueue + status.lowPriorityQueue + status.queueLength;
  rankingQueue.adjustProcessingRate(totalQueued);
}, 30000); // Check every 30 seconds

module.exports = rankingQueue;