const mongoose = require('mongoose');

const planRatingSchema = new mongoose.Schema({
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
  progress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserPlanProgress',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: 1000
  },
  completionRate: {
    type: Number,
    required: true // How much of the plan they completed
  },
  wouldRecommend: Boolean,
  pros: [String],
  cons: [String],
  isVerified: {
    type: Boolean,
    default: true // Only users who started the plan can rate
  }
}, {
  timestamps: true
});

// Ensure one rating per user per plan
planRatingSchema.index({ user: 1, plan: 1 }, { unique: true });

// Post-save hook to update plan average rating
planRatingSchema.post('save', async function() {
  const WorkoutPlan = mongoose.model('WorkoutPlan');
  const ratings = await this.constructor.find({ plan: this.plan });
  
  const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
  
  await WorkoutPlan.findByIdAndUpdate(this.plan, {
    averageRating: avgRating,
    totalRatings: ratings.length
  });
});

module.exports = mongoose.model('PlanRating', planRatingSchema);