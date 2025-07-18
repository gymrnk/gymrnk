// scripts/recalculateAllRankings.js
const mongoose = require('mongoose');
const RankingSystem = require('../services/rankingSystem');
require('dotenv').config();

async function recalculateAllRankings() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name');
    
    console.log('Starting global ranking recalculation...');
    
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    const periods = ['weekly', 'monthly', 'allTime'];
    
    let totalUpdated = 0;
    
    for (const period of periods) {
      for (const muscleGroup of muscleGroups) {
        console.log(`Updating ${period} rankings for ${muscleGroup}...`);
        const count = await RankingSystem.updateGlobalRankings(period, muscleGroup);
        console.log(`  Updated ${count} rankings`);
        totalUpdated += count;
      }
    }
    
    console.log(`\nCompleted! Updated ${totalUpdated} total rankings.`);
    
  } catch (error) {
    console.error('Error recalculating rankings:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

// Run the script
recalculateAllRankings();