const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Register with optional gamified profile data
router.post('/register', [
  body('username').isLength({ min: 3, max: 30 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  // Optional profile validation
  body('profile.age').optional().isInt({ min: 13, max: 120 }),
  body('profile.gender').optional().isIn(['male', 'female', 'other']),
  body('profile.height').optional().isFloat({ min: 50, max: 300 }),
  body('profile.weight').optional().isFloat({ min: 20, max: 500 }),
  body('profile.heightUnit').optional().isIn(['cm', 'ft']),
  body('profile.weightUnit').optional().isIn(['kg', 'lbs']),
  body('profile.fitnessGoal').optional().isIn(['muscle', 'lose_weight', 'strength', 'endurance', 'health', 'competition']),
  body('profile.motivation').optional().isIn(['health', 'appearance', 'performance', 'confidence', 'challenge', 'community']),
  body('profile.activityLevel').optional().isIn(['sedentary', 'light', 'moderate', 'active', 'athlete']),
  body('profile.experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, email, password, profile } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        error: existingUser.username === username 
          ? 'Username already taken' 
          : 'Email already registered'
      });
    }
    
    // Create user with profile data
    const user = new User({
      username,
      email,
      password,
      profile: profile ? {
        displayName: username,
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        heightUnit: profile.heightUnit || 'cm',
        weightUnit: profile.weightUnit || 'kg',
        primaryGoal: profile.fitnessGoal,
        fitnessGoals: profile.fitnessGoal ? [profile.fitnessGoal] : [],
        motivation: profile.motivation,
        activityLevel: profile.activityLevel,
        experienceLevel: profile.experienceLevel
      } : {
        displayName: username
      },
      onboarding: {
        completed: !!profile,
        completedAt: profile ? new Date() : undefined
      }
    });
    
    // Set initial rankings based on experience level if provided
    if (profile && profile.experienceLevel) {
      user.setInitialRankings();
    }
    
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    // Return user data
    const userResponse = {
      id: user._id,
      _id: user._id,
      username: user.username,
      email: user.email,
      profile: user.profile,
      rankings: user.rankings,
      onboarding: user.onboarding,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.status(201).json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('username').trim(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, password } = req.body;
    
    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }
    
    // Update last active
    user.lastActiveAt = new Date();
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      token,
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        rankings: user.rankings,
        onboarding: user.onboarding
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete onboarding (if skipped during registration)
router.post('/complete-onboarding', auth, [
  body('profile.age').isInt({ min: 13, max: 120 }),
  body('profile.gender').isIn(['male', 'female', 'other']),
  body('profile.height').isFloat({ min: 50, max: 300 }),
  body('profile.weight').isFloat({ min: 20, max: 500 }),
  body('profile.heightUnit').isIn(['cm', 'ft']),
  body('profile.weightUnit').isIn(['kg', 'lbs']),
  body('profile.fitnessGoal').isIn(['muscle', 'lose_weight', 'strength', 'endurance', 'health', 'competition']),
  body('profile.motivation').isIn(['health', 'appearance', 'performance', 'confidence', 'challenge', 'community']),
  body('profile.activityLevel').isIn(['sedentary', 'light', 'moderate', 'active', 'athlete']),
  body('profile.experienceLevel').isIn(['beginner', 'intermediate', 'advanced', 'expert'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { profile } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if onboarding already completed
    if (user.onboarding && user.onboarding.completed) {
      return res.status(400).json({ error: 'Onboarding already completed' });
    }

    // Update profile with onboarding data
    user.profile = {
      ...user.profile.toObject(),
      age: profile.age,
      gender: profile.gender,
      height: profile.height,
      weight: profile.weight,
      heightUnit: profile.heightUnit || 'cm',
      weightUnit: profile.weightUnit || 'kg',
      primaryGoal: profile.fitnessGoal,
      fitnessGoals: [...(user.profile.fitnessGoals || []), profile.fitnessGoal].filter(Boolean),
      motivation: profile.motivation,
      activityLevel: profile.activityLevel,
      experienceLevel: profile.experienceLevel
    };

    // Update onboarding status
    user.onboarding = {
      completed: true,
      completedAt: new Date(),
      skipped: false
    };

    // Set initial rankings based on experience level
    user.setInitialRankings();
    await user.save();

    res.json({
      message: 'Onboarding completed successfully',
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        rankings: user.rankings,
        onboarding: user.onboarding
      }
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('friends', 'username profile.displayName profile.avatar rankings');
      .populate('crew'); // ADD THIS LINE to populate crew data
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile (enhanced to support all new fields)
router.put('/profile', auth, [
  body('displayName').optional().isLength({ max: 50 }),
  body('bio').optional().isLength({ max: 500 }),
  body('height').optional().isNumeric(),
  body('weight').optional().isNumeric(),
  body('heightUnit').optional().isIn(['cm', 'ft']),
  body('weightUnit').optional().isIn(['kg', 'lbs']),
  body('dateOfBirth').optional().isISO8601(),
  body('age').optional().isInt({ min: 13, max: 120 }),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('fitnessGoals').optional().isArray(),
  body('primaryGoal').optional().isIn(['muscle', 'lose_weight', 'strength', 'endurance', 'health', 'competition']),
  body('motivation').optional().isIn(['health', 'appearance', 'performance', 'confidence', 'challenge', 'community']),
  body('activityLevel').optional().isIn(['sedentary', 'light', 'moderate', 'active', 'athlete']),
  body('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const updates = req.body;
    const user = await User.findById(req.user._id);
    
    // Update profile fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        user.profile[key] = updates[key];
      }
    });
    
    // If experience level changed, update rankings
    if (updates.experienceLevel && updates.experienceLevel !== user.profile.experienceLevel) {
      user.setInitialRankings();
    }
    
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      profile: user.profile,
      rankings: user.rankings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    // Get user with password field (which is normally excluded)
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password (will be hashed by the pre-save hook)
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;