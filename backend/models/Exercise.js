// models/Exercise.js
const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  muscleGroup: {
    type: String,
    required: true,
    enum: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs']
  },
  secondaryMuscles: [String],
  category: {
    type: String,
    enum: ['compound', 'isolation'],
    required: true
  },
  equipment: String,
  description: String,
  // Hypertrophy scoring factors
  hypertrophyFactors: {
    timeUnderTension: { type: Number, default: 1.0 }, // multiplier
    muscleActivation: { type: Number, default: 1.0 }, // multiplier
    volumeWeight: { type: Number, default: 1.0 } // how much volume matters
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exercise', exerciseSchema);
