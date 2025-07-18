// routes/rankings.js
const express = require('express');
const RankingSystem = require('../services/rankingSystem');
const Ranking = require('../models/Ranking');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user's current rankings
router.get('/my', auth, async (req, res) => {
  try {
    const rankings = await Ranking.find({ user: req.user._id })
      .sort({ period: 1, muscleGroup: 1 });
    
    // Group by period
    const groupedRankings = {
      weekly: {},
      monthly: {},
      allTime: {}
    };
    
    rankings.forEach(ranking => {
      groupedRankings[ranking.period][ranking.muscleGroup] = {
        score: ranking.score,
        rank: ranking.rank,
        percentile: ranking.percentile,
        tier: ranking.tier,
        division: ranking.division,
        calculatedAt: ranking.calculatedAt
      };
    });
    
    res.json(groupedRankings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Force update rankings (admin only - you'd implement proper admin middleware)
router.post('/update', auth, async (req, res) => {
  try {
    const { period = 'weekly' } = req.body;
    
    // TODO: Add admin check here
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }
    
    // Update all muscle groups
    const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
    
    for (const muscleGroup of muscleGroups) {
      await RankingSystem.updateGlobalRankings(period, muscleGroup);
    }
    
    res.json({ message: 'Rankings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Force recalculate all scores (admin only)
router.post('/recalculate-all', auth, async (req, res) => {
  try {
    const { period = 'weekly' } = req.body;
    
    // TODO: Add admin check here
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }
    
    const startTime = Date.now();
    const count = await RankingSystem.recalculateAllUserScores(period);
    await RankingSystem.updateAllRankingsParallel(period);
    const duration = Date.now() - startTime;
    
    res.json({ 
      message: 'Scores recalculated successfully',
      usersProcessed: count,
      period,
      duration: `${duration}ms`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Force recalculate current user's scores
router.post('/recalculate-my', auth, async (req, res) => {
  try {
    const periods = ['weekly', 'monthly', 'allTime'];
    const results = {};
    
    for (const period of periods) {
      const scores = await RankingSystem.updateUserRankings(req.user._id, period);
      results[period] = scores;
      
      // Update rank for overall muscle group
      await RankingSystem.fastUpdateUserRank(req.user._id, period, 'overall');
    }
    
    res.json({ 
      message: 'Your scores have been recalculated',
      scores: results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get ranking statistics (admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    // TODO: Add admin check here
    
    const stats = {};
    const periods = ['weekly', 'monthly', 'allTime'];
    
    for (const period of periods) {
      const totalUsers = await Ranking.countDocuments({ 
        period, 
        muscleGroup: 'overall' 
      });
      
      const activeUsers = await Ranking.countDocuments({ 
        period, 
        muscleGroup: 'overall',
        score: { $gt: 0 }
      });
      
      const recentlyCalculated = await Ranking.countDocuments({
        period,
        muscleGroup: 'overall',
        calculatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      
      stats[period] = {
        totalUsers,
        activeUsers,
        recentlyCalculated,
        percentActive: totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(1) : 0
      };
    }
    
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;