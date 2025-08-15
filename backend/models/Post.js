// models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: String,
    images: [String],
    workout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workout'
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
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
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  reactions: {
    fire: { type: Number, default: 0 },
    muscle: { type: Number, default: 0 },
    thumbsUp: { type: Number, default: 0 },
    crown: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);
