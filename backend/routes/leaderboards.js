const express = require('express');
const RankingSystem = require('../services/rankingSystem');
const Ranking = require('../models/Ranking');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get leaderboard
router.get('/', auth, async (req, res) => {
  try {
    const {
      muscleGroup = 'overall',
      period = 'weekly',
      limit = 100,
      friendsOnly = false,
      crewOnly = false
    } = req.query;
    
    // For crew leaderboard, first check if user has a crew
    let crewId = null;
    if (crewOnly === 'true') {
      const user = await User.findById(req.user._id).populate('crew');
      if (!user.crew) {
        return res.json({
          leaderboard: [],
          currentUserRank: null,
          currentUserInfo: null,
          userInLeaderboard: false,
          crewInfo: null
        });
      }
      crewId = user.crew._id;
    }
    
    // Use cached leaderboard for better performance
    const leaderboard = await RankingSystem.getCachedLeaderboard({
      muscleGroup,
      period,
      limit: parseInt(limit),
      friendsOnly: friendsOnly === 'true',
      crewOnly: crewOnly === 'true',
      crewId,
      userId: req.user._id
    });
    
    // Find current user's position in the returned leaderboard
    const userInLeaderboard = leaderboard.findIndex(
      entry => entry.user.id.toString() === req.user._id.toString()
    );
    
    // Get current user's actual rank info FOR THE SPECIFIC PERIOD
    let currentUserInfo = null;
    const userRanking = await Ranking.findOne({
      user: req.user._id,
      period, // This ensures we get the rank for the specific period
      muscleGroup
    }).populate('user', 'username profile.displayName profile.avatar');
    
    // ALWAYS get the all-time ranking for tier/division
    const allTimeRanking = await Ranking.findOne({
      user: req.user._id,
      period: 'allTime',
      muscleGroup
    });
    
    if (userRanking) {
      // For friends/crew view, calculate rank among friends/crew
      let displayRank = userRanking.rank; // This is the global rank for the period
      
      if (friendsOnly === 'true') {
        const user = await User.findById(req.user._id);
        const friendIds = [...(user.friends || []), req.user._id];
        
        // Get all friend rankings for this period/muscle
        const friendRankings = await Ranking.find({
          user: { $in: friendIds },
          period,
          muscleGroup
        }).sort({ score: -1 });
        
        // Find user's position among friends
        const friendRankIndex = friendRankings.findIndex(
          r => r.user.toString() === req.user._id.toString()
        );
        
        displayRank = friendRankIndex !== -1 ? friendRankIndex + 1 : null;
      } else if (crewOnly === 'true' && crewId) {
        // Get crew members
        const crew = await User.find({ crew: crewId }).select('_id');
        const crewMemberIds = crew.map(u => u._id);
        
        // Get all crew rankings for this period/muscle
        const crewRankings = await Ranking.find({
          user: { $in: crewMemberIds },
          period,
          muscleGroup
        }).sort({ score: -1 });
        
        // Find user's position among crew
        const crewRankIndex = crewRankings.findIndex(
          r => r.user.toString() === req.user._id.toString()
        );
        
        displayRank = crewRankIndex !== -1 ? crewRankIndex + 1 : null;
      } else {
        // For global view: if user is in the visible leaderboard, show their position there
        // Otherwise show their actual global rank
        if (userInLeaderboard !== -1) {
          displayRank = userInLeaderboard + 1;
        }
        // If not in visible leaderboard, displayRank remains as their global rank
      }
      
      currentUserInfo = {
        rank: displayRank, // This is now the contextual rank
        user: {
          id: userRanking.user._id,
          username: userRanking.user.username,
          displayName: userRanking.user.profile?.displayName,
          avatar: userRanking.user.profile?.avatar
        },
        score: userRanking.score, // Score for the selected period
        // IMPORTANT: Always use all-time tier and division
        tier: allTimeRanking?.tier || 'Iron',
        division: allTimeRanking?.division || 5,
        percentile: userRanking.percentile, // Percentile for the selected period
        // Include the actual global rank for reference
        globalRank: userRanking.rank
      };
    }
    
    // Update leaderboard entries to always show all-time tiers
    const leaderboardWithAllTimeTiers = await Promise.all(
      leaderboard.map(async (entry) => {
        const userAllTimeRank = await Ranking.findOne({
          user: entry.user.id,
          period: 'allTime',
          muscleGroup
        }).select('tier division');
        
        return {
          ...entry,
          // Override with all-time tier/division
          tier: userAllTimeRank?.tier || entry.tier,
          division: userAllTimeRank?.division || entry.division
        };
      })
    );
    
    const response = {
      leaderboard: leaderboardWithAllTimeTiers,
      currentUserRank: userInLeaderboard !== -1 ? userInLeaderboard + 1 : null,
      currentUserInfo: currentUserInfo,
      userInLeaderboard: userInLeaderboard !== -1
    };
    
    // Add crew info if crew leaderboard
    if (crewOnly === 'true' && crewId) {
      const user = await User.findById(req.user._id).populate('crew', 'name logo description');
      response.crewInfo = user.crew;
    }
    
    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's position across all muscle groups
router.get('/my-positions', auth, async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    const positions = {};
    
    for (const muscleGroup of muscleGroups) {
      const ranking = await Ranking.findOne({
        user: req.user._id,
        period,
        muscleGroup
      });
      
      if (ranking) {
        positions[muscleGroup] = {
          rank: ranking.rank,
          percentile: ranking.percentile,
          tier: ranking.tier,
          division: ranking.division,
          score: ranking.score
        };
      }
    }
    
    res.json(positions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;