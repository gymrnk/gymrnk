const express = require('express');
const Post = require('../models/Post');
const Workout = require('../models/Workout');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { upload } = require('../services/s3Upload');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Create a post
router.post('/', auth, upload.array('images', 5), [
  body('text').optional().isLength({ max: 1000 }),
  body('workoutId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { text, workoutId, visibility = 'public' } = req.body;
    const images = req.files ? req.files.map(file => file.location) : [];
    
    // Verify workout belongs to user if provided
    if (workoutId) {
      const workout = await Workout.findOne({ _id: workoutId, user: req.user._id });
      if (!workout) {
        return res.status(404).json({ error: 'Workout not found' });
      }
    }
    
    const post = new Post({
      author: req.user._id,
      content: {
        text,
        images,
        workout: workoutId
      },
      visibility
    });
    
    await post.save();
    
    // Populate author details including rankings, crew, and streak
    await post.populate({
      path: 'author',
      select: '_id username profile.displayName profile.avatar rankings streak',
      populate: {
        path: 'crew',
        select: 'name logo'
      }
    });
    if (workoutId) {
      await post.populate('content.workout');
    }
    
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get feed (posts from user and friends)
router.get('/feed', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get user and populate friends
    const user = await User.findById(req.user._id).populate('friends');
    const authorIds = [req.user._id, ...user.friends.map(f => f._id)];
    
    const posts = await Post.find({
      author: { $in: authorIds },
      isDeleted: false,
      $or: [
        { visibility: 'public' },
        { visibility: 'friends', author: { $in: authorIds } },
        { author: req.user._id }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'author',
        select: '_id username profile.displayName profile.avatar rankings streak',
        populate: {
          path: 'crew',
          select: 'name logo'
        }
      })
      .populate({
        path: 'content.workout',
        populate: {
          path: 'exercises.exercise',
          select: 'name muscleGroup'
        }
      })
      .populate('comments.user', '_id username profile.displayName profile.avatar');
    
    const total = await Post.countDocuments({
      author: { $in: authorIds },
      isDeleted: false
    });
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get discover feed (public posts from all users)
router.get('/discover', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get user to exclude their own posts and their friends' posts if needed
    const user = await User.findById(req.user._id).populate('friends');
    const friendIds = user.friends.map(f => f._id);
    
    // Find all public posts
    const posts = await Post.find({
      visibility: 'public',
      isDeleted: false,
      // Optional: exclude posts from friends to make discover truly about discovering new people
      // Uncomment the line below if you want to exclude friends' posts from discover
      // author: { $nin: [req.user._id, ...friendIds] }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'author',
        select: '_id username profile.displayName profile.avatar rankings streak',
        populate: {
          path: 'crew',
          select: 'name logo'
        }
      })
      .populate({
        path: 'content.workout',
        populate: {
          path: 'exercises.exercise',
          select: 'name muscleGroup'
        }
      })
      .populate('comments.user', '_id username profile.displayName profile.avatar');
    
    const total = await Post.countDocuments({
      visibility: 'public',
      isDeleted: false
    });
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'recent' } = req.query;
    const skip = (page - 1) * limit;
    const targetUserId = req.params.userId;
    
    // Import User model
    const User = require('../models/User');
    
    // Check if viewing own posts or if users are friends
    const isOwner = req.user._id.toString() === targetUserId;
    const user = await User.findById(req.user._id).populate('friends');
    const isFriend = user.friends.some(f => f._id.toString() === targetUserId);
    
    // Build visibility filter based on relationship
    let visibilityFilter;
    if (isOwner) {
      // Owner can see all their posts
      visibilityFilter = {};
    } else if (isFriend) {
      // Friends can see public and friends-only posts
      visibilityFilter = { visibility: { $in: ['public', 'friends'] } };
    } else {
      // Others can only see public posts
      visibilityFilter = { visibility: 'public' };
    }
    
    // Build sort
    let sortQuery = {};
    if (sort === 'popular') {
      sortQuery = { 'likes.length': -1, createdAt: -1 };
    } else {
      sortQuery = { createdAt: -1 };
    }
    
    const posts = await Post.find({
      author: targetUserId,
      isDeleted: false,
      ...visibilityFilter
    })
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'author',
        select: '_id username profile.displayName profile.avatar rankings streak',
        populate: {
          path: 'crew',
          select: 'name logo'
        }
      })
      .populate({
        path: 'content.workout',
        populate: {
          path: 'exercises.exercise',
          select: 'name muscleGroup'
        }
      })
      .populate('comments.user', '_id username profile.displayName profile.avatar');
    
    const total = await Post.countDocuments({
      author: targetUserId,
      isDeleted: false,
      ...visibilityFilter
    });
    
    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    // Return empty data instead of error
    res.json({
      posts: [],
      pagination: {
        page: parseInt(req.query.page || 1),
        limit: parseInt(req.query.limit || 20),
        total: 0,
        pages: 0
      }
    });
  }
});

// Get single post
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate({
        path: 'author',
        select: '_id username profile.displayName profile.avatar rankings streak',
        populate: {
          path: 'crew',
          select: 'name logo'
        }
      })
      .populate({
        path: 'content.workout',
        populate: {
          path: 'exercises.exercise',
          select: 'name muscleGroup'
        }
      })
      .populate('comments.user', '_id username profile.displayName profile.avatar');
    
    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Check visibility
    if (post.visibility === 'private' && !post.author._id.equals(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/unlike a post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const likeIndex = post.likes.findIndex(
      like => like.user.toString() === req.user._id.toString()
    );
    
    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push({ user: req.user._id });
    }
    
    await post.save();
    
    res.json({
      liked: likeIndex === -1,
      likesCount: post.likes.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add reaction
router.post('/:id/reaction', auth, [
  body('type').isIn(['fire', 'muscle', 'thumbsUp', 'crown'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { type } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    post.reactions[type]++;
    await post.save();
    
    res.json({
      reactions: post.reactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment
router.post('/:id/comment', auth, [
  body('text').trim().isLength({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    
    if (!post || post.isDeleted) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const comment = {
      user: req.user._id,
      text,
      createdAt: new Date()
    };
    
    post.comments.push(comment);
    await post.save();
    
    // Populate the new comment's user info
    await post.populate('comments.user', 'username profile.displayName profile.avatar');
    
    res.status(201).json(post.comments[post.comments.length - 1]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      author: req.user._id
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    post.isDeleted = true;
    await post.save();
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;