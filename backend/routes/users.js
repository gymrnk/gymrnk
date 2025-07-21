const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { upload } = require('../services/s3Upload');
const StreakService = require('../services/streakService');


const router = express.Router();

// Get current user profile (with all new fields)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate({
        path: 'friends',
        select: '_id username email profile',
        match: { isActive: true } // Only get active friends
      })
      .lean(); // Use lean for better performance
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Ensure friends have id field
    if (user.friends && Array.isArray(user.friends)) {
      user.friends = user.friends.map(friend => ({
        ...friend,
        id: friend._id.toString()
      }));
    } else {
      user.friends = [];
    }
    
    res.json({
      ...user,
      id: user._id,
      bmi: user.profile?.height && user.profile?.weight 
        ? (user.profile.weight / Math.pow(user.profile.height / 100, 2)).toFixed(2) 
        : null
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('friends')
      .populate({
        path: 'friends',
        select: '_id username email profile rankings.overall',
        match: { isActive: true }
      })
      .lean();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Format friends array
    const friends = (user.friends || []).map(friend => ({
      ...friend,
      id: friend._id.toString(),
      _id: friend._id.toString()
    }));
    
    console.log(`Returning ${friends.length} friends for user ${req.user._id}`);
    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/me/profile', auth, async (req, res) => {
  try {
    const allowedUpdates = [
      'displayName',
      'bio',
      'dateOfBirth',
      'age',
      'gender',
      'height',
      'weight',
      'heightUnit',
      'weightUnit',
      'primaryGoal',
      'fitnessGoals',
      'motivation',
      'activityLevel',
      'experienceLevel'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[`profile.${field}`] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      ...user.toObject(),
      id: user._id,
      bmi: user.profile?.height && user.profile?.weight 
        ? (user.profile.weight / Math.pow(user.profile.height / 100, 2)).toFixed(2) 
        : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update fitness goals (add or remove)
router.put('/me/fitness-goals', auth, async (req, res) => {
  try {
    const { goals } = req.body;
    
    if (!Array.isArray(goals)) {
      return res.status(400).json({ error: 'Goals must be an array' });
    }

    const user = await User.findById(req.user._id);
    user.profile.fitnessGoals = goals;
    await user.save();

    res.json({
      message: 'Fitness goals updated',
      fitnessGoals: user.profile.fitnessGoals
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user stats (BMI, converted measurements)
router.get('/me/stats', auth, async (req, res) => {
  try {
    const stats = {
      bmi: user.profile?.height && user.profile?.weight 
        ? (user.profile.weight / Math.pow(user.profile.height / 100, 2)).toFixed(2) 
        : null,
      weight: {
        value: user.profile?.weight || null,
        unit: user.profile?.weightUnit || 'kg'
      },
      height: {
        value: user.profile?.height || null,
        unit: user.profile?.heightUnit || 'cm'
      },
      age: user.profile?.age || null,
      activityLevel: user.profile?.activityLevel,
      experienceLevel: user.profile?.experienceLevel
    };

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update activity level (for progress tracking)
router.put('/me/activity-level', auth, async (req, res) => {
  try {
    const { activityLevel } = req.body;
    const validLevels = ['sedentary', 'light', 'moderate', 'active', 'athlete'];
    
    if (!validLevels.includes(activityLevel)) {
      return res.status(400).json({ error: 'Invalid activity level' });
    }

    const user = await User.findById(req.user._id);
    user.profile.activityLevel = activityLevel;
    await user.save();

    res.json({
      message: 'Activity level updated',
      activityLevel: user.profile.activityLevel
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update experience level and adjust rankings
router.put('/me/experience-level', auth, async (req, res) => {
  try {
    const { experienceLevel } = req.body;
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    
    if (!validLevels.includes(experienceLevel)) {
      return res.status(400).json({ error: 'Invalid experience level' });
    }

    const user = await User.findById(req.user._id);
    const oldLevel = user.profile.experienceLevel;
    user.profile.experienceLevel = experienceLevel;
    
    // Optionally adjust rankings if moving up experience levels
    if (oldLevel !== experienceLevel) {
      user.setInitialRankings();
    }
    
    await user.save();

    res.json({
      message: 'Experience level updated',
      experienceLevel: user.profile.experienceLevel,
      rankings: user.rankings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/streak', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const streakStatus = await StreakService.checkStreakStatus(req.user._id);
    const currentMilestone = StreakService.getMilestone(user.streak.current.count);
    const longestMilestone = StreakService.getMilestone(user.streak.longest.count);
    
    res.json({
      current: {
        ...user.streak.current,
        milestone: currentMilestone,
        ...streakStatus
      },
      longest: {
        ...user.streak.longest,
        milestone: longestMilestone
      }
    });
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: 'Failed to fetch streak data' });
  }
});

// Get streak calendar
router.get('/streak/calendar', auth, async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    const calendar = await StreakService.getStreakCalendar(
      req.user._id,
      parseInt(month),
      parseInt(year)
    );
    
    res.json({ calendar });
  } catch (error) {
    console.error('Error fetching streak calendar:', error);
    res.status(500).json({ error: 'Failed to fetch streak calendar' });
  }
});

// Update user's timezone
router.put('/timezone', auth, async (req, res) => {
  try {
    const { timezone } = req.body;
    const user = await User.findById(req.user._id);
    user.streak.timezone = timezone;
    await user.save();
    
    res.json({ message: 'Timezone updated successfully' });
  } catch (error) {
    console.error('Error updating timezone:', error);
    res.status(500).json({ error: 'Failed to update timezone' });
  }
});

// Search users (existing but updated to show more profile info)
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { 'profile.displayName': { $regex: q, $options: 'i' } }
      ],
      isActive: true,
      _id: { $ne: req.user._id }
    })
      .select('_id username profile.displayName profile.avatar profile.experienceLevel rankings.overall')
      .limit(20);
    
    const usersWithId = users.map(user => ({
      ...user.toObject(),
      id: user._id
    }));
    
    res.json(usersWithId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile (existing but updated to include new fields)
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!userId || userId === 'undefined') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    const user = await User.findById(userId)
      .select('-password -email')
      .populate('friends', 'username profile.displayName profile.avatar');
    
    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isFriend = user.friends.some(
      friend => friend._id.toString() === req.user._id.toString()
    );
    
    const hasSentRequest = user.friendRequests.received.includes(req.user._id);
    const hasReceivedRequest = user.friendRequests.sent.includes(req.user._id);
    
    // Only show detailed profile info to friends or self
    const isOwnProfile = userId === req.user._id.toString();
    const canViewDetails = isOwnProfile || isFriend;
    
    const profileData = {
      ...user.toObject(),
      id: user._id,
      friendStatus: {
        isFriend,
        hasSentRequest,
        hasReceivedRequest
      }
    };
    
    // Hide sensitive profile data from non-friends
    if (!canViewDetails) {
      delete profileData.profile.age;
      delete profileData.profile.dateOfBirth;
      delete profileData.profile.weight;
      delete profileData.profile.height;
    } else {
      profileData.bmi = user.profile?.height && user.profile?.weight 
       ? (user.profile.weight / Math.pow(user.profile.height / 100, 2)).toFixed(2) 
       : null;
    }
    
    res.json(profileData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Find users with similar goals (new route)
router.get('/similar', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    
    const similarUsers = await User.find({
      _id: { $ne: req.user._id },
      isActive: true,
      $or: [
        { 'profile.primaryGoal': currentUser.profile.primaryGoal },
        { 'profile.experienceLevel': currentUser.profile.experienceLevel },
        { 'profile.activityLevel': currentUser.profile.activityLevel }
      ]
    })
      .select('_id username profile.displayName profile.avatar profile.primaryGoal profile.experienceLevel rankings.overall')
      .limit(20);
    
    const usersWithId = similarUsers.map(user => ({
      ...user.toObject(),
      id: user._id,
      matchReasons: []
    }));
    
    // Add match reasons
    usersWithId.forEach(user => {
      if (user.profile.primaryGoal === currentUser.profile.primaryGoal) {
        user.matchReasons.push('Same fitness goal');
      }
      if (user.profile.experienceLevel === currentUser.profile.experienceLevel) {
        user.matchReasons.push('Similar experience level');
      }
    });
    
    res.json(usersWithId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ... rest of existing routes (avatar upload, friend requests, etc.) remain the same ...

// Upload avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Delete old avatar if exists
    if (user.profile.avatar) {
      // Implement deletion of old avatar from S3
    }
    
    user.profile.avatar = req.file.location;
    await user.save();
    
    res.json({
      message: 'Avatar uploaded successfully',
      avatar: user.profile.avatar
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send friend request
router.post('/:id/friend-request', auth, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }
    
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (req.user.friends.includes(targetUserId)) {
      return res.status(400).json({ error: 'Already friends' });
    }
    
    if (req.user.friendRequests.sent.includes(targetUserId)) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }
    
    req.user.friendRequests.sent.push(targetUserId);
    await req.user.save();
    
    targetUser.friendRequests.received.push(req.user._id);
    await targetUser.save();
    
    res.json({ message: 'Friend request sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept friend request
router.post('/:id/accept-friend', auth, async (req, res) => {
  try {
    const requesterId = req.params.id;
    
    if (!req.user.friendRequests.received.includes(requesterId)) {
      return res.status(400).json({ error: 'No friend request from this user' });
    }
    
    const requester = await User.findById(requesterId);
    if (!requester) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    req.user.friends.push(requesterId);
    requester.friends.push(req.user._id);
    
    req.user.friendRequests.received = req.user.friendRequests.received.filter(
      id => id.toString() !== requesterId
    );
    requester.friendRequests.sent = requester.friendRequests.sent.filter(
      id => id.toString() !== req.user._id.toString()
    );
    
    await req.user.save();
    await requester.save();
    
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Decline friend request
router.post('/:id/decline-friend', auth, async (req, res) => {
  try {
    const requesterId = req.params.id;
    
    req.user.friendRequests.received = req.user.friendRequests.received.filter(
      id => id.toString() !== requesterId
    );
    await req.user.save();
    
    const requester = await User.findById(requesterId);
    if (requester) {
      requester.friendRequests.sent = requester.friendRequests.sent.filter(
        id => id.toString() !== req.user._id.toString()
      );
      await requester.save();
    }
    
    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove friend
router.delete('/:id/friend', auth, async (req, res) => {
  try {
    const friendId = req.params.id;
    
    req.user.friends = req.user.friends.filter(
      id => id.toString() !== friendId
    );
    await req.user.save();
    
    const friend = await User.findById(friendId);
    if (friend) {
      friend.friends = friend.friends.filter(
        id => id.toString() !== req.user._id.toString()
      );
      await friend.save();
    }
    
    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get friend requests
router.get('/friend-requests/all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friendRequests.sent', '_id username profile.displayName profile.avatar')
      .populate('friendRequests.received', '_id username profile.displayName profile.avatar');
    
    const formatUsers = (users) => users.map(u => ({
      ...u.toObject(),
      id: u._id
    }));
    
    res.json({
      sent: formatUsers(user.friendRequests.sent),
      received: formatUsers(user.friendRequests.received)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/consistency-stats', auth, async (req, res) => {
  try {
    const WorkoutValidationService = require('../services/workoutValidationService');
    const Workout = require('../models/Workout');
    const moment = require('moment');
    
    // Get current multiplier
    const multiplier = await WorkoutValidationService.getConsistencyMultiplier(req.user._id);
    
    // Count workouts in last 7 days
    const sevenDaysAgo = moment().subtract(7, 'days').startOf('day').toDate();
    const workoutsThisWeek = await Workout.countDocuments({
      user: req.user._id,
      date: { $gte: sevenDaysAgo }
    });
    
    // Determine current tier and next tier requirements
    let currentTier, nextTierWorkouts;
    
    if (workoutsThisWeek === 0) {
      currentTier = 'Inactive';
      nextTierWorkouts = 1;
    } else if (workoutsThisWeek === 1) {
      currentTier = 'Starting';
      nextTierWorkouts = 2;
    } else if (workoutsThisWeek <= 3) {
      currentTier = 'Baseline';
      nextTierWorkouts = 4;
    } else if (workoutsThisWeek <= 5) {
      currentTier = 'Consistent';
      nextTierWorkouts = 6;
    } else {
      currentTier = 'Elite';
      nextTierWorkouts = null; // Already at max
    }
    
    res.json({
      multiplier,
      workoutsThisWeek,
      nextTierWorkouts,
      currentTier,
      multiplierBreakdown: {
        '0': 0.5,
        '1': 0.8,
        '2-3': 1.0,
        '4-5': 1.3,
        '6-7': 1.5
      }
    });
  } catch (error) {
    console.error('Error fetching consistency stats:', error);
    res.status(500).json({ error: 'Failed to fetch consistency stats' });
  }
});

module.exports = router;