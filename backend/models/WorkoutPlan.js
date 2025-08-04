const mongoose = require('mongoose');

const workoutPlanSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 1000
  },
  visibility: {
    type: String,
    enum: ['global', 'friends', 'private'],
    default: 'private'
  },
  duration: {
    type: Number, // Total days (7, 14, 30, 90, 180)
    required: true,
    enum: [7, 14, 30, 90, 180]
  },
  category: {
    type: String,
    enum: ['bodyweight', 'weighted', 'hybrid'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  days: [{
    dayNumber: {
      type: Number,
      required: true
    },
    dayType: {
      type: String,
      enum: ['workout', 'rest', 'active-recovery'],
      required: true
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutTemplate'
    },
    customWorkout: {
      name: String,
      exercises: [{
        exercise: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Exercise'
        },
        sets: [{
          reps: Number,
          weight: Number,
          restTime: Number,
          tempo: String,
          rpe: Number
        }],
        notes: String
      }]
    },
    notes: String,
    targetMuscleGroups: [String]
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  equipment: [String], // List of required equipment
  goals: [String], // Plan goals
  
  // Stats
  usageCount: {
    type: Number,
    default: 0
  },
  completionCount: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics data
  analytics: {
    averageCompletionRate: { type: Number, default: 0 },
    commonDropOffDay: { type: Number, default: 0 },
    dropOffByDayOfWeek: {
      monday: { type: Number, default: 0 },
      tuesday: { type: Number, default: 0 },
      wednesday: { type: Number, default: 0 },
      thursday: { type: Number, default: 0 },
      friday: { type: Number, default: 0 },
      saturday: { type: Number, default: 0 },
      sunday: { type: Number, default: 0 }
    },
    totalStarts: { type: Number, default: 0 },
    lastUpdated: Date
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
workoutPlanSchema.index({ visibility: 1, creator: 1 });
workoutPlanSchema.index({ category: 1, difficulty: 1 });
workoutPlanSchema.index({ tags: 1 });
workoutPlanSchema.index({ name: 'text', description: 'text' });
workoutPlanSchema.index({ isFeatured: 1, averageRating: -1 });

// Virtual for like count
workoutPlanSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Method to check if user has liked
workoutPlanSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to update analytics
workoutPlanSchema.methods.updateAnalytics = async function() {
  const UserPlanProgress = mongoose.model('UserPlanProgress');
  
  const allProgress = await UserPlanProgress.find({ 
    plan: this._id 
  });
  
  if (allProgress.length === 0) return;
  
  // Calculate average completion rate
  const completionRates = allProgress.map(p => (p.completedDays / this.duration) * 100);
  this.analytics.averageCompletionRate = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
  
  // Find common drop-off day
  const dropOffDays = allProgress
    .filter(p => p.status === 'abandoned')
    .map(p => p.currentDay);
  
  if (dropOffDays.length > 0) {
    const dayFrequency = {};
    dropOffDays.forEach(day => {
      dayFrequency[day] = (dayFrequency[day] || 0) + 1;
    });
    
    this.analytics.commonDropOffDay = Object.entries(dayFrequency)
      .sort(([,a], [,b]) => b - a)[0][0];
  }
  
  // Calculate drop-off by day of week
  const dropOffByDayOfWeek = {
    monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
    friday: 0, saturday: 0, sunday: 0
  };
  
  allProgress
    .filter(p => p.status === 'abandoned' && p.lastWorkoutDate)
    .forEach(p => {
      const dayOfWeek = new Date(p.lastWorkoutDate).toLocaleLowerCase('en-US', { weekday: 'long' });
      dropOffByDayOfWeek[dayOfWeek]++;
    });
  
  this.analytics.dropOffByDayOfWeek = dropOffByDayOfWeek;
  this.analytics.totalStarts = allProgress.length;
  this.analytics.lastUpdated = new Date();
  
  await this.save();
};

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);