// scripts/fixZeroScores.js
// Run this script to recalculate scores for all existing workouts

const mongoose = require('mongoose');
const Workout = require('../models/Workout');
const User = require('../models/User');
const RankingSystem = require('../services/rankingSystem');
require('dotenv').config();

async function fixZeroScores() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find all workouts with zero or missing scores
    const workoutsToFix = await Workout.find({
      $or: [
        { 'hypertrophyScore.total': 0 },
        { 'hypertrophyScore.total': null },
        { hypertrophyScore: { $exists: false } }
      ]
    }).populate('exercises.exercise exercises.exerciseId');
    
    console.log(`Found ${workoutsToFix.length} workouts to fix`);
    
    let fixed = 0;
    let failed = 0;
    
    // Process each workout
    for (const workout of workoutsToFix) {
      try {
        console.log(`Processing workout ${workout._id} from ${workout.date}`);
        
        // Recalculate score
        const scores = await RankingSystem.calculateWorkoutScore(workout);
        
        if (scores.total > 0) {
          workout.hypertrophyScore = scores;
          await workout.save();
          fixed++;
          console.log(`Fixed workout ${workout._id} - Total score: ${scores.total}`);
        } else {
          console.log(`Workout ${workout._id} still has 0 score - check data integrity`);
          // Log workout details for debugging
          console.log('Workout exercises:', JSON.stringify(workout.exercises, null, 2));
          failed++;
        }
      } catch (error) {
        console.error(`Error fixing workout ${workout._id}:`, error);
        failed++;
      }
    }
    
    console.log(`\nFixed ${fixed} workouts, ${failed} failed`);
    
    // Update all user rankings
    console.log('\nUpdating user rankings...');
    const users = await User.find({});
    
    for (const user of users) {
      try {
        await RankingSystem.updateUserRankings(user._id, 'weekly');
        await RankingSystem.updateUserRankings(user._id, 'monthly');
        await RankingSystem.updateUserRankings(user._id, 'allTime');
        console.log(`Updated rankings for user ${user.username}`);
      } catch (error) {
        console.error(`Error updating rankings for user ${user._id}:`, error);
      }
    }
    
    // Update global rankings
    console.log('\nUpdating global rankings...');
    const periods = ['weekly', 'monthly', 'allTime'];
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    
    for (const period of periods) {
      for (const muscleGroup of muscleGroups) {
        const count = await RankingSystem.updateGlobalRankings(period, muscleGroup);
        console.log(`Updated ${count} rankings for ${muscleGroup} (${period})`);
      }
    }
    
    console.log('\nMigration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixZeroScores();