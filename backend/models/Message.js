const mongoose = require('mongoose');

// Add TTL index for automatic deletion after 30 days

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: {
      type: String,
      maxlength: 1000
    },
    type: {
      type: String,
      enum: ['text', 'workout_share', 'post_share'],
      default: 'text'
    },
    sharedWorkout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workout'
    },
    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    }
  },
  status: {
    sent: { type: Boolean, default: true },
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false }
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  editedAt: Date,
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'status.read': 1 });
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days in seconds

// Virtual for checking if message is deleted for a user
messageSchema.virtual('isDeletedForUser').get(function() {
  return function(userId) {
    return this.deletedFor.some(id => id.toString() === userId.toString());
  };
});

module.exports = mongoose.model('Message', messageSchema);