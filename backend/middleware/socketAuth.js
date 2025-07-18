const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error'));
    }
    
    // Set both _id and id for consistency
    socket.userId = user._id.toString();
    socket.user = user;
    
    console.log('Socket authenticated for user:', socket.userId);
    next();
  } catch (err) {
    console.error('Socket auth error:', err);
    next(new Error('Authentication error'));
  }
};

module.exports = socketAuth;