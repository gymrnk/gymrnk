// models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    text: { type: String, maxlength: 1000 },
    images: [String], // S3 URLs
    workout: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workout'
    }
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: { type: String, required: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  }],
  reactions: {
    fire: { type: Number, default: 0 },
    muscle: { type: Number, default: 0 },
    thumbsUp: { type: Number, default: 0 },
    crown: { type: Number, default: 0 }
  },
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);
