const mongoose = require('mongoose');

const userPlanProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkoutPlan',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  scheduledEndDate: {
    type: Date,
    required: true
  },
  actualEndDate: Date,
  currentDay: {
    type: Number,
    default: 1
  },
  completedDays: {
    type: Number,
    default: 0
  },
  completedWorkouts: [{
    dayNumber: Number,
    workoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workout'
    },
    completedAt: Date
  }],
  missedDays: [{
    dayNumber: Number,
    missedDate: Date,
    reminderSent: { type: Boolean, default: false }
  }],
  restDaysTaken: [{
    dayNumber: Number,
    date: Date
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned', 'paused'],
    default: 'active'
  },
  completionRate: {
    type: Number,
    default: 0 // Percentage
  },
  lastWorkoutDate: Date,
  nextWorkoutDay: {
    type: Number,
    default: 1
  },
  notes: [{
    date: Date,
    text: String
  }]
}, {
  timestamps: true
});

// Compound index for unique active plan per user
userPlanProgressSchema.index({ user: 1, plan: 1, status: 1 });
userPlanProgressSchema.index({ status: 1, lastWorkoutDate: 1 });

// Method to check if day is missed
userPlanProgressSchema.methods.checkMissedDays = function() {
  const today = new Date();
  const daysSinceStart = Math.floor((today - this.startDate) / (1000 * 60 * 60 * 24));
  const expectedDay = Math.min(daysSinceStart + 1, this.plan.duration);
  
  // If current day is less than expected day, days were missed
  if (this.currentDay < expectedDay) {
    const missedCount = expectedDay - this.currentDay;
    return {
      hasMissedDays: true,
      missedCount,
      lastWorkoutDaysAgo: this.lastWorkoutDate ? 
        Math.floor((today - this.lastWorkoutDate) / (1000 * 60 * 60 * 24)) : 
        daysSinceStart
    };
  }
  
  return { hasMissedDays: false };
};

// Method to advance to next day
userPlanProgressSchema.methods.completeDay = async function(workoutId, dayNumber) {
  this.completedWorkouts.push({
    dayNumber,
    workoutId,
    completedAt: new Date()
  });
  
  this.completedDays++;
  this.currentDay = dayNumber + 1;
  this.lastWorkoutDate = new Date();
  this.completionRate = (this.completedDays / this.plan.duration) * 100;
  
  // Check if plan is completed
  if (this.currentDay > this.plan.duration) {
    this.status = 'completed';
    this.actualEndDate = new Date();
    
    // Update plan stats
    await mongoose.model('WorkoutPlan').findByIdAndUpdate(this.plan, {
      $inc: { completionCount: 1 }
    });
  }
  
  await this.save();
};

// Method to abandon plan
userPlanProgressSchema.methods.abandon = async function() {
  this.status = 'abandoned';
  this.actualEndDate = new Date();
  
  // Update plan analytics
  const plan = await mongoose.model('WorkoutPlan').findById(this.plan);
  if (plan) {
    await plan.updateAnalytics();
  }
  
  await this.save();
};

module.exports = mongoose.model('UserPlanProgress', userPlanProgressSchema);