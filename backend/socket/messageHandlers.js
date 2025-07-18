const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Post = require('../models/Post');
const Workout = require('../models/Workout');

module.exports = (io, socket) => {
  // Send message
  socket.on('message:send', async (data) => {
    try {
      const { conversationId, text, type = 'text', sharedWorkoutId, sharedPostId } = data;
      
      // Verify user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.includes(socket.userId)) {
        return socket.emit('error', { message: 'Unauthorized' });
      }
      
      // Validate shared content
      let sharedWorkout = null;
      let sharedPost = null;

      if (type === 'workout_share' && sharedWorkoutId) {
        sharedWorkout = await Workout.findById(sharedWorkoutId);
        if (!sharedWorkout) {
          return socket.emit('error', { message: 'Workout not found' });
        }
      }

      if (type === 'post_share' && sharedPostId) {
        sharedPost = await Post.findById(sharedPostId);
        if (!sharedPost) {
          return socket.emit('error', { message: 'Post not found' });
        }
      }
      
      // Create message
      const message = new Message({
        conversation: conversationId,
        sender: socket.userId,
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
        if (participantId.toString() !== socket.userId) {
          conversation.incrementUnreadCount(participantId);
        }
      });
      
      await conversation.save();
      
      // Populate message
      await message.populate('sender', 'username profile.displayName profile.avatar');
      
      // Populate shared content
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
      
      // Emit to all participants
      io.to(`conversation:${conversationId}`).emit('message:new', {
        message,
        conversationId
      });
      
      // Send push notification to offline users (implement later)
      
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Mark messages as read
  socket.on('message:read', async (data) => {
    try {
      const { conversationId, messageIds } = data;
      
      // Update messages
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          conversation: conversationId,
          sender: { $ne: socket.userId }
        },
        {
          $set: { 'status.read': true },
          $addToSet: {
            readBy: {
              user: socket.userId,
              readAt: new Date()
            }
          }
        }
      );
      
      // Reset unread count
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        conversation.resetUnreadCount(socket.userId);
        await conversation.save();
      }
      
      // Notify sender about read receipt
      io.to(`conversation:${conversationId}`).emit('message:read:update', {
        conversationId,
        messageIds,
        readBy: socket.userId
      });
      
    } catch (error) {
      console.error('Mark read error:', error);
    }
  });
  
  // Typing indicators
  socket.on('typing:start', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      userId: socket.userId,
      isTyping: true
    });
  });
  
  socket.on('typing:stop', ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      userId: socket.userId,
      isTyping: false
    });
  });
  
  // Delete message
  socket.on('message:delete', async (data) => {
    try {
      const { messageId } = data;
      
      const message = await Message.findById(messageId);
      if (!message || message.sender.toString() !== socket.userId) {
        return socket.emit('error', { message: 'Unauthorized' });
      }
      
      // Soft delete for user
      message.deletedFor.push(socket.userId);
      await message.save();
      
      socket.emit('message:deleted', { messageId });
      
    } catch (error) {
      console.error('Delete message error:', error);
    }
  });
};