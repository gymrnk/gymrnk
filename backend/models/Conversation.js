const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group', 'crew'],
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // For group conversations
  group: {
    name: {
      type: String,
      maxlength: 100
    },
    avatar: String,
    description: {
      type: String,
      maxlength: 500
    },
    admin: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  // For crew conversations
  crew: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crew'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  mutedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'group.admin': 1 });
conversationSchema.index({ lastMessage: 1 });
conversationSchema.index({ type: 1 });
conversationSchema.index({ crew: 1 });

// Method to get unread count for a user
conversationSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

// Method to increment unread count
conversationSchema.methods.incrementUnreadCount = function(userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
};

// Method to reset unread count
conversationSchema.methods.resetUnreadCount = function(userId) {
  this.unreadCount.set(userId.toString(), 0);
};

module.exports = mongoose.model('Conversation', conversationSchema);