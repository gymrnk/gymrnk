// models/Ranking.js
const mongoose = require('mongoose');

const rankingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly', 'allTime'],
    required: true
  },
  muscleGroup: {
    type: String,
    enum: ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'],
    required: true
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  rank: Number,
  percentile: Number,
  tier: String,
  division: Number,
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
rankingSchema.index({ period: 1, muscleGroup: 1, score: -1 });
rankingSchema.index({ user: 1, period: 1, muscleGroup: 1 });

module.exports = mongoose.model('Ranking', rankingSchema);