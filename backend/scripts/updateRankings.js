// scripts/updateRankings.js
const mongoose = require('mongoose');
const RankingSystem = require('../services/rankingSystem');
require('dotenv').config();

async function updateAllRankings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const periods = ['weekly', 'monthly', 'allTime'];
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    
    for (const period of periods) {
      console.log(`\nUpdating ${period} rankings...`);
      
      for (const muscleGroup of muscleGroups) {
        const count = await RankingSystem.updateGlobalRankings(period, muscleGroup);
        console.log(`  ${muscleGroup}: Updated ${count} rankings`);
      }
    }
    
    console.log('\nAll rankings updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error updating rankings:', error);
    process.exit(1);
  }
}

// This can be run as a cron job
if (require.main === module) {
  updateAllRankings();
}

module.exports = updateAllRankings;