// backend/scripts/debugDatabase.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Workout = require('../models/Workout');
require('dotenv').config();

async function debugDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Check users and their friends
    console.log('=== USERS ===');
    const users = await User.find().select('username email friends').populate('friends', 'username');
    
    for (const user of users) {
      console.log(`\n${user.username} (${user.email})`);
      console.log(`  Friends: ${user.friends.map(f => f.username).join(', ') || 'None'}`);
    }

    // Check posts
    console.log('\n\n=== POSTS ===');
    const posts = await Post.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`Total posts: ${await Post.countDocuments()}`);
    console.log('\nRecent posts:');
    for (const post of posts) {
      console.log(`  - ${post.author.username}: "${post.content.text?.substring(0, 50)}..." (${post.createdAt.toLocaleDateString()})`);
    }

    // Check workouts
    console.log('\n\n=== WORKOUTS ===');
    const workouts = await Workout.find()
      .populate('user', 'username')
      .sort({ date: -1 })
      .limit(5);
    
    console.log(`Total workouts: ${await Workout.countDocuments()}`);
    console.log('\nRecent workouts:');
    for (const workout of workouts) {
      console.log(`  - ${workout.user.username}: ${workout.exercises.length} exercises, ${workout.duration}min (${workout.date.toLocaleDateString()})`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugDatabase();