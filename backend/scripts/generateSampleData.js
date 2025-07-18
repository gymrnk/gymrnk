// backend/scripts/generateSampleData.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const Workout = require('../models/Workout');
const Post = require('../models/Post');
const Ranking = require('../models/Ranking');
const RankingSystem = require('../services/rankingSystem');
require('dotenv').config();

// Sample user data
const sampleUsers = [
  {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'password123',
    profile: {
      displayName: 'John Doe',
      bio: 'Fitness enthusiast | Powerlifter | 5 years experience',
      height: 180,
      weight: 85,
      fitnessGoals: ['Build Muscle', 'Increase Strength']
    }
  },
  {
    username: 'sarahfit',
    email: 'sarah@example.com',
    password: 'password123',
    profile: {
      displayName: 'Sarah Johnson',
      bio: 'Personal Trainer | Nutrition Coach | Love helping others reach their goals 💪',
      height: 165,
      weight: 60,
      fitnessGoals: ['Tone Up', 'Build Endurance']
    }
  },
  {
    username: 'mikegains',
    email: 'mike@example.com',
    password: 'password123',
    profile: {
      displayName: 'Mike Wilson',
      bio: 'Bodybuilder | Classic Physique | Training for 10 years',
      height: 175,
      weight: 80,
      fitnessGoals: ['Build Muscle', 'Competition Prep']
    }
  },
  {
    username: 'emmastrong',
    email: 'emma@example.com',
    password: 'password123',
    profile: {
      displayName: 'Emma Davis',
      bio: 'CrossFit athlete | Olympic lifting | Functional fitness',
      height: 170,
      weight: 65,
      fitnessGoals: ['Increase Strength', 'Athletic Performance']
    }
  },
  {
    username: 'alexlifts',
    email: 'alex@example.com',
    password: 'password123',
    profile: {
      displayName: 'Alex Chen',
      bio: 'Natural bodybuilding | Science-based training | PhD in Exercise Science',
      height: 172,
      weight: 75,
      fitnessGoals: ['Build Muscle', 'Stay Lean']
    }
  },
  {
    username: 'lisafit',
    email: 'lisa@example.com',
    password: 'password123',
    profile: {
      displayName: 'Lisa Anderson',
      bio: 'Yoga instructor | Pilates | Mind-body connection',
      height: 168,
      weight: 58,
      fitnessGoals: ['Flexibility', 'Core Strength']
    }
  },
  {
    username: 'davidpower',
    email: 'david@example.com',
    password: 'password123',
    profile: {
      displayName: 'David Brown',
      bio: 'Strongman competitor | Deadlift specialist | 600lb club',
      height: 190,
      weight: 110,
      fitnessGoals: ['Max Strength', 'Competition']
    }
  },
  {
    username: 'rachelruns',
    email: 'rachel@example.com',
    password: 'password123',
    profile: {
      displayName: 'Rachel Green',
      bio: 'Marathon runner | Hybrid athlete | Running + Lifting',
      height: 162,
      weight: 55,
      fitnessGoals: ['Endurance', 'Maintain Muscle']
    }
  }
];

// Sample post content
const postTemplates = [
  {
    text: "Just crushed leg day! 🦵 New PR on squats - 315lbs for 5 reps! The grind never stops 💪",
    reactions: { fire: 12, muscle: 8, thumbsUp: 15, crown: 3 }
  },
  {
    text: "Morning workout complete! Nothing beats starting the day with some heavy deadlifts. Remember, discipline beats motivation every time.",
    reactions: { fire: 8, muscle: 10, thumbsUp: 20, crown: 2 }
  },
  {
    text: "Form check: How's my bench press looking? Always trying to improve! Any tips appreciated 🙏",
    reactions: { fire: 5, muscle: 6, thumbsUp: 12, crown: 1 }
  },
  {
    text: "Chest and triceps destroyed! 💀 That pump was insane. Who else is hitting push day today?",
    reactions: { fire: 10, muscle: 15, thumbsUp: 8, crown: 4 }
  },
  {
    text: "Rest day thoughts: Remember that progress isn't just made in the gym. Recovery, nutrition, and sleep are just as important! 😴",
    reactions: { fire: 3, muscle: 2, thumbsUp: 25, crown: 1 }
  },
  {
    text: "Back day best day! Pull-ups are getting easier - managed 3 sets of 12 today. Six months ago I couldn't do one!",
    reactions: { fire: 20, muscle: 12, thumbsUp: 30, crown: 5 }
  },
  {
    text: "New gym PR alert! 🚨 405lb deadlift finally happened! Thank you all for the support and tips!",
    reactions: { fire: 25, muscle: 20, thumbsUp: 35, crown: 10 }
  },
  {
    text: "Accountability post: Missed the gym for 3 days. Getting back on track today. We all have setbacks, what matters is bouncing back! 💯",
    reactions: { fire: 8, muscle: 5, thumbsUp: 40, crown: 2 }
  }
];

// Generate random workout data
function generateWorkoutData(exercises, userId, daysAgo) {
  const muscleGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
  const selectedMuscle = muscleGroups[Math.floor(Math.random() * muscleGroups.length)];
  
  // Get exercises for this muscle group
  const muscleExercises = exercises.filter(e => e.muscleGroup === selectedMuscle);
  const numExercises = Math.floor(Math.random() * 3) + 3; // 3-5 exercises
  
  const workoutExercises = [];
  const usedExercises = new Set();
  
  for (let i = 0; i < numExercises && i < muscleExercises.length; i++) {
    let exercise;
    do {
      exercise = muscleExercises[Math.floor(Math.random() * muscleExercises.length)];
    } while (usedExercises.has(exercise._id.toString()));
    
    usedExercises.add(exercise._id.toString());
    
    const sets = [];
    const numSets = Math.floor(Math.random() * 2) + 3; // 3-4 sets
    
    // Generate progressive sets
    const baseWeight = Math.floor(Math.random() * 80) + 20; // 20-100kg
    const baseReps = Math.floor(Math.random() * 8) + 8; // 8-15 reps
    
    for (let j = 0; j < numSets; j++) {
      sets.push({
        reps: baseReps - Math.floor(Math.random() * 3),
        weight: baseWeight + (j * 5),
        restTime: 90,
        tempo: Math.random() > 0.5 ? '2-0-2-0' : null,
        rpe: 7 + Math.floor(Math.random() * 3)
      });
    }
    
    workoutExercises.push({
      exercise: exercise._id,
      sets,
      notes: Math.random() > 0.7 ? 'Felt strong today!' : null
    });
  }
  
  const workoutDate = new Date();
  workoutDate.setDate(workoutDate.getDate() - daysAgo);
  
  return {
    user: userId,
    date: workoutDate,
    exercises: workoutExercises,
    duration: Math.floor(Math.random() * 30) + 45, // 45-75 minutes
    notes: Math.random() > 0.5 ? 'Great workout!' : null
  };
}

async function generateSampleData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing data (except exercises)
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Post.deleteMany({});
    await Workout.deleteMany({});
    await Ranking.deleteMany({});
    
    // Get exercises
    const exercises = await Exercise.find();
    if (exercises.length === 0) {
      console.error('No exercises found. Please run seedDatabase.js first.');
      process.exit(1);
    }
    
    console.log('Creating sample users...');
    const createdUsers = [];
    
    for (const userData of sampleUsers) {
      const user = new User({
        ...userData,
        rankings: {
          overall: {
            tier: 'Iron',
            division: 5,
            points: 0
          },
          muscleGroups: {
            chest: { tier: 'Iron', division: 5, points: 0 },
            back: { tier: 'Iron', division: 5, points: 0 },
            shoulders: { tier: 'Iron', division: 5, points: 0 },
            biceps: { tier: 'Iron', division: 5, points: 0 },
            triceps: { tier: 'Iron', division: 5, points: 0 },
            legs: { tier: 'Iron', division: 5, points: 0 },
            abs: { tier: 'Iron', division: 5, points: 0 }
          }
        }
      });
      
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.username}`);
    }
    
    // Create friendships
    console.log('\nCreating friendships...');
    // Make some users friends with each other
    const friendPairs = [
      [0, 1], [0, 2], [0, 3], // John friends with Sarah, Mike, Emma
      [1, 3], [1, 4], [1, 5], // Sarah friends with Emma, Alex, Lisa
      [2, 4], [2, 6],         // Mike friends with Alex, David
      [3, 5], [3, 7],         // Emma friends with Lisa, Rachel
      [4, 6], [4, 7],         // Alex friends with David, Rachel
      [5, 7],                 // Lisa friends with Rachel
      [6, 7]                  // David friends with Rachel
    ];
    
    for (const [idx1, idx2] of friendPairs) {
      createdUsers[idx1].friends.push(createdUsers[idx2]._id);
      createdUsers[idx2].friends.push(createdUsers[idx1]._id);
      await createdUsers[idx1].save();
      await createdUsers[idx2].save();
    }
    
    // Create workouts for each user
    console.log('\nCreating workouts...');
    const workouts = [];
    
    for (const user of createdUsers) {
      // Generate 10-20 workouts per user over the last 30 days
      const numWorkouts = Math.floor(Math.random() * 10) + 10;
      
      for (let i = 0; i < numWorkouts; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const workoutData = generateWorkoutData(exercises, user._id, daysAgo);
        
        const workout = new Workout(workoutData);
        
        // Calculate hypertrophy score
        const scores = await RankingSystem.calculateWorkoutScore(workout);
        workout.hypertrophyScore = scores;
        
        await workout.save();
        workouts.push(workout);
      }
      
      console.log(`Created ${numWorkouts} workouts for ${user.username}`);
    }
    
    // Create posts
    console.log('\nCreating posts...');
    const posts = [];
    
    for (const user of createdUsers) {
      // Each user creates 2-5 posts
      const numPosts = Math.floor(Math.random() * 4) + 2;
      
      for (let i = 0; i < numPosts; i++) {
        const template = postTemplates[Math.floor(Math.random() * postTemplates.length)];
        const daysAgo = Math.floor(Math.random() * 14); // Posts from last 2 weeks
        const postDate = new Date();
        postDate.setDate(postDate.getDate() - daysAgo);
        
        // Sometimes attach a workout to the post
        const attachWorkout = Math.random() > 0.5;
        const userWorkouts = workouts.filter(w => w.user.equals(user._id));
        
        const post = new Post({
          author: user._id,
          content: {
            text: template.text,
            images: [], // You can add sample image URLs here if needed
            workout: attachWorkout && userWorkouts.length > 0 ? 
              userWorkouts[Math.floor(Math.random() * userWorkouts.length)]._id : null
          },
          reactions: template.reactions,
          visibility: 'public',
          createdAt: postDate
        });
        
        // Add random likes from friends
        const friendIds = user.friends.slice(0, Math.floor(Math.random() * user.friends.length));
        post.likes = friendIds.map(friendId => ({
          user: friendId,
          createdAt: postDate
        }));
        
        // Add random comments
        if (Math.random() > 0.5 && user.friends.length > 0) {
          const commenter = createdUsers.find(u => u._id.equals(user.friends[0]));
          if (commenter) {
            post.comments.push({
              user: commenter._id,
              text: 'Great work! Keep it up! 💪',
              createdAt: new Date(postDate.getTime() + 3600000) // 1 hour later
            });
          }
        }
        
        await post.save();
        posts.push(post);
      }
      
      console.log(`Created ${numPosts} posts for ${user.username}`);
    }
    
    // Update rankings
    console.log('\nUpdating rankings...');
    for (const user of createdUsers) {
      await RankingSystem.updateUserRankings(user._id, 'weekly');
      await RankingSystem.updateUserRankings(user._id, 'monthly');
      await RankingSystem.updateUserRankings(user._id, 'allTime');
    }
    
    // Update global rankings
    const periods = ['weekly', 'monthly', 'allTime'];
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    
    for (const period of periods) {
      for (const muscleGroup of muscleGroups) {
        await RankingSystem.updateGlobalRankings(period, muscleGroup);
      }
    }
    
    console.log('\n✅ Sample data generation complete!');
    console.log(`Created ${createdUsers.length} users`);
    console.log(`Created ${workouts.length} workouts`);
    console.log(`Created ${posts.length} posts`);
    console.log('\nYou can now log in with any of these users:');
    console.log('Username: johndoe, Password: password123');
    console.log('Username: sarahfit, Password: password123');
    console.log('Username: mikegains, Password: password123');
    console.log('... and all other users use password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating sample data:', error);
    process.exit(1);
  }
}

// Run the script
generateSampleData();