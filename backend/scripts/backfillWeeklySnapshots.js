// scripts/backfillWeeklySnapshots.js
const mongoose = require('mongoose');
const User = require('../models/User');
const WeeklySnapshot = require('../models/WeeklySnapshot');
const WeeklySnapshotService = require('../services/weeklySnapshotService');
require('dotenv').config();

async function backfillSnapshots() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all users
    const users = await User.find({});
    console.log(`Processing ${users.length} users...`);
    
    let totalSnapshots = 0;
    
    for (const user of users) {
      console.log(`\nProcessing user: ${user.username}`);
      
      // Calculate how many weeks since user joined
      const weeksSinceJoined = Math.floor(
        (new Date() - user.createdAt) / (1000 * 60 * 60 * 24 * 7)
      );
      
      console.log(`User has been active for ${weeksSinceJoined} weeks`);
      
      // Create snapshots for each week
      for (let week = 0; week <= weeksSinceJoined; week++) {
        const weekDate = new Date(user.createdAt);
        weekDate.setDate(weekDate.getDate() + (week * 7));
        
        // Get or create snapshot
        const snapshot = await WeeklySnapshotService.getOrCreateSnapshot(
          user._id, 
          weekDate
        );
        
        // Recalculate the snapshot from workouts
        await WeeklySnapshotService.recalculateSnapshot(snapshot);
        
        totalSnapshots++;
        
        if (totalSnapshots % 10 === 0) {
          console.log(`Created ${totalSnapshots} snapshots...`);
        }
      }
    }
    
    console.log(`\nBackfill complete! Created/updated ${totalSnapshots} snapshots`);
    
    // Finalize completed weeks
    const finalized = await WeeklySnapshotService.finalizeCompletedWeeks();
    console.log(`Finalized ${finalized} completed weeks`);
    
  } catch (error) {
    console.error('Error during backfill:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the backfill
backfillSnapshots();