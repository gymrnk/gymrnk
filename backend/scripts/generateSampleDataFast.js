// backend/scripts/generateSampleDataFast.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const Workout = require('../models/Workout');
const Post = require('../models/Post');
const Ranking = require('../models/Ranking');
const RankingSystem = require('../services/rankingSystem');
require('dotenv').config();

// Random data generators
const firstNames = ['John', 'Sarah', 'Mike', 'Emma', 'Alex', 'Chris', 'Lisa', 'David', 'Jessica', 'Ryan', 'Ashley', 'James', 'Emily', 'Daniel', 'Olivia', 'Matthew', 'Sophia', 'Andrew', 'Isabella', 'Joseph', 'Mia', 'William', 'Charlotte', 'Benjamin', 'Amelia', 'Jacob', 'Harper', 'Michael', 'Evelyn', 'Joshua', 'Abigail', 'Ethan', 'Ella', 'Alexander', 'Madison', 'Nicholas', 'Grace', 'Tyler', 'Chloe', 'Brandon', 'Victoria', 'Kevin', 'Lily', 'Justin', 'Hannah', 'Robert', 'Natalie', 'Thomas', 'Samantha', 'Nathan', 'Mark', 'Paul', 'Steven', 'Brian', 'George', 'Kenneth', 'Edward', 'Ronald', 'Anthony', 'Charles', 'Christopher', 'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Margaret', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Kimberly', 'Deborah', 'Amy', 'Angela', 'Jason', 'Jeff', 'Kyle', 'Eric', 'Aaron', 'Adam', 'Jose', 'Henry', 'Jerry', 'Carl', 'Arthur', 'Harold', 'Keith', 'Frank', 'Jeremy', 'Lawrence', 'Sean', 'Louis', 'Patrick', 'Scott'];

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez', 'Powell'];

const bioTemplates = [
  'Fitness enthusiast | {experience} years experience | {goal}',
  'Personal Trainer | {specialty} | Helping others reach their goals 💪',
  '{sport} athlete | Training for {years} years | {motto}',
  'Gym addict | {goal} | {motto}',
  'Bodybuilder | {division} | {experience} years of dedication',
  'Powerlifter | Current PR: {pr}lbs | {motto}',
  'CrossFit athlete | {box} | {motto}',
  'Marathon runner | {time} PR | {goal}',
  'Fitness journey started {years} years ago | {progress} | {motto}',
  'Nutrition coach | {specialty} | {goal}'
];

const specialties = ['Strength Training', 'Weight Loss', 'Muscle Building', 'Endurance', 'HIIT', 'Yoga', 'Mobility', 'Nutrition', 'Competition Prep', 'Functional Fitness'];
const sports = ['Basketball', 'Football', 'Soccer', 'Swimming', 'Track', 'Wrestling', 'Boxing', 'MMA', 'Tennis', 'Baseball'];
const divisions = ['Classic Physique', 'Men\'s Physique', 'Bodybuilding', 'Bikini', 'Figure', 'Wellness'];
const goals = ['Build Muscle', 'Lose Weight', 'Increase Strength', 'Improve Endurance', 'Get Shredded', 'Bulk Up', 'Tone Up', 'Stay Healthy', 'Competition Prep'];
const mottos = ['No excuses!', 'Beast mode 🔥', 'Consistency is key', 'Trust the process', 'One day at a time', 'Never give up', 'Push your limits', 'Stronger every day', 'Mind over matter', 'Pain is temporary'];

// Post templates
const postTemplates = [
  "Just crushed {workout}! 🦵 New PR on {exercise} - {weight}lbs for {reps} reps! The grind never stops 💪",
  "Morning workout complete! Nothing beats starting the day with some heavy {exercise}.",
  "{muscle} destroyed! 💀 That pump was insane. Who else is hitting {workout} today?",
  "Feeling stronger than ever! Hit {sets} sets of {exercise} at {weight}lbs 🔥",
  "Rest day thoughts: {motivation} Remember why you started! 💯",
  "Meal prep Sunday! {meals} ready for the week. Nutrition is key! 🥗",
  "Form check video! Working on my {exercise} technique. Any tips? 🤔",
  "{cardio} cardio session done! {duration} minutes of pure sweat 💦",
  "Progress pic! {timeframe} transformation. Still work to do but proud of how far I've come!",
  "Late night gym session! Sometimes you gotta get it done when you can 🌙",
  "Training partner appreciation post! @{friend} always pushes me to be better 👊",
  "New program starts today! Excited to see where {weeks} weeks takes me 📈",
  "Recovery is just as important as training. {recovery} today! 🧘‍♂️",
  "Competed today and placed {place}! All the hard work paying off 🏆",
  "Sometimes you fail, but that's how you grow. Missed my {exercise} PR today but I'll be back!",
  "Shoutout to my coach for the killer {workout} workout! I'm dead 😵",
  "Consistency check: {days} days in a row! Who's with me? 🔥",
  "New gym, who dis? Just joined {gym} and loving the vibe! 💪",
  "Deload week but still putting in work. Listen to your body! 🙏",
  "That post-workout feeling hits different! {emoji} What did you train today?"
];

const exercises = ['squats', 'deadlifts', 'bench press', 'overhead press', 'rows', 'pull-ups', 'dips', 'curls', 'tricep extensions', 'leg press'];
const workouts = ['leg day', 'push day', 'pull day', 'chest day', 'back day', 'shoulder day', 'arm day', 'full body'];
const muscles = ['Chest and triceps', 'Back and biceps', 'Legs', 'Shoulders', 'Arms', 'Core'];
const cardioTypes = ['HIIT', 'Steady state', 'Interval', 'Stairmaster', 'Bike', 'Treadmill'];
const recoveryTypes = ['Yoga session', 'Stretching', 'Foam rolling', 'Massage', 'Ice bath', 'Sauna'];
const gyms = ['Iron Paradise', 'The Dungeon', '24/7 Fitness', 'Gold\'s Gym', 'Anytime Fitness', 'Planet Fitness'];
const emojis = ['💪', '🔥', '💯', '🦾', '⚡', '🎯', '🚀', '💥', '👊', '🏋️‍♂️'];

function generateUsername(firstName, lastName, index, usedUsernames) {
  const formats = [
    () => `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    () => `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    () => `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    () => `${firstName.toLowerCase()}${Math.floor(Math.random() * 1000)}`,
    () => `${firstName.toLowerCase()}_fit`,
    () => `${firstName.toLowerCase()}_gains`,
    () => `${firstName.toLowerCase()}_lifts`,
    () => `${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}`,
    () => `fit_${firstName.toLowerCase()}`,
    () => `${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}${Math.floor(Math.random() * 1000)}`,
    () => `gym_${firstName.toLowerCase()}`,
    () => `${firstName.toLowerCase()}_strong`,
    () => `${firstName.toLowerCase()}_athlete`,
    () => `the_${firstName.toLowerCase()}`,
    () => `${firstName.toLowerCase()}_fitness`,
    () => `${lastName.toLowerCase()}_fit${Math.floor(Math.random() * 100)}`,
    () => `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`,
    () => `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}`
  ];
  
  let username;
  let attempts = 0;
  
  do {
    const format = formats[Math.floor(Math.random() * formats.length)];
    const base = format();
    username = attempts === 0 ? base : `${base}${index + attempts}`;
    attempts++;
  } while (usedUsernames.has(username) && attempts < 100);
  
  // Fallback to ensure uniqueness
  if (usedUsernames.has(username)) {
    username = `user${index}_${Date.now()}`;
  }
  
  usedUsernames.add(username);
  return username;
}

function generateBio() {
  const template = bioTemplates[Math.floor(Math.random() * bioTemplates.length)];
  return template
    .replace('{experience}', Math.floor(Math.random() * 10) + 1)
    .replace('{years}', Math.floor(Math.random() * 10) + 1)
    .replace('{goal}', goals[Math.floor(Math.random() * goals.length)])
    .replace('{specialty}', specialties[Math.floor(Math.random() * specialties.length)])
    .replace('{sport}', sports[Math.floor(Math.random() * sports.length)])
    .replace('{division}', divisions[Math.floor(Math.random() * divisions.length)])
    .replace('{motto}', mottos[Math.floor(Math.random() * mottos.length)])
    .replace('{pr}', Math.floor(Math.random() * 200) + 300)
    .replace('{box}', `Box ${Math.floor(Math.random() * 100)}`)
    .replace('{time}', `${Math.floor(Math.random() * 2) + 2}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`)
    .replace('{progress}', `Down ${Math.floor(Math.random() * 50) + 10}lbs`);
}

function generatePostContent(users) {
  const template = postTemplates[Math.floor(Math.random() * postTemplates.length)];
  const friend = users.length > 0 ? users[Math.floor(Math.random() * Math.min(50, users.length))] : null;
  
  return template
    .replace('{workout}', workouts[Math.floor(Math.random() * workouts.length)])
    .replace('{exercise}', exercises[Math.floor(Math.random() * exercises.length)])
    .replace('{muscle}', muscles[Math.floor(Math.random() * muscles.length)])
    .replace('{weight}', Math.floor(Math.random() * 200) + 100)
    .replace('{reps}', Math.floor(Math.random() * 12) + 3)
    .replace('{sets}', Math.floor(Math.random() * 3) + 3)
    .replace('{motivation}', mottos[Math.floor(Math.random() * mottos.length)])
    .replace('{meals}', Math.floor(Math.random() * 20) + 10)
    .replace('{cardio}', cardioTypes[Math.floor(Math.random() * cardioTypes.length)])
    .replace('{duration}', Math.floor(Math.random() * 30) + 20)
    .replace('{timeframe}', `${Math.floor(Math.random() * 12) + 1} month`)
    .replace('{friend}', friend ? friend.username : 'fitbuddy')
    .replace('{weeks}', Math.floor(Math.random() * 8) + 4)
    .replace('{recovery}', recoveryTypes[Math.floor(Math.random() * recoveryTypes.length)])
    .replace('{place}', Math.floor(Math.random() * 5) + 1)
    .replace('{days}', Math.floor(Math.random() * 100) + 30)
    .replace('{gym}', gyms[Math.floor(Math.random() * gyms.length)])
    .replace('{emoji}', emojis[Math.floor(Math.random() * emojis.length)]);
}

function generateWorkoutData(exercises, userId, daysAgo) {
  const muscleGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
  const selectedMuscle = muscleGroups[Math.floor(Math.random() * muscleGroups.length)];
  
  const muscleExercises = exercises.filter(e => e.muscleGroup === selectedMuscle);
  const numExercises = Math.min(Math.floor(Math.random() * 3) + 2, muscleExercises.length);
  
  const workoutExercises = [];
  const usedExercises = new Set();
  
  for (let i = 0; i < numExercises; i++) {
    let exercise;
    do {
      exercise = muscleExercises[Math.floor(Math.random() * muscleExercises.length)];
    } while (usedExercises.has(exercise._id.toString()) && usedExercises.size < muscleExercises.length);
    
    usedExercises.add(exercise._id.toString());
    
    const sets = [];
    const numSets = Math.floor(Math.random() * 3) + 3;
    const baseWeight = Math.floor(Math.random() * 100) + 20;
    const baseReps = Math.floor(Math.random() * 8) + 6;
    
    for (let j = 0; j < numSets; j++) {
      sets.push({
        reps: Math.max(1, baseReps - j),
        weight: Math.max(20, baseWeight + (j * 5)),
        restTime: 60 + Math.floor(Math.random() * 60),
        rpe: 6 + Math.floor(Math.random() * 4)
      });
    }
    
    workoutExercises.push({
      exercise: exercise._id,
      sets
    });
  }
  
  const workoutDate = new Date();
  workoutDate.setDate(workoutDate.getDate() - daysAgo);
  
  const baseScore = 500 + Math.floor(Math.random() * 2500);
  
  return {
    user: userId,
    date: workoutDate,
    exercises: workoutExercises,
    duration: Math.floor(Math.random() * 40) + 30,
    hypertrophyScore: {
      total: baseScore,
      byMuscleGroup: {
        chest: selectedMuscle === 'chest' ? Math.floor(baseScore * 0.7) : Math.floor(Math.random() * 100),
        back: selectedMuscle === 'back' ? Math.floor(baseScore * 0.7) : Math.floor(Math.random() * 100),
        shoulders: selectedMuscle === 'shoulders' ? Math.floor(baseScore * 0.7) : Math.floor(Math.random() * 100),
        biceps: selectedMuscle === 'biceps' ? Math.floor(baseScore * 0.7) : Math.floor(Math.random() * 100),
        triceps: selectedMuscle === 'triceps' ? Math.floor(baseScore * 0.7) : Math.floor(Math.random() * 100),
        legs: selectedMuscle === 'legs' ? Math.floor(baseScore * 0.7) : Math.floor(Math.random() * 100),
        abs: selectedMuscle === 'abs' ? Math.floor(baseScore * 0.7) : Math.floor(Math.random() * 100)
      }
    }
  };
}

async function generateSampleData() {
  try {
    console.log('🚀 Starting large-scale sample data generation...\n');
    console.log('⚠️  This will create 1000 users and may take a few minutes...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Workout.deleteMany({}),
      Ranking.deleteMany({})
    ]);
    console.log('✅ Data cleared\n');
    
    // Get exercises
    const exercises = await Exercise.find();
    if (exercises.length === 0) {
      console.error('❌ No exercises found. Please run npm run seed first.');
      process.exit(1);
    }
    console.log(`✅ Found ${exercises.length} exercises\n`);
    
    // Generate users
    console.log('👥 Creating 1000 users...');
    const createdUsers = [];
    const userCount = 1000;
    const usedUsernames = new Set();
    
    // Create johndoe first
    usedUsernames.add('johndoe');
    const johndoe = new User({
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      profile: {
        displayName: 'John Doe',
        bio: 'Fitness enthusiast | Powerlifter | 5 years experience',
        height: 180,
        weight: 85,
        fitnessGoals: ['Build Muscle', 'Increase Strength']
      },
      rankings: {
        overall: { tier: 'Iron', division: 5, points: 0 },
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
    await johndoe.save();
    createdUsers.push(johndoe);
    console.log('  ✅ Created required user: johndoe');
    
    // Create remaining users
    for (let i = 1; i < userCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = generateUsername(firstName, lastName, i, usedUsernames);
      
      const user = new User({
        username,
        email: `${username}@example.com`,
        password: 'password123',
        profile: {
          displayName: `${firstName} ${lastName}`,
          bio: generateBio(),
          height: 150 + Math.floor(Math.random() * 50),
          weight: 50 + Math.floor(Math.random() * 60),
          fitnessGoals: [goals[Math.floor(Math.random() * goals.length)], goals[Math.floor(Math.random() * goals.length)]].filter((v, i, a) => a.indexOf(v) === i)
        },
        rankings: {
          overall: { tier: 'Iron', division: 5, points: 0 },
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
      
      try {
        await user.save();
        createdUsers.push(user);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Duplicate username detected: ${username}, skipping...`);
          i--; // Retry this index with a different username
          continue;
        }
        throw error;
      }
      
      if (i % 100 === 0) {
        console.log(`  ✅ Created ${i} users...`);
      }
    }
    console.log(`  ✅ All ${createdUsers.length} users created successfully`);
    
    // Create random friendships
    console.log('\n👫 Creating random friendships...');
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const numFriends = Math.floor(Math.random() * 20) + 5; // 5-25 friends per user
      const friendIndices = new Set();
      
      while (friendIndices.size < numFriends && friendIndices.size < createdUsers.length - 1) {
        const friendIndex = Math.floor(Math.random() * createdUsers.length);
        if (friendIndex !== i) {
          friendIndices.add(friendIndex);
        }
      }
      
      for (const friendIndex of friendIndices) {
        const friend = createdUsers[friendIndex];
        if (!user.friends.includes(friend._id)) {
          user.friends.push(friend._id);
        }
        if (!friend.friends.includes(user._id)) {
          friend.friends.push(user._id);
        }
      }
      
      if (i % 100 === 0) {
        console.log(`  ✅ Created friendships for ${i} users...`);
      }
    }
    
    // Save all friend connections
    console.log('  💾 Saving friend connections...');
    await Promise.all(createdUsers.map(u => u.save()));
    console.log('  ✅ All friendships created');
    
    // Create workouts (3-10 per user)
    console.log('\n🏋️ Creating workouts...');
    const allWorkouts = [];
    
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const numWorkouts = Math.floor(Math.random() * 8) + 3; // 3-10 workouts per user
      
      for (let j = 0; j < numWorkouts; j++) {
        const daysAgo = Math.floor(Math.random() * 30); // Last 30 days
        const workoutData = generateWorkoutData(exercises, user._id, daysAgo);
        const workout = new Workout(workoutData);
        await workout.save();
        allWorkouts.push(workout);
      }
      
      if (i % 100 === 0) {
        console.log(`  ✅ Created workouts for ${i} users...`);
      }
    }
    console.log(`  ✅ Created ${allWorkouts.length} total workouts`);
    
    // Create 1000 posts distributed among users
    console.log('\n📝 Creating 1000 posts...');
    const postCount = 1000;
    
    for (let i = 0; i < postCount; i++) {
      const user = createdUsers[Math.floor(Math.random() * createdUsers.length)];
      const postDate = new Date();
      postDate.setDate(postDate.getDate() - Math.floor(Math.random() * 30));
      
      const post = new Post({
        author: user._id,
        content: {
          text: generatePostContent(createdUsers),
          images: []
        },
        reactions: {
          fire: Math.floor(Math.random() * 50),
          muscle: Math.floor(Math.random() * 40),
          thumbsUp: Math.floor(Math.random() * 60),
          crown: Math.floor(Math.random() * 10)
        },
        visibility: 'public',
        createdAt: postDate
      });
      
      await post.save();
      
      if (i % 100 === 0) {
        console.log(`  ✅ Created ${i} posts...`);
      }
    }
    console.log(`  ✅ All ${postCount} posts created`);
    
    // Quick ranking update
    console.log('\n🏆 Updating rankings...');
    console.log('  ⚠️  This may take a moment with 1000 users...');
    
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    const periods = ['weekly', 'monthly', 'allTime'];
    
    for (const period of periods) {
      console.log(`  📊 Processing ${period} rankings...`);
      
      for (const muscleGroup of muscleGroups) {
        // Get all users and their scores
        const userScores = [];
        
        for (const user of createdUsers) {
          let score = 0;
          
          // Sum up scores from workouts
          const userWorkouts = allWorkouts.filter(w => w.user.equals(user._id));
          
          if (muscleGroup === 'overall') {
            score = userWorkouts.reduce((sum, w) => sum + (w.hypertrophyScore?.total || 0), 0);
          } else {
            score = userWorkouts.reduce((sum, w) => sum + (w.hypertrophyScore?.byMuscleGroup?.[muscleGroup] || 0), 0);
          }
          
          userScores.push({ user, score });
        }
        
        // Sort by score
        userScores.sort((a, b) => b.score - a.score);
        
        // Create rankings in batches
        const rankingBatch = [];
        for (let i = 0; i < userScores.length; i++) {
          const { user, score } = userScores[i];
          const rank = i + 1;
          const percentile = rank / userScores.length;
          const { tier, division } = RankingSystem.getTierAndDivision(percentile);
          
          rankingBatch.push({
            user: user._id,
            period,
            muscleGroup,
            score,
            rank,
            percentile,
            tier,
            division
          });
          
          // Update user's ranking
          if (muscleGroup === 'overall') {
            user.rankings.overall = { tier, division, points: score };
          } else {
            user.rankings.muscleGroups[muscleGroup] = { tier, division, points: score };
          }
        }
        
        // Insert rankings in batch
        await Ranking.insertMany(rankingBatch);
      }
      
      // Save all users
      await Promise.all(createdUsers.map(u => u.save()));
      console.log(`  ✅ ${period} rankings complete`);
    }
    
    console.log('\n✨ Large-scale sample data generation complete!\n');
    console.log('📋 Summary:');
    console.log(`  • ${createdUsers.length} users created`);
    console.log(`  • ${allWorkouts.length} workouts created`);
    console.log(`  • ${postCount} posts created`);
    console.log(`  • Rankings calculated for all periods and muscle groups\n`);
    
    console.log('🔑 Key login credentials:');
    console.log('  • Username: johndoe, Password: password123');
    console.log('  • All other users have password: password123\n');
    
    console.log('📊 Sample other usernames:');
    for (let i = 1; i < Math.min(10, createdUsers.length); i++) {
      console.log(`  • ${createdUsers[i].username}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

generateSampleData();