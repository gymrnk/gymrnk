// scripts/fixRollingWindowRankings.js
// Run this once to fix all current rankings: node scripts/fixRollingWindowRankings.js

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Workout = require('../models/Workout');
const Ranking = require('../models/Ranking');
const User = require('../models/User');
const RankingSystem = require('../services/rankingSystem');

async function fixAllRankings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const now = new Date();
    console.log(`Current time: ${now}`);
    console.log('Starting to fix all rolling window rankings...\n');

    // Step 1: Clear all weekly and monthly rankings (they'll be recalculated)
    console.log('Step 1: Clearing existing weekly and monthly rankings...');
    const deleteResult = await Ranking.deleteMany({
      period: { $in: ['weekly', 'monthly'] }
    });
    console.log(`Deleted ${deleteResult.deletedCount} rankings\n`);

    // Step 2: Get all active users
    console.log('Step 2: Finding all active users...');
    const users = await User.find({ 
      isActive: { $ne: false } 
    }).select('_id username');
    console.log(`Found ${users.length} active users\n`);

    // Step 3: Recalculate rankings for each user
    console.log('Step 3: Recalculating rankings for each user...');
    
    let processedCount = 0;
    const batchSize = 20;
    
    // Get date boundaries
    const weeklyBoundary = RankingSystem.getDateBoundaries('weekly');
    const monthlyBoundary = RankingSystem.getDateBoundaries('monthly');
    
    console.log(`Weekly window: ${weeklyBoundary.start} to ${weeklyBoundary.end}`);
    console.log(`Monthly window: ${monthlyBoundary.start} to ${monthlyBoundary.end}\n`);

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (user) => {
          try {
            // Process weekly rankings
            const weeklyWorkouts = await Workout.find({
              user: user._id,
              date: { 
                $gte: weeklyBoundary.start, 
                $lte: weeklyBoundary.end 
              }
            }).populate('exercises.exercise exercises.exerciseId');

            const weeklyScores = await calculateAggregateScores(weeklyWorkouts);
            await createRankings(user._id, 'weekly', weeklyScores);

            // Process monthly rankings
            const monthlyWorkouts = await Workout.find({
              user: user._id,
              date: { 
                $gte: monthlyBoundary.start, 
                $lte: monthlyBoundary.end 
              }
            }).populate('exercises.exercise exercises.exerciseId');

            const monthlyScores = await calculateAggregateScores(monthlyWorkouts);
            await createRankings(user._id, 'monthly', monthlyScores);

            console.log(`✓ ${user.username}: Weekly=${weeklyScores.overall.toFixed(0)}, Monthly=${monthlyScores.overall.toFixed(0)}`);
          } catch (error) {
            console.error(`✗ Error processing user ${user.username}:`, error.message);
          }
        })
      );
      
      processedCount += batch.length;
      console.log(`Progress: ${processedCount}/${users.length} users processed`);
    }

    console.log('\nStep 4: Updating global rankings...');
    
    // Update global rankings for all periods and muscle groups
    const periods = ['weekly', 'monthly'];
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    
    for (const period of periods) {
      console.log(`\nUpdating ${period} rankings...`);
      
      for (let i = 0; i < muscleGroups.length; i += 4) {
        const batch = muscleGroups.slice(i, i + 4);
        
        await Promise.all(
          batch.map(async (muscleGroup) => {
            const count = await RankingSystem.updateGlobalRankingsOptimized(period, muscleGroup);
            console.log(`  - ${muscleGroup}: ${count} rankings updated`);
          })
        );
      }
    }

    // Step 5: Clear all caches
    console.log('\nStep 5: Clearing caches...');
    RankingSystem.clearCache();

    console.log('\n✅ All rankings have been fixed!');
    console.log('The rolling window is now properly enforced.');
    
    // Show some statistics
    const weeklyCount = await Ranking.countDocuments({ period: 'weekly', muscleGroup: 'overall' });
    const monthlyCount = await Ranking.countDocuments({ period: 'monthly', muscleGroup: 'overall' });
    
    console.log(`\nFinal statistics:`);
    console.log(`- Active users with weekly rankings: ${weeklyCount}`);
    console.log(`- Active users with monthly rankings: ${monthlyCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

async function calculateAggregateScores(workouts) {
  const scores = {
    overall: 0,
    chest: 0,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    legs: 0,
    abs: 0
  };

  for (const workout of workouts) {
    // Calculate score if not already calculated
    if (!workout.hypertrophyScore || !workout.hypertrophyScore.total) {
      const calculatedScores = await RankingSystem.calculateWorkoutScore(workout);
      workout.hypertrophyScore = calculatedScores;
      await workout.save();
    }

    if (workout.hypertrophyScore && workout.hypertrophyScore.total > 0) {
      scores.overall += workout.hypertrophyScore.total;
      
      for (const [muscle, score] of Object.entries(workout.hypertrophyScore.byMuscleGroup)) {
        if (scores.hasOwnProperty(muscle)) {
          scores[muscle] += score || 0;
        }
      }
    }
  }

  return scores;
}

async function createRankings(userId, period, scores) {
  const bulkOps = [];
  const now = new Date();

  for (const [muscleGroup, score] of Object.entries(scores)) {
    if (score > 0) {
      bulkOps.push({
        updateOne: {
          filter: { user: userId, period, muscleGroup },
          update: { 
            score,
            calculatedAt: now
          },
          upsert: true
        }
      });
    }
  }

  if (bulkOps.length > 0) {
    await Ranking.bulkWrite(bulkOps);
  }
}

// Run the fix
fixAllRankings();