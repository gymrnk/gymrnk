const express = require('express');
const Crew = require('../models/Crew');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const auth = require('../middleware/auth');
const { uploadImage } = require('../services/s3Upload');
const Workout = require('../models/Workout');
const Exercise = require('../models/Exercise');

const router = express.Router();

// Get all crews (for discovery)
router.get('/', auth, async (req, res) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    
    let query = { isActive: true };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const crews = await Crew.find(query)
      .populate('createdBy', 'username profile.displayName profile.avatar')
      .select('name description logo members createdBy createdAt')
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .sort({ members: -1 });
    
    const crewsWithMemberCount = crews.map(crew => ({
      ...crew.toObject(),
      memberCount: crew.members.length
    }));
    
    res.json(crewsWithMemberCount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's current crew
router.get('/my-crew', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'crew',
      populate: [
        { path: 'members', select: 'username profile.displayName profile.avatar' },
        { path: 'admins', select: 'username profile.displayName profile.avatar' },
        { path: 'createdBy', select: 'username profile.displayName profile.avatar' }
      ]
    });
    
    if (!user.crew) {
      return res.json(null);
    }
    
    const crewData = user.crew.toObject();
    crewData.memberCount = crewData.members.length;
    crewData.isAdmin = user.crew.isAdmin(req.user._id);
    
    res.json(crewData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get crew by ID
router.get('/:crewId', auth, async (req, res) => {
  try {
    const crew = await Crew.findById(req.params.crewId)
      .populate('members', 'username profile.displayName profile.avatar rankings.overall')
      .populate('admins', 'username profile.displayName profile.avatar')
      .populate('createdBy', 'username profile.displayName profile.avatar');
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    const crewData = crew.toObject();
    crewData.memberCount = crewData.members.length;
    crewData.isMember = crew.isMember(req.user._id);
    crewData.isAdmin = crew.isAdmin(req.user._id);
    
    res.json(crewData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new crew
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    // Check if user already has a crew
    const user = await User.findById(req.user._id);
    if (user.crew) {
      return res.status(400).json({ error: 'You can only be in one crew at a time' });
    }
    
    // Check if crew name already exists
    const existingCrew = await Crew.findOne({ name });
    if (existingCrew) {
      return res.status(400).json({ error: 'Crew name already taken' });
    }
    
    // Create crew
    const crew = new Crew({
      name,
      description,
      isPrivate,
      createdBy: req.user._id,
      admins: [req.user._id],
      members: [req.user._id]
    });
    
    // Generate join code
    crew.generateJoinCode();
    
    // Create group conversation for the crew
    const conversation = new Conversation({
      type: 'group',
      participants: [req.user._id],
      group: {
        name: `${name} Chat`,
        description: `Official chat for ${name} crew`,
        admin: [req.user._id]
      }
    });
    
    await conversation.save();
    crew.conversation = conversation._id;
    await crew.save();
    
    // Update user's crew
    user.crew = crew._id;
    user.crewJoinedAt = new Date();
    await user.save();
    
    // Populate and return
    await crew.populate([
      { path: 'members', select: 'username profile.displayName profile.avatar' },
      { path: 'admins', select: 'username profile.displayName profile.avatar' },
      { path: 'createdBy', select: 'username profile.displayName profile.avatar' }
    ]);
    
    res.status(201).json(crew);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get crew analytics overview
router.get('/:crewId/analytics/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const crew = await Crew.findById(req.params.crewId)
      .populate('members', '_id username profile.displayName');
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    // Check if user is admin or member
    if (!crew.isAdmin(req.user._id) && !crew.isMember(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    // Get all workouts from crew members
    const memberIds = crew.members.map(m => m._id);
    const workoutFilter = {
      user: { $in: memberIds }
    };
    if (Object.keys(dateFilter).length > 0) {
      workoutFilter.date = dateFilter;
    }
    
    const workouts = await Workout.find(workoutFilter)
      .populate('exercises.exercise', 'name muscleGroup');
    
    // Calculate overview stats
    const overview = {
      totalMembers: crew.members.length,
      totalWorkouts: workouts.length,
      totalVolume: 0,
      totalDuration: 0,
      averageWorkoutsPerMember: 0,
      activeMembersCount: 0,
      mostActiveDay: null,
      peakHour: null
    };
    
    // Member activity map
    const memberActivity = new Map();
    const dayActivity = new Array(7).fill(0); // Sunday = 0
    const hourActivity = new Array(24).fill(0);
    
    workouts.forEach(workout => {
      // Track member activity
      const userId = workout.user.toString();
      memberActivity.set(userId, (memberActivity.get(userId) || 0) + 1);
      
      // Track day and hour patterns
      const workoutDate = new Date(workout.date);
      dayActivity[workoutDate.getDay()]++;
      hourActivity[workoutDate.getHours()]++;
      
      // Calculate volume and duration
      overview.totalDuration += workout.duration || 0;
      workout.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          overview.totalVolume += set.reps * set.weight;
        });
      });
    });
    
    // Calculate derived stats
    overview.activeMembersCount = memberActivity.size;
    overview.averageWorkoutsPerMember = memberActivity.size > 0 
      ? overview.totalWorkouts / memberActivity.size 
      : 0;
    
    // Find most active day
    const maxDayActivity = Math.max(...dayActivity);
    const mostActiveDayIndex = dayActivity.indexOf(maxDayActivity);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    overview.mostActiveDay = {
      day: days[mostActiveDayIndex],
      count: maxDayActivity
    };
    
    // Find peak hour
    const maxHourActivity = Math.max(...hourActivity);
    const peakHourIndex = hourActivity.indexOf(maxHourActivity);
    overview.peakHour = {
      hour: peakHourIndex,
      count: maxHourActivity
    };
    
    res.json(overview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get activity patterns (heatmap data)
router.get('/:crewId/analytics/activity-patterns', auth, async (req, res) => {
  try {
    const { startDate, endDate, timezone = 'UTC' } = req.query;
    const crew = await Crew.findById(req.params.crewId);
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    if (!crew.isAdmin(req.user._id) && !crew.isMember(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const memberIds = crew.members.map(m => m._id);
    const workoutFilter = {
      user: { $in: memberIds }
    };
    if (Object.keys(dateFilter).length > 0) {
      workoutFilter.date = dateFilter;
    }
    
    const workouts = await Workout.find(workoutFilter).select('date user');
    
    // Create heatmap data (day of week x hour of day)
    const heatmapData = Array(7).fill(null).map(() => Array(24).fill(0));
    const dailyActivity = {}; // date string -> count
    const weeklyTrends = []; // array of { week, count }
    
    workouts.forEach(workout => {
      const date = new Date(workout.date);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      
      // Increment heatmap
      heatmapData[dayOfWeek][hour]++;
      
      // Track daily activity
      const dateStr = date.toISOString().split('T')[0];
      dailyActivity[dateStr] = (dailyActivity[dateStr] || 0) + 1;
    });
    
    // Calculate weekly trends
    const sortedDates = Object.keys(dailyActivity).sort();
    if (sortedDates.length > 0) {
      let currentWeek = [];
      let currentWeekStart = new Date(sortedDates[0]);
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      
      sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        if (weekStart.getTime() !== currentWeekStart.getTime()) {
          // New week
          weeklyTrends.push({
            weekStart: currentWeekStart.toISOString(),
            count: currentWeek.reduce((a, b) => a + b, 0)
          });
          currentWeek = [];
          currentWeekStart = weekStart;
        }
        
        currentWeek.push(dailyActivity[dateStr]);
      });
      
      // Don't forget the last week
      if (currentWeek.length > 0) {
        weeklyTrends.push({
          weekStart: currentWeekStart.toISOString(),
          count: currentWeek.reduce((a, b) => a + b, 0)
        });
      }
    }
    
    res.json({
      heatmap: heatmapData,
      dailyActivity,
      weeklyTrends
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get muscle group distribution
router.get('/:crewId/analytics/muscle-groups', auth, async (req, res) => {
  try {
    const { startDate, endDate, memberId } = req.query;
    const crew = await Crew.findById(req.params.crewId);
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    if (!crew.isAdmin(req.user._id) && !crew.isMember(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    // User filter
    const userFilter = memberId 
      ? { user: memberId }
      : { user: { $in: crew.members } };
    
    const workoutFilter = { ...userFilter };
    if (Object.keys(dateFilter).length > 0) {
      workoutFilter.date = dateFilter;
    }
    
    const workouts = await Workout.find(workoutFilter)
      .populate('exercises.exercise', 'name muscleGroup');
    
    // Calculate muscle group distribution - count exercises, not volume
    const muscleGroupData = {
      chest: { exerciseCount: 0, sets: 0, exercises: new Set(), workouts: 0 },
      back: { exerciseCount: 0, sets: 0, exercises: new Set(), workouts: 0 },
      shoulders: { exerciseCount: 0, sets: 0, exercises: new Set(), workouts: 0 },
      biceps: { exerciseCount: 0, sets: 0, exercises: new Set(), workouts: 0 },
      triceps: { exerciseCount: 0, sets: 0, exercises: new Set(), workouts: 0 },
      legs: { exerciseCount: 0, sets: 0, exercises: new Set(), workouts: 0 },
      abs: { exerciseCount: 0, sets: 0, exercises: new Set(), workouts: 0 }
    };
    
    // Track workouts per muscle group
    const workoutMuscleGroups = new Map();
    
    workouts.forEach(workout => {
      const workoutMuscles = new Set();
      
      workout.exercises.forEach(ex => {
        if (ex.exercise && ex.exercise.muscleGroup) {
          const muscle = ex.exercise.muscleGroup;
          if (muscleGroupData[muscle]) {
            // Count the exercise
            muscleGroupData[muscle].exerciseCount++;
            muscleGroupData[muscle].exercises.add(ex.exercise.name);
            muscleGroupData[muscle].sets += ex.sets.length;
            workoutMuscles.add(muscle);
          }
        }
      });
      
      // Count unique workouts per muscle group
      workoutMuscles.forEach(muscle => {
        muscleGroupData[muscle].workouts++;
      });
    });
    
    // Convert to response format with exercise counts
    const distribution = Object.entries(muscleGroupData).map(([muscle, data]) => ({
      muscle,
      exerciseCount: data.exerciseCount,
      sets: data.sets,
      uniqueExercises: data.exercises.size,
      workouts: data.workouts,
      topExercises: Array.from(data.exercises).slice(0, 5)
    }));
    
    res.json({ distribution });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get member engagement analytics
// Get member engagement analytics (ENHANCED VERSION)
router.get('/:crewId/analytics/member-engagement', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const crew = await Crew.findById(req.params.crewId)
      .populate('members', 'username profile.displayName profile.avatar rankings.overall');
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    // Only admins can see member engagement
    if (!crew.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Only admins can view member engagement' });
    }
    
    // Date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const memberIds = crew.members.map(m => m._id);
    const workoutFilter = {
      user: { $in: memberIds }
    };
    if (Object.keys(dateFilter).length > 0) {
      workoutFilter.date = dateFilter;
    }
    
    const workouts = await Workout.find(workoutFilter)
      .select('user date duration hypertrophyScore')
      .sort({ date: 1 }); // Sort by date for streak calculation
    
    // Build member engagement data
    const memberEngagement = crew.members.map(member => {
      const memberWorkouts = workouts.filter(w => 
        w.user.toString() === member._id.toString()
      );
      
      const totalVolume = memberWorkouts.reduce((sum, w) => 
        sum + (w.hypertrophyScore?.total || 0), 0
      );
      
      const totalDuration = memberWorkouts.reduce((sum, w) => 
        sum + (w.duration || 0), 0
      );
      
      // Calculate consistency (workouts per week)
      let consistency = 0;
      if (memberWorkouts.length > 0 && startDate && endDate) {
        const daysDiff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
        const weeks = daysDiff / 7;
        consistency = memberWorkouts.length / weeks;
      }
      
      // Calculate most frequent workout hour
      let mostFrequentHour = null;
      if (memberWorkouts.length > 0) {
        const hourCounts = new Array(24).fill(0);
        memberWorkouts.forEach(workout => {
          const hour = new Date(workout.date).getHours();
          hourCounts[hour]++;
        });
        const maxCount = Math.max(...hourCounts);
        mostFrequentHour = maxCount > 0 ? hourCounts.indexOf(maxCount) : null;
      }
      
      // Calculate current streak
      let currentStreak = 0;
      if (memberWorkouts.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Sort workouts by date (newest first)
        const sortedWorkouts = memberWorkouts
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Check if the last workout was today or yesterday
        const lastWorkoutDate = new Date(sortedWorkouts[0].date);
        lastWorkoutDate.setHours(0, 0, 0, 0);
        
        const daysSinceLastWorkout = Math.floor(
          (today - lastWorkoutDate) / (1000 * 60 * 60 * 24)
        );
        
        // Only count streak if last workout was within the last 2 days
        if (daysSinceLastWorkout <= 1) {
          currentStreak = 1;
          let previousDate = lastWorkoutDate;
          
          // Check previous workouts for consecutive days
          for (let i = 1; i < sortedWorkouts.length; i++) {
            const workoutDate = new Date(sortedWorkouts[i].date);
            workoutDate.setHours(0, 0, 0, 0);
            
            const daysBetween = Math.floor(
              (previousDate - workoutDate) / (1000 * 60 * 60 * 24)
            );
            
            // Allow 1 rest day between workouts for streak
            if (daysBetween <= 2) {
              currentStreak++;
              previousDate = workoutDate;
            } else {
              break; // Streak broken
            }
          }
        }
      }
      
      return {
        member: {
          _id: member._id,
          username: member.username,
          displayName: member.profile?.displayName,
          avatar: member.profile?.avatar,
          rank: member.rankings?.overall
        },
        stats: {
          totalWorkouts: memberWorkouts.length,
          totalVolume,
          totalDuration,
          averageDuration: memberWorkouts.length > 0 
            ? totalDuration / memberWorkouts.length 
            : 0,
          consistency,
          lastWorkout: memberWorkouts.length > 0
            ? memberWorkouts.sort((a, b) => b.date - a.date)[0].date
            : null,
          mostFrequentHour, // NEW: Hour they most frequently work out (0-23)
          currentStreak // NEW: Current workout streak in days
        }
      };
    });
    
    // Sort by total workouts
    memberEngagement.sort((a, b) => b.stats.totalWorkouts - a.stats.totalWorkouts);
    
    res.json({ members: memberEngagement });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get detailed activity for a specific day
router.get('/:crewId/analytics/day-details', auth, async (req, res) => {
  try {
    const { day, startDate, endDate } = req.query;
    const crew = await Crew.findById(req.params.crewId)
      .populate('members', 'username profile.displayName profile.avatar');
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    if (!crew.isAdmin(req.user._id) && !crew.isMember(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    
    const memberIds = crew.members.map(m => m._id);
    const workoutFilter = {
      user: { $in: memberIds }
    };
    if (Object.keys(dateFilter).length > 0) {
      workoutFilter.date = dateFilter;
    }
    
    const workouts = await Workout.find(workoutFilter)
      .populate('user', 'username profile.displayName profile.avatar')
      .populate('exercises.exercise', 'name muscleGroup')
      .select('user date duration exercises');
    
    // Filter workouts by day of week if specified
    const dayIndex = parseInt(day);
    const filteredWorkouts = workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate.getDay() === dayIndex;
    });
    
    // Group by hour
    const hourlyBreakdown = Array(24).fill(null).map(() => []);
    filteredWorkouts.forEach(workout => {
      const hour = new Date(workout.date).getHours();
      hourlyBreakdown[hour].push({
        user: workout.user,
        duration: workout.duration,
        exerciseCount: workout.exercises.length,
        date: workout.date
      });
    });
    
    // Get member breakdown
    const memberBreakdown = {};
    filteredWorkouts.forEach(workout => {
      const userId = workout.user._id.toString();
      if (!memberBreakdown[userId]) {
        memberBreakdown[userId] = {
          user: workout.user,
          count: 0,
          totalDuration: 0
        };
      }
      memberBreakdown[userId].count++;
      memberBreakdown[userId].totalDuration += workout.duration || 0;
    });
    
    res.json({
      totalWorkouts: filteredWorkouts.length,
      hourlyBreakdown,
      memberBreakdown: Object.values(memberBreakdown),
      peakHour: hourlyBreakdown.reduce((max, hour, index) => 
        hour.length > (hourlyBreakdown[max] || []).length ? index : max, 0
      )
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload crew logo
router.post('/:crewId/logo', auth, async (req, res) => {
  try {
    const crew = await Crew.findById(req.params.crewId);
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    // Check if user is admin
    if (!crew.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Only admins can update crew logo' });
    }
    
    // Upload image
    const logoUrl = await uploadImage(req.body.image, 'crew-logos');
    
    crew.logo = logoUrl;
    await crew.save();
    
    res.json({ logo: logoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join crew
router.post('/join', auth, async (req, res) => {
  try {
    const { joinCode } = req.body;
    
    // Check if user already has a crew
    const user = await User.findById(req.user._id);
    if (user.crew) {
      return res.status(400).json({ error: 'You can only be in one crew at a time' });
    }
    
    // Find crew by join code
    const crew = await Crew.findOne({ joinCode, isActive: true });
    if (!crew) {
      return res.status(404).json({ error: 'Invalid join code' });
    }
    
    // Check if crew is full
    if (crew.members.length >= crew.maxMembers) {
      return res.status(400).json({ error: 'Crew is full' });
    }
    
    // Add user to crew
    await crew.addMember(req.user._id);
    
    // Add user to crew conversation
    const conversation = await Conversation.findById(crew.conversation);
    if (conversation) {
      conversation.participants.push(req.user._id);
      await conversation.save();
    }
    
    // Update user's crew
    user.crew = crew._id;
    user.crewJoinedAt = new Date();
    await user.save();
    
    // Populate and return
    await crew.populate([
      { path: 'members', select: 'username profile.displayName profile.avatar' },
      { path: 'admins', select: 'username profile.displayName profile.avatar' },
      { path: 'createdBy', select: 'username profile.displayName profile.avatar' }
    ]);
    
    res.json(crew);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave crew
router.post('/:crewId/leave', auth, async (req, res) => {
  try {
    const crew = await Crew.findById(req.params.crewId);
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    // Check if user is member
    if (!crew.isMember(req.user._id)) {
      return res.status(400).json({ error: 'You are not a member of this crew' });
    }
    
    // Prevent creator from leaving (they must delete the crew)
    if (crew.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Crew creator cannot leave. Delete the crew instead.' });
    }
    
    // Remove user from crew
    await crew.removeMember(req.user._id);
    
    // Remove user from crew conversation
    const conversation = await Conversation.findById(crew.conversation);
    if (conversation) {
      conversation.participants = conversation.participants.filter(
        p => p.toString() !== req.user._id.toString()
      );
      await conversation.save();
    }
    
    // Update user's crew
    const user = await User.findById(req.user._id);
    user.crew = null;
    user.crewJoinedAt = null;
    await user.save();
    
    res.json({ message: 'Successfully left crew' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update crew details
router.put('/:crewId', auth, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const crew = await Crew.findById(req.params.crewId);
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    // Check if user is admin
    if (!crew.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Only admins can update crew details' });
    }
    
    // Check if new name is taken
    if (name && name !== crew.name) {
      const existingCrew = await Crew.findOne({ name });
      if (existingCrew) {
        return res.status(400).json({ error: 'Crew name already taken' });
      }
      crew.name = name;
    }
    
    if (description !== undefined) crew.description = description;
    if (isPrivate !== undefined) crew.isPrivate = isPrivate;
    
    await crew.save();
    
    // Populate and return
    await crew.populate([
      { path: 'members', select: 'username profile.displayName profile.avatar' },
      { path: 'admins', select: 'username profile.displayName profile.avatar' },
      { path: 'createdBy', select: 'username profile.displayName profile.avatar' }
    ]);
    
    res.json(crew);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove member from crew
router.delete('/:crewId/members/:userId', auth, async (req, res) => {
  try {
    const crew = await Crew.findById(req.params.crewId);
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    // Check if user is admin
    if (!crew.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }
    
    // Prevent removing creator
    if (crew.createdBy.toString() === req.params.userId) {
      return res.status(400).json({ error: 'Cannot remove crew creator' });
    }
    
    // Remove member
    await crew.removeMember(req.params.userId);
    
    // Remove from conversation
    const conversation = await Conversation.findById(crew.conversation);
    if (conversation) {
      conversation.participants = conversation.participants.filter(
        p => p.toString() !== req.params.userId
      );
      await conversation.save();
    }
    
    // Update user's crew
    const user = await User.findById(req.params.userId);
    if (user) {
      user.crew = null;
      user.crewJoinedAt = null;
      await user.save();
    }
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete crew
router.delete('/:crewId', auth, async (req, res) => {
  try {
    const crew = await Crew.findById(req.params.crewId);
    
    if (!crew || !crew.isActive) {
      return res.status(404).json({ error: 'Crew not found' });
    }
    
    // Check if user is creator
    if (crew.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only crew creator can delete the crew' });
    }
    
    // Remove crew from all members
    await User.updateMany(
      { crew: crew._id },
      { $set: { crew: null, crewJoinedAt: null } }
    );
    
    // Delete conversation
    if (crew.conversation) {
      await Conversation.findByIdAndDelete(crew.conversation);
    }
    
    // Soft delete crew
    crew.isActive = false;
    await crew.save();
    
    res.json({ message: 'Crew deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;