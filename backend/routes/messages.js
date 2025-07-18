const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Post = require('../models/Post');
const Workout = require('../models/Workout');
const { body, validationResult, param } = require('express-validator');

// Get all conversations for user
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      isActive: true
    })
      .populate('participants', 'username profile.displayName profile.avatar')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username profile.displayName'
        }
      })
      .sort('-updatedAt');
    
    // Add unread counts
    const conversationsWithUnread = conversations.map(conv => ({
      ...conv.toObject(),
      unreadCount: conv.getUnreadCount(req.user._id)
    }));
    
    res.json(conversationsWithUnread);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get or create direct conversation
router.post('/conversations/direct', auth, [
  body('userId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { userId } = req.body;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }
    
    // Check if conversation exists
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, userId] }
    });
    
    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        type: 'direct',
        participants: [req.user._id, userId]
      });
      await conversation.save();
    }
    
    // Populate participants with all necessary fields
    await conversation.populate({
      path: 'participants',
      select: '_id id username email profile.displayName profile.avatar profile.bio'
    });
    
    // Ensure each participant has an id field
    const conversationObj = conversation.toObject();
    conversationObj.participants = conversationObj.participants.map(p => ({
      ...p,
      id: p._id.toString()
    }));
    
    res.json(conversationObj);
  } catch (error) {
    console.error('Create direct conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create group conversation
router.post('/conversations/group', auth, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('participantIds').isArray({ min: 2 }),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { name, participantIds, description } = req.body;
    
    // Add creator to participants
    const allParticipants = [req.user._id, ...participantIds];
    
    const conversation = new Conversation({
      type: 'group',
      participants: [...new Set(allParticipants)], // Remove duplicates
      group: {
        name,
        description,
        admin: [req.user._id]
      }
    });
    
    await conversation.save();
    await conversation.populate('participants', 'username profile.displayName profile.avatar');
    
    // Notify participants via socket
    const io = req.app.get('io');
    participantIds.forEach(participantId => {
      io.to(`user:${participantId}`).emit('conversation:new', conversation);
    });
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/conversations/:conversationId/messages', auth, [
  param('conversationId').isMongoId()
], async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Verify conversation exists and user is participant
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user._id.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get messages - sorted by newest first for pagination
    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: req.user._id }
    })
      .sort('-createdAt') // Newest first for pagination
      .skip(skip)
      .limit(parseInt(limit))
      .populate('sender', '_id username email profile.displayName profile.avatar')
      .populate({
        path: 'content.sharedWorkout',
        populate: {
          path: 'exercises.exercise',
          select: 'name muscleGroup'
        }
      })
      .populate({
        path: 'content.sharedPost',
        populate: {
          path: 'author',
          select: '_id username profile.displayName profile.avatar'
        }
      })
      .lean();
    
    const totalMessages = await Message.countDocuments({
      conversation: conversationId,
      deletedFor: { $ne: req.user._id }
    });
    
    const hasMore = skip + messages.length < totalMessages;
    
    // IMPORTANT: Reverse to chronological order (oldest first) for display
    res.json({
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/conversations/:conversationId/messages', auth, [
  param('conversationId').isMongoId(),
  body('text').optional().isLength({ min: 1, max: 1000 }),
  body('type').optional().isIn(['text', 'workout_share', 'post_share']),
  body('sharedWorkoutId').optional().isMongoId(),
  body('sharedPostId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { conversationId } = req.params;
    const { text, type = 'text', sharedWorkoutId, sharedPostId } = req.body;
    
    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Verify user is participant
    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user._id.toString()
    );
    
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate shared content
    let sharedWorkout = null;
    let sharedPost = null;

    if (type === 'workout_share' && sharedWorkoutId) {
      sharedWorkout = await Workout.findById(sharedWorkoutId);
      if (!sharedWorkout) {
        return res.status(404).json({ error: 'Workout not found' });
      }
    }

    if (type === 'post_share' && sharedPostId) {
      sharedPost = await Post.findById(sharedPostId);
      if (!sharedPost) {
        return res.status(404).json({ error: 'Post not found' });
      }
    }
    
    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      content: { 
        text: text || '',
        type,
        sharedWorkout: sharedWorkoutId,
        sharedPost: sharedPostId
      }
    });
    
    await message.save();
    
    // Update conversation
    conversation.lastMessage = message._id;
    
    // Increment unread count for all participants except sender
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        conversation.incrementUnreadCount(participantId);
      }
    });
    
    await conversation.save();
    
    // Populate message before sending response
    await message.populate('sender', '_id username email profile.displayName profile.avatar');
    if (sharedWorkout) {
      await message.populate({
        path: 'content.sharedWorkout',
        populate: {
          path: 'exercises.exercise',
          select: 'name muscleGroup'
        }
      });
    }
    if (sharedPost) {
      await message.populate({
        path: 'content.sharedPost',
        populate: {
          path: 'author',
          select: '_id username profile.displayName profile.avatar'
        }
      });
    }
    
    // Try to emit via socket if available (for real-time updates)
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message:new', {
        message: message.toObject(),
        conversationId
      });
    }
    
    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Remove participant from group
router.delete('/conversations/:conversationId/participants/:userId', auth, async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is admin
    if (!conversation.group.admin.includes(req.user._id)) {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }
    
    // Can't remove other admins
    if (conversation.group.admin.includes(userId)) {
      return res.status(403).json({ error: 'Cannot remove other admins' });
    }
    
    // Remove participant
    conversation.participants = conversation.participants.filter(
      p => p.toString() !== userId
    );
    
    await conversation.save();
    
    // Notify removed user via socket
    const io = req.app.get('io');
    io.to(`user:${userId}`).emit('conversation:removed', conversationId);
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update group info
router.put('/conversations/:conversationId/group', auth, [
  param('conversationId').isMongoId(),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name, description } = req.body;
    
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is admin
    if (!conversation.group.admin.includes(req.user._id)) {
      return res.status(403).json({ error: 'Only admins can update group info' });
    }
    
    if (name) conversation.group.name = name;
    if (description !== undefined) conversation.group.description = description;
    
    await conversation.save();
    await conversation.populate('participants', 'username profile.displayName profile.avatar');
    
    // Notify participants
    const io = req.app.get('io');
    io.to(`conversation:${conversationId}`).emit('conversation:updated', conversation);
    
    res.json(conversation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add participants to group
router.post('/conversations/:conversationId/participants', auth, [
  param('conversationId').isMongoId(),
  body('userIds').isArray({ min: 1 })
], async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userIds } = req.body;
    
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if user is participant
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Add new participants
    const newParticipants = userIds.filter(id => 
      !conversation.participants.includes(id)
    );
    
    conversation.participants.push(...newParticipants);
    await conversation.save();
    
    // Notify new participants
    const io = req.app.get('io');
    newParticipants.forEach(userId => {
      io.to(`user:${userId}`).emit('conversation:new', conversation);
    });
    
    res.json({ added: newParticipants.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave group
router.delete('/conversations/:conversationId/leave', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation || conversation.type !== 'group') {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    conversation.participants = conversation.participants.filter(
      p => p.toString() !== req.user._id.toString()
    );
    
    // Remove from admins if admin
    conversation.group.admin = conversation.group.admin.filter(
      a => a.toString() !== req.user._id.toString()
    );
    
    // If no admins left, make first participant admin
    if (conversation.group.admin.length === 0 && conversation.participants.length > 0) {
      conversation.group.admin.push(conversation.participants[0]);
    }
    
    await conversation.save();
    
    // Leave socket room
    const io = req.app.get('io');
    const socket = io.sockets.sockets.get(req.user.socketId);
    if (socket) {
      socket.leave(`conversation:${conversationId}`);
    }
    
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      isActive: true
    });
    
    let totalUnread = 0;
    conversations.forEach(conv => {
      totalUnread += conv.getUnreadCount(req.user._id);
    });
    
    res.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;