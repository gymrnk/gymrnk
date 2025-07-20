// models/Workout.js
const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  exercises: [{
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: function() {
        // Required if exerciseId is not present
        return !this.exerciseId;
      }
    },
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: function() {
        // Required if exercise is not present
        return !this.exercise;
      }
    },
    sets: [{
      reps: { 
        type: Number, 
        required: true,
        min: 1 // Ensure at least 1 rep
      },
      weight: { 
        type: Number, 
        required: true,
        min: 0 // Allow bodyweight exercises (0 weight)
      },
      restTime: Number, // in seconds
      tempo: String, // e.g., "2-1-2-0" (eccentric-pause-concentric-pause)
      rpe: {
        type: Number,
        min: 1,
        max: 10
      }
    }],
    notes: String
  }],
  duration: {
    type: Number, // in minutes
    default: 1,
    min: 1
  },
  // Calculated hypertrophy score for this workout
  hypertrophyScore: {
    total: { type: Number, default: 0 },
    byMuscleGroup: {
      chest: { type: Number, default: 0 },
      back: { type: Number, default: 0 },
      shoulders: { type: Number, default: 0 },
      biceps: { type: Number, default: 0 },
      triceps: { type: Number, default: 0 },
      legs: { type: Number, default: 0 },
      abs: { type: Number, default: 0 }
    }
  },
  processedWeeklyExpiry: {
    type: Boolean,
    sparse: true
  },
  processedMonthlyExpiry: {
    type: Boolean,
    sparse: true
  },
  notes: String
}, {
  timestamps: true
});

// Pre-save hook to ensure exercise field consistency
workoutSchema.pre('save', function(next) {
  // Ensure both exercise and exerciseId fields are in sync
  this.exercises.forEach(ex => {
    if (ex.exerciseId && !ex.exercise) {
      ex.exercise = ex.exerciseId;
    } else if (ex.exercise && !ex.exerciseId) {
      ex.exerciseId = ex.exercise;
    }
    
    // Ensure all numeric values are properly typed
    ex.sets.forEach(set => {
      if (typeof set.reps === 'string') {
        set.reps = parseInt(set.reps) || 1;
      }
      if (typeof set.weight === 'string') {
        set.weight = parseFloat(set.weight) || 0;
      }
      if (set.rpe && typeof set.rpe === 'string') {
        set.rpe = parseInt(set.rpe) || undefined;
      }
    });
  });
  
  next();
});

// Virtual to get total volume
workoutSchema.virtual('totalVolume').get(function() {
  let volume = 0;
  this.exercises.forEach(ex => {
    ex.sets.forEach(set => {
      volume += set.reps * set.weight;
    });
  });
  return volume;
});

// Virtual to get exercise count
workoutSchema.virtual('exerciseCount').get(function() {
  return this.exercises.length;
});

// Virtual to get total sets
workoutSchema.virtual('totalSets').get(function() {
  return this.exercises.reduce((total, ex) => total + ex.sets.length, 0);
});

// Method to populate exercises properly
workoutSchema.methods.populateExercises = async function() {
  await this.populate('exercises.exercise exercises.exerciseId');
  return this;
};

module.exports = mongoose.model('Workout', workoutSchema);