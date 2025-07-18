const mongoose = require('mongoose');

const workoutTemplateSchema = new mongoose.Schema({
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
    maxlength: 500
  },
  visibility: {
    type: String,
    enum: ['global', 'friends', 'private'],
    default: 'private'
  },
  exercises: [{
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true
    },
    sets: [{
      reps: { 
        type: Number, 
        required: true,
        min: 1 
      },
      weight: { 
        type: Number, 
        default: 0,
        min: 0 
      },
      restTime: {
        type: Number,
        default: 90
      },
      tempo: String, // e.g., "2-1-2-0"
      rpe: {
        type: Number,
        min: 1,
        max: 10,
        default: 7
      }
    }],
    notes: String,
    orderIndex: Number // To maintain exercise order
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  targetMuscleGroups: [{
    type: String,
    enum: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs']
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  estimatedDuration: {
    type: Number, // in minutes
    min: 1
  },
  usageCount: {
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
workoutTemplateSchema.index({ visibility: 1, creator: 1 });
workoutTemplateSchema.index({ targetMuscleGroups: 1 });
workoutTemplateSchema.index({ tags: 1 });
workoutTemplateSchema.index({ name: 'text', description: 'text' });

// Virtual for like count
workoutTemplateSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Method to check if user has liked
workoutTemplateSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like => like.user.toString() === userId.toString());
};

// Method to calculate total volume
workoutTemplateSchema.methods.calculateTotalVolume = function() {
  let totalVolume = 0;
  this.exercises.forEach(exercise => {
    exercise.sets.forEach(set => {
      totalVolume += set.reps * set.weight;
    });
  });
  return totalVolume;
};

module.exports = mongoose.model('WorkoutTemplate', workoutTemplateSchema);