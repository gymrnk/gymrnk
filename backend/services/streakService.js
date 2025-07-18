const User = require('../models/User');
const moment = require('moment-timezone');

class StreakService {
  static async updateStreak(userId, workoutDate, timezone = 'UTC') {
    try {
      console.log('=== STREAK SERVICE UPDATE ===');
      console.log('userId:', userId);
      console.log('workoutDate:', workoutDate);
      console.log('timezone:', timezone);

      const user = await User.findById(userId);
      if (!user) {
        console.error('User not found with ID:', userId);
        throw new Error('User not found');
      }

      console.log('User found:', user.username);
      console.log('Current streak before update:', JSON.stringify(user.streak, null, 2));

      // Initialize streak if it doesn't exist
      if (!user.streak || !user.streak.current) {
        console.log('Initializing streak fields...');
        user.streak = {
          current: {
            count: 0,
            startDate: null,
            lastWorkoutDate: null
          },
          longest: {
            count: 0,
            startDate: null,
            endDate: null
          },
          timezone: timezone || 'UTC',
          history: []
        };
      }

      // Update timezone if provided
      if (timezone && timezone !== user.streak.timezone) {
        user.streak.timezone = timezone;
      }

      const userTimezone = user.streak.timezone || 'UTC';
      const workoutMoment = moment(workoutDate).tz(userTimezone).startOf('day');
      const today = moment().tz(userTimezone).startOf('day');
      
      console.log('Workout date (normalized):', workoutMoment.format());
      console.log('Today (normalized):', today.format());

      // Initialize streak if not exists or count is 0
      if (!user.streak.current.count || user.streak.current.count === 0) {
        console.log('Starting new streak...');
        user.streak.current = {
          count: 1,
          startDate: workoutMoment.toDate(),
          lastWorkoutDate: workoutMoment.toDate()
        };
        user.streak.longest = {
          count: 1,
          startDate: workoutMoment.toDate(),
          endDate: workoutMoment.toDate()
        };
      } else {
        const lastWorkoutMoment = moment(user.streak.current.lastWorkoutDate)
          .tz(userTimezone)
          .startOf('day');
        
        const daysSinceLastWorkout = workoutMoment.diff(lastWorkoutMoment, 'days');
        
        console.log('Last workout date:', lastWorkoutMoment.format());
        console.log('Days since last workout:', daysSinceLastWorkout);

        // If workout is on same day, no change needed
        if (daysSinceLastWorkout === 0) {
          console.log('Workout on same day - no streak change');
          return user;
        }
        
        // If it's the next day, increment streak
        if (daysSinceLastWorkout === 1) {
          console.log('Consecutive day - incrementing streak');
          user.streak.current.count += 1;
          user.streak.current.lastWorkoutDate = workoutMoment.toDate();
          
          // Update longest streak if current exceeds it
          if (user.streak.current.count > user.streak.longest.count) {
            console.log('New longest streak!');
            user.streak.longest = {
              count: user.streak.current.count,
              startDate: user.streak.current.startDate,
              endDate: workoutMoment.toDate()
            };
          }
        } else {
          // Streak broken - reset current streak
          console.log('Streak broken - resetting');
          user.streak.current = {
            count: 1,
            startDate: workoutMoment.toDate(),
            lastWorkoutDate: workoutMoment.toDate()
          };
        }
      }
      
      // Add to history
      user.streak.history.push({
        date: workoutMoment.toDate(),
        completed: true
      });
      
      // Keep only last 365 days of history
      if (user.streak.history.length > 365) {
        user.streak.history = user.streak.history.slice(-365);
      }
      
      console.log('Saving user with updated streak...');
      await user.save();
      
      console.log('Streak after update:', JSON.stringify(user.streak.current, null, 2));
      console.log('=== STREAK UPDATE COMPLETE ===');
      
      return user;
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }

  static async checkStreakStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Initialize if needed
      if (!user.streak || !user.streak.current) {
        return { isActive: false, daysUntilBreak: 0 };
      }

      const userTimezone = user.streak.timezone || 'UTC';
      const today = moment().tz(userTimezone).startOf('day');
      
      if (!user.streak.current.lastWorkoutDate) {
        return { isActive: false, daysUntilBreak: 0 };
      }
      
      const lastWorkoutMoment = moment(user.streak.current.lastWorkoutDate)
        .tz(userTimezone)
        .startOf('day');
      
      const daysSinceLastWorkout = today.diff(lastWorkoutMoment, 'days');
      
      // Streak is active if last workout was today or yesterday
      const isActive = daysSinceLastWorkout <= 1;
      const daysUntilBreak = isActive ? (1 - daysSinceLastWorkout) : 0;
      
      return { isActive, daysUntilBreak };
    } catch (error) {
      console.error('Error checking streak status:', error);
      throw error;
    }
  }

  static getMilestone(streakCount) {
    if (!streakCount || streakCount === 0) return null;
    
    if (streakCount >= 100) {
      return { emoji: '👑', color: 'black', label: '100 Day Legend' };
    } else if (streakCount >= 30) {
      return { emoji: '🏆', color: 'yellow', label: '30 Day Warrior' };
    } else if (streakCount >= 7) {
      return { emoji: '⭐', color: 'blue', label: '7 Day Starter' };
    }
    return null;
  }

  static async getStreakCalendar(userId, month, year) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const userTimezone = user.streak?.timezone || 'UTC';
      const startOfMonth = moment.tz({ year, month: month - 1, day: 1 }, userTimezone).startOf('day');
      const endOfMonth = startOfMonth.clone().endOf('month');
      
      const calendar = [];
      const history = user.streak?.history || [];
      
      // Create a map of workout dates for quick lookup
      const workoutDates = new Set(
        history.map(h => moment(h.date).tz(userTimezone).format('YYYY-MM-DD'))
      );
      
      // Generate calendar data
      for (let date = startOfMonth.clone(); date.isSameOrBefore(endOfMonth); date.add(1, 'day')) {
        calendar.push({
          date: date.format('YYYY-MM-DD'),
          day: date.date(),
          hasWorkout: workoutDates.has(date.format('YYYY-MM-DD')),
          isToday: date.isSame(moment().tz(userTimezone), 'day'),
          isFuture: date.isAfter(moment().tz(userTimezone), 'day')
        });
      }
      
      return calendar;
    } catch (error) {
      console.error('Error getting streak calendar:', error);
      throw error;
    }
  }
}

module.exports = StreakService;