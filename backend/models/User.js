const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profile: {
    displayName: String,
    bio: { type: String, maxlength: 500 },
    avatar: String, // S3 URL
    dateOfBirth: Date,
    height: Number, // in cm
    weight: Number, // in kg
    heightUnit: { type: String, default: 'cm' },
    weightUnit: { type: String, default: 'kg' },
    age: Number,
    gender: String,
    fitnessGoals: [String],
    primaryGoal: String,
    motivation: String,
    activityLevel: String,
    experienceLevel: String
  },
  rankings: {
    overall: {
      tier: { type: String, default: 'Iron' },
      division: { type: Number, default: 5 },
      points: { type: Number, default: 0 }
    },
    muscleGroups: {
      chest: { tier: String, division: Number, points: Number },
      back: { tier: String, division: Number, points: Number },
      shoulders: { tier: String, division: Number, points: Number },
      biceps: { tier: String, division: Number, points: Number },
      triceps: { tier: String, division: Number, points: Number },
      legs: { tier: String, division: Number, points: Number },
      abs: { tier: String, division: Number, points: Number }
    }
  },
  streak: {
    current: {
      count: { type: Number, default: 0 },
      startDate: Date,
      lastWorkoutDate: Date
    },
    longest: {
      count: { type: Number, default: 0 },
      startDate: Date,
      endDate: Date
    },
    timezone: { type: String, default: 'UTC' },
    history: [{
      date: Date,
      completed: Boolean
    }]
  },
  onboarding: {
    completed: { type: Boolean, default: false },
    completedAt: Date,
    skipped: { type: Boolean, default: false }
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: {
    sent: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    received: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  // New crew field
  crew: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crew',
    default: null
  },
  crewJoinedAt: Date,
  
  // NEW FIELD FOR OPTIMIZED RANKING SYSTEM
  lastWorkoutDate: {
    type: Date,
    index: true  // Important for efficient queries
  },
  
  isActive: { type: Boolean, default: true },
  lastActiveAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Add compound index for efficient smart ranking queries
userSchema.index({ lastWorkoutDate: 1, isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Set initial rankings for new users (everyone starts from 0)
userSchema.methods.setInitialRankings = function() {
  // Everyone starts at Iron V with 0 points
  const initialRanking = {
    tier: 'Iron',
    division: 5,
    points: 0
  };
  
  // Set overall ranking
  this.rankings.overall = {
    tier: initialRanking.tier,
    division: initialRanking.division,
    points: initialRanking.points
  };
  
  // Set muscle group rankings (same as overall)
  const muscleGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
  muscleGroups.forEach(group => {
    this.rankings.muscleGroups[group] = {
      tier: initialRanking.tier,
      division: initialRanking.division,
      points: initialRanking.points
    };
  });
  
  // Initialize streak data
  this.streak = {
    current: {
      count: 0,
      startDate: null,
      lastWorkoutDate: null
    },
    longest: {
      count: 0,
      startDate: null,
      endDate: null
    },
    timezone: 'UTC',
    history: []
  };
};

module.exports = mongoose.model('User', userSchema);