// /backend/services/consistencyChallengeService.js

const cron = require('node-cron');
const Crew = require('../models/Crew');
const User = require('../models/User');
const Workout = require('../models/Workout');

class ConsistencyChallengeService {
  constructor() {
    this.initializeCronJobs();
  }

  initializeCronJobs() {
    // Run daily at midnight to update consistency challenges
    cron.schedule('0 0 * * *', async () => {
      console.log('[ConsistencyChallenge] Running daily update...');
      await this.updateConsistencyChallenges();
    });

    // Run every hour to check for expired challenges
    cron.schedule('0 * * * *', async () => {
      console.log('[ConsistencyChallenge] Checking for expired challenges...');
      await this.expireChallenges();
    });

    console.log('[ConsistencyChallenge] Service initialized with cron jobs');
  }

  async updateConsistencyChallenges() {
    try {
      // Get all crews with active consistency challenges
      const crews = await Crew.find({
        'challenges.type': 'consistency',
        'challenges.isActive': true,
        'challenges.endDate': { $gt: new Date() }
      });

      console.log(`[ConsistencyChallenge] Processing ${crews.length} crews`);

      for (const crew of crews) {
        const consistencyChallenges = crew.challenges.filter(c => 
          c.type === 'consistency' && 
          c.isActive && 
          new Date(c.endDate) > new Date() &&
          new Date(c.startDate) <= new Date()
        );

        for (const challenge of consistencyChallenges) {
          let updated = false;

          for (const participant of challenge.participants) {
            if (participant.completedAt) continue;

            // Get user's current streak
            const user = await User.findById(participant.user);
            
            if (!user) {
              console.log(`[ConsistencyChallenge] User ${participant.user} not found`);
              continue;
            }

            // Check if user worked out in the last 48 hours (give some grace period)
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            
            const recentWorkout = await Workout.findOne({
              user: participant.user,
              date: { $gte: twoDaysAgo }
            }).sort({ date: -1 });

            if (recentWorkout) {
              // User is maintaining their streak
              const currentStreak = user.streak?.current?.count || 0;
              
              if (currentStreak > participant.progress) {
                participant.progress = Math.min(currentStreak, challenge.target);
                updated = true;

                // Check if completed
                if (participant.progress >= challenge.target && !participant.completedAt) {
                  participant.completedAt = new Date();
                  
                  // Award XP to crew
                  crew.xp = (crew.xp || 0) + challenge.rewards.xp;
                  
                  // Check for level up
                  const xpForNextLevel = crew.level * 100;
                  if (crew.xp >= xpForNextLevel) {
                    crew.level++;
                    crew.xp -= xpForNextLevel;
                    
                    console.log(`[ConsistencyChallenge] Crew ${crew.name} leveled up to ${crew.level}!`);
                  }
                  
                  console.log(`[ConsistencyChallenge] User ${user.username} completed challenge: ${challenge.name}`);
                  
                  // TODO: Send notification to user about completion
                }
              }
            } else {
              // User broke their streak
              if (participant.progress > 0) {
                console.log(`[ConsistencyChallenge] User ${user.username} broke their streak for challenge: ${challenge.name}`);
                participant.progress = 0;
                updated = true;
                
                // TODO: Send notification to user about streak break
              }
            }
          }

          if (updated) {
            await crew.save();
          }
        }
      }

      console.log('[ConsistencyChallenge] Daily update completed');
    } catch (error) {
      console.error('[ConsistencyChallenge] Update error:', error);
    }
  }

  async expireChallenges() {
    try {
      const now = new Date();
      
      // Find all crews with active challenges
      const crews = await Crew.find({
        'challenges.isActive': true
      });

      let expiredCount = 0;

      for (const crew of crews) {
        let updated = false;

        for (const challenge of crew.challenges) {
          if (challenge.isActive && new Date(challenge.endDate) < now) {
            challenge.isActive = false;
            updated = true;
            expiredCount++;

            console.log(`[ConsistencyChallenge] Expired challenge: ${challenge.name} in crew ${crew.name}`);

            // Calculate final stats
            const completedCount = challenge.participants.filter(p => p.completedAt).length;
            const participantCount = challenge.participants.length;
            
            if (participantCount > 0) {
              const completionRate = (completedCount / participantCount) * 100;
              console.log(`[ConsistencyChallenge] Challenge stats - Completed: ${completedCount}/${participantCount} (${completionRate.toFixed(1)}%)`);
            }

            // TODO: Send notifications to participants about challenge ending
          }
        }

        if (updated) {
          await crew.save();
        }
      }

      if (expiredCount > 0) {
        console.log(`[ConsistencyChallenge] Expired ${expiredCount} challenges`);
      }
    } catch (error) {
      console.error('[ConsistencyChallenge] Expiration error:', error);
    }
  }

  // Manual trigger for testing
  async manualUpdate() {
    console.log('[ConsistencyChallenge] Manual update triggered');
    await this.updateConsistencyChallenges();
    await this.expireChallenges();
  }

  // Get challenge stats for analytics
  async getChallengeStats(crewId) {
    try {
      const crew = await Crew.findById(crewId);
      if (!crew) return null;

      const stats = {
        totalChallenges: crew.challenges.length,
        activeChallenges: 0,
        completedChallenges: 0,
        totalParticipants: 0,
        totalCompletions: 0,
        averageCompletionRate: 0,
        mostPopularType: null,
        totalXPAwarded: 0,
      };

      const typeCount = {};

      for (const challenge of crew.challenges) {
        if (challenge.isActive) {
          stats.activeChallenges++;
        } else {
          stats.completedChallenges++;
        }

        stats.totalParticipants += challenge.participants.length;
        
        const completions = challenge.participants.filter(p => p.completedAt).length;
        stats.totalCompletions += completions;

        // Track type popularity
        typeCount[challenge.type] = (typeCount[challenge.type] || 0) + challenge.participants.length;

        // Calculate XP awarded
        if (completions > 0) {
          stats.totalXPAwarded += challenge.rewards.xp * completions;
        }
      }

      // Calculate average completion rate
      if (stats.totalParticipants > 0) {
        stats.averageCompletionRate = (stats.totalCompletions / stats.totalParticipants) * 100;
      }

      // Find most popular type
      let maxCount = 0;
      for (const [type, count] of Object.entries(typeCount)) {
        if (count > maxCount) {
          maxCount = count;
          stats.mostPopularType = type;
        }
      }

      return stats;
    } catch (error) {
      console.error('[ConsistencyChallenge] Stats error:', error);
      return null;
    }
  }
}

// Create singleton instance
const consistencyChallengeService = new ConsistencyChallengeService();

module.exports = consistencyChallengeService;