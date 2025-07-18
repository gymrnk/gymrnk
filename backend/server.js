// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const socketAuth = require('./middleware/socketAuth');
const messageHandlers = require('./socket/messageHandlers');

// Import services
const WeeklySnapshotService = require('./services/weeklySnapshotService');
const RankingSystem = require('./services/rankingSystem');
const SmartRankingUpdater = require('./services/smartRankingUpdater');
const continuousExpirationService = require('./services/continuousExpirationService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const exerciseRoutes = require('./routes/exercises');
const rankingRoutes = require('./routes/rankings');
const streakRoutes = require('./routes/streaks');
const leaderboardRoutes = require('./routes/leaderboards');
const workoutRoutes = require('./routes/workouts'); 
const messageRoutes = require('./routes/messages');
const templateRoutes = require('./routes/templates');
const crewRoutes = require('./routes/crews');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - Updated for mobile apps
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, allow all origins for mobile app compatibility
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

// Request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create HTTP server
const server = http.createServer(app);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Health check endpoint - MUST be before other routes
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 8080,
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  res.status(200).json(healthcheck);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'GymRnk API Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/*'
    }
  });
});

// Debug logging
console.log('Starting server initialization...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 8080);
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
console.log('JWT Secret exists:', !!process.env.JWT_SECRET);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/crews', crewRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      callback(null, true); // Allow all origins
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.io middleware
io.use(socketAuth);

// Socket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  // Join user's personal room
  socket.join(`user:${socket.userId}`);
  
  // Join conversation rooms
  socket.on('join:conversations', async (conversationIds) => {
    for (const convId of conversationIds) {
      socket.join(`conversation:${convId}`);
    }
  });
  
  // Message handlers
  messageHandlers(io, socket);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// Make io accessible in routes
app.set('io', io);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL;

if (!MONGODB_URI) {
  console.error('FATAL ERROR: MONGODB_URI is not defined');
  console.error('Please set MONGODB_URI environment variable');
  // Keep server running to see logs in Railway
  setInterval(() => {
    console.log('Waiting for MONGODB_URI to be set...');
  }, 30000);
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('MongoDB connected successfully');
      
      // Set up cron jobs after DB connection
      setupCronJobs();
      
      // Optimize indexes
      RankingSystem.ensureOptimalIndexes()
        .then(() => console.log('Database indexes optimized'))
        .catch(err => console.error('Error optimizing indexes:', err));
    })
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      // Keep trying to connect
      setInterval(() => {
        console.log('Retrying MongoDB connection...');
        mongoose.connect(MONGODB_URI)
          .then(() => {
            console.log('MongoDB reconnected successfully');
            setupCronJobs();
          })
          .catch(err => console.log('MongoDB reconnection failed:', err.message));
      }, 5000);
    });
}

// Mongoose event handlers
mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Cron Jobs Setup
function setupCronJobs() {
  // Prevent multiple cron job setups
  if (global.cronJobsInitialized) {
    console.log('Cron jobs already initialized');
    return;
  }
  global.cronJobsInitialized = true;

  // ===== NEW CRON JOB - CONTINUOUS EXPIRATION (This fixes the rolling window issue!) =====
  cron.schedule('*/10 * * * *', async () => {
    console.log('Processing workout expirations...');
    try {
      const results = await continuousExpirationService.processExpirations();
      
      // Clear cache if updates were made
      if (results.weekly.updated > 0 || results.monthly.updated > 0) {
        RankingSystem.clearCache();
      }
    } catch (error) {
      console.error('Error processing expirations:', error);
    }
  });

  // Schedule weekly snapshot finalization - Runs every Sunday at 2 AM
  cron.schedule('0 2 * * 0', async () => {
    console.log('Running weekly snapshot finalization...');
    try {
      const count = await WeeklySnapshotService.finalizeCompletedWeeks();
      console.log(`Finalized ${count} weekly snapshots`);
    } catch (error) {
      console.error('Error finalizing weekly snapshots:', error);
    }
  });

  // SMART WEEKLY RECALCULATION - Runs every hour but only processes users who need it
  cron.schedule('0 * * * *', async () => {
    console.log('Starting smart weekly score update...');
    
    try {
      const startTime = Date.now();
      let processed = 0;
      let skipped = 0;
      
      // Get users who might need weekly score updates
      const userIds = await SmartRankingUpdater.getUsersNeedingUpdate('weekly');
      console.log(`Checking ${userIds.length} users for weekly updates`);
      
      // Process in small batches to spread load
      const batchSize = 20;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        
        const results = await SmartRankingUpdater.processBatch(batch, ['weekly']);
        processed += results.success;
        skipped += results.skipped;
        
        // Tiny delay to prevent CPU spikes
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Only update global rankings if scores changed
      if (processed > 0) {
        await RankingSystem.incrementalGlobalRankingUpdate('weekly', 'overall');
        RankingSystem.clearCache({ period: 'weekly' });
      }
      
      const duration = Date.now() - startTime;
      console.log(`Smart weekly update: ${processed} updated, ${skipped} skipped in ${duration}ms`);
      
    } catch (error) {
      console.error('Error in smart weekly update:', error);
    }
  });

  // ROLLING WINDOW CLEANUP - Runs every 4 hours, processes users in chunks
  cron.schedule('0 */4 * * *', async () => {
    console.log('Starting rolling window cleanup...');
    
    try {
      const startTime = Date.now();
      
      // Spread the load by processing different user segments each run
      const hour = new Date().getHours();
      const segment = Math.floor(hour / 4) % 6; // 0-5, cycles through day
      
      // Get users in this segment (1/6 of total users)
      const users = await SmartRankingUpdater.getUsersInSegment(segment, 6);
      
      console.log(`Processing segment ${segment + 1}/6 (${users.length} users)`);
      
      let updated = 0;
      const batchSize = 25;
      
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async (user) => {
            // Only check users who might have old workouts
            if (!user.lastWorkoutDate || 
                user.lastWorkoutDate < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
              
              await RankingSystem.updateUserRankings(user._id, 'weekly');
              
              // Also update monthly if needed
              if (user.lastWorkoutDate && 
                  user.lastWorkoutDate < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
                await RankingSystem.updateUserRankings(user._id, 'monthly');
              }
              
              return true;
            }
            return false;
          })
        );
        
        updated += results.filter(r => r.status === 'fulfilled' && r.value).length;
        
        // Micro-pause between batches
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      
      // Update rankings if any scores changed
      if (updated > 0) {
        await RankingSystem.incrementalGlobalRankingUpdate('weekly', 'overall');
        await RankingSystem.incrementalGlobalRankingUpdate('monthly', 'overall');
      }
      
      const duration = Date.now() - startTime;
      console.log(`Cleanup segment ${segment + 1} complete: ${updated} users in ${duration}ms`);
      
    } catch (error) {
      console.error('Error in rolling window cleanup:', error);
    }
  });

  // Full ranking recalculation - runs once daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('Running daily full ranking recalculation...');
    try {
      const periods = ['weekly', 'monthly', 'allTime'];
      
      for (const period of periods) {
        await RankingSystem.updateAllRankingsParallel(period, 3);
        
        // 30 second break between periods to spread load
        if (period !== 'allTime') {
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }
      
      console.log('Daily full ranking recalculation completed');
    } catch (error) {
      console.error('Error in full ranking recalculation:', error);
    }
  });

  // Quick ranking update - runs every 15 minutes (reduced frequency)
  cron.schedule('*/15 * * * *', async () => {
    if (mongoose.connection.readyState !== 1) {
      console.log('Skipping ranking update - database not connected');
      return;
    }
    
    console.log('Running incremental ranking update...');
    try {
      const periods = ['weekly', 'monthly', 'allTime'];
      const muscleGroups = ['overall', 'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'abs'];
      
      let totalChanges = 0;
      const startTime = Date.now();
      
      for (const period of periods) {
        for (let i = 0; i < muscleGroups.length; i += 2) {
          const batch = muscleGroups.slice(i, i + 2);
          
          try {
            const promises = batch.map(muscleGroup => 
              RankingSystem.incrementalGlobalRankingUpdate(period, muscleGroup)
                .catch(err => {
                  console.error(`Failed to update ${muscleGroup} (${period}):`, err.message);
                  return 0;
                })
            );
            
            const results = await Promise.all(promises);
            totalChanges += results.reduce((sum, changes) => sum + changes, 0);
            
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (batchError) {
            console.error(`Batch update failed:`, batchError.message);
          }
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`Updated ${totalChanges} rankings in ${duration}ms`);
      
      if (totalChanges > 0) {
        RankingSystem.clearCache();
      }
    } catch (error) {
      console.error('Error in ranking update:', error.message);
    }
  });

  // Weekly reset check - runs every Monday at 12:05 AM
  cron.schedule('5 0 * * 1', async () => {
    console.log('Running weekly ranking refresh...');
    try {
      await RankingSystem.updateAllRankingsParallel('weekly', 4);
    } catch (error) {
      console.error('Error refreshing weekly rankings:', error);
    }
  });

  console.log('Cron jobs initialized successfully');
}

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});

// Keep process alive - heartbeat every 30 seconds
setInterval(() => {
  const used = process.memoryUsage();
  console.log(`Server heartbeat - Memory: ${Math.round(used.rss / 1024 / 1024)}MB, Uptime: ${Math.round(process.uptime())}s`);
}, 30000);

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  console.log(`${signal} received: starting graceful shutdown`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close database connection
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
  }
  
  // Exit process
  process.exit(0);
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for testing
module.exports = app;