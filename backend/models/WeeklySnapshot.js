// models/WeeklySnapshot.js
const mongoose = require('mongoose');

const weeklySnapshotSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  weekStart: {
    type: Date,
    required: true,
    index: true
  },
  weekEnd: {
    type: Date,
    required: true
  },
  weekNumber: {
    type: Number, // Week number since user joined (1, 2, 3...)
    required: true
  },
  scores: {
    total: {
      type: Number,
      default: 0
    },
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
  stats: {
    workoutCount: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number, // in minutes
      default: 0
    },
    totalVolume: {
      type: Number, // in kg
      default: 0
    },
    averageWorkoutsPerWeek: {
      type: Number,
      default: 0
    }
  },
  isComplete: {
    type: Boolean,
    default: false // Marks if the week is finished
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
weeklySnapshotSchema.index({ user: 1, weekStart: -1 });
weeklySnapshotSchema.index({ user: 1, weekNumber: -1 });

// Method to check if this week is complete
weeklySnapshotSchema.methods.checkIfComplete = function() {
  const now = new Date();
  return now > this.weekEnd;
};

module.exports = mongoose.model('WeeklySnapshot', weeklySnapshotSchema);