const mongoose = require('mongoose');

const crewSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 500
  },
  logo: {
    type: String, // S3 URL
    default: null
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pendingMembers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      maxlength: 200
    }
  }],
  maxMembers: {
    type: Number,
    default: 100,
    max: 100
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  stats: {
    totalWorkouts: { type: Number, default: 0 },
    weeklyActive: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 }
  },
  joinCode: {
    type: String,
    unique: true,
    sparse: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  requireApproval: {
    type: Boolean,
    default: false
  },
  challenges: [{
    name: String,
    description: String,
    startDate: Date,
    endDate: Date,
    type: {
      type: String,
      enum: ['total_workouts', 'muscle_focus', 'consistency', 'volume']
    },
    target: Number,
    progress: Number,
    participants: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      progress: Number,
      joinedAt: { type: Date, default: Date.now }, // ADD THIS LINE
      completedAt: Date
    }],
    rewards: {
      xp: Number,
      badge: String
    },
    isActive: Boolean,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  achievements: [{
    type: {
      type: String,
      enum: ['milestone', 'competition', 'consistency', 'special']
    },
    name: String,
    description: String,
    icon: String,
    unlockedAt: Date,
    unlockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  level: {
    type: Number,
    default: 1
  },
  xp: {
    type: Number,
    default: 0
  },
  weeklyGoals: {
    workouts: Number,
    totalVolume: Number,
    activeDays: Number
  },
  announcements: [{
    title: String,
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    isPinned: Boolean,
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  events: [{
    name: String,
    description: String,
    date: Date,
    location: String,
    type: {
      type: String,
      enum: ['workout', 'competition', 'social', 'meeting']
    },
    attendees: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: {
        type: String,
        enum: ['going', 'maybe', 'not_going'],
        default: 'maybe'
      }
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  sharedPlans: [{
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkoutPlan' },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sharedAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
crewSchema.index({ name: 1 });
crewSchema.index({ members: 1 });
crewSchema.index({ admins: 1 });
crewSchema.index({ joinCode: 1 });
crewSchema.index({ 'pendingMembers.user': 1 });

// Generate unique join code
crewSchema.methods.generateJoinCode = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  this.joinCode = code;
  return code;
};

// Check if user is admin
crewSchema.methods.isAdmin = function(userId) {
  return this.admins.some(admin => admin.toString() === userId.toString());
};

// Check if user is member
crewSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.toString() === userId.toString());
};

// Check if user has pending request
crewSchema.methods.hasPendingRequest = function(userId) {
  return this.pendingMembers.some(pending => 
    pending.user.toString() === userId.toString()
  );
};

// Add member
crewSchema.methods.addMember = async function(userId) {
  if (this.members.length >= this.maxMembers) {
    throw new Error('Crew is at maximum capacity');
  }
  
  if (!this.isMember(userId)) {
    this.members.push(userId);
    // Remove from pending if they were there
    this.pendingMembers = this.pendingMembers.filter(pending => 
      pending.user.toString() !== userId.toString()
    );
    await this.save();
  }
};

// Request to join (for crews with approval required)
crewSchema.methods.requestToJoin = async function(userId, message = '') {
  if (this.isMember(userId)) {
    throw new Error('Already a member of this crew');
  }
  
  if (this.hasPendingRequest(userId)) {
    throw new Error('Already have a pending request');
  }
  
  if (this.members.length >= this.maxMembers) {
    throw new Error('Crew is at maximum capacity');
  }
  
  this.pendingMembers.push({
    user: userId,
    message,
    requestedAt: new Date()
  });
  
  await this.save();
};

// Approve pending member
crewSchema.methods.approveMember = async function(userId, approvingAdminId) {
  if (!this.isAdmin(approvingAdminId)) {
    throw new Error('Only admins can approve members');
  }
  
  const pendingIndex = this.pendingMembers.findIndex(pending => 
    pending.user.toString() === userId.toString()
  );
  
  if (pendingIndex === -1) {
    throw new Error('No pending request found');
  }
  
  // Add to members and remove from pending
  await this.addMember(userId);
};

// Reject pending member
crewSchema.methods.rejectMember = async function(userId, rejectingAdminId) {
  if (!this.isAdmin(rejectingAdminId)) {
    throw new Error('Only admins can reject members');
  }
  
  this.pendingMembers = this.pendingMembers.filter(pending => 
    pending.user.toString() !== userId.toString()
  );
  
  await this.save();
};

// Remove member
crewSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(member => 
    member.toString() !== userId.toString()
  );
  
  // Also remove from admins if they were one
  this.admins = this.admins.filter(admin => 
    admin.toString() !== userId.toString()
  );
  
  await this.save();
};

// Add challenge
crewSchema.methods.addChallenge = async function(challengeData, creatorId) {
  if (!this.isAdmin(creatorId)) {
    throw new Error('Only admins can create challenges');
  }
  
  this.challenges.push({
    ...challengeData,
    createdBy: creatorId,
    isActive: true,
    progress: 0,
    participants: []
  });
  
  await this.save();
};

// Join challenge
crewSchema.methods.joinChallenge = async function(challengeId, userId) {
  if (!this.isMember(userId)) {
    throw new Error('Only members can join challenges');
  }
  
  const challenge = this.challenges.id(challengeId);
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  
  const alreadyParticipating = challenge.participants.some(p => 
    p.user.toString() === userId.toString()
  );
  
  if (!alreadyParticipating) {
    challenge.participants.push({
      user: userId,
      progress: 0
    });
    await this.save();
  }
};

// Update challenge progress
crewSchema.methods.updateChallengeProgress = async function(challengeId, userId, progress) {
  const challenge = this.challenges.id(challengeId);
  if (!challenge) return;
  
  const participant = challenge.participants.find(p => 
    p.user.toString() === userId.toString()
  );
  
  if (participant) {
    participant.progress = progress;
    if (progress >= challenge.target && !participant.completedAt) {
      participant.completedAt = new Date();
    }
  }
  
  // Update overall challenge progress
  challenge.progress = challenge.participants.reduce((sum, p) => sum + p.progress, 0);
  
  await this.save();
};

// Add XP and level up
crewSchema.methods.addXP = async function(amount) {
  this.xp += amount;
  
  // Level up calculation (100 XP per level, increasing)
  const xpForNextLevel = this.level * 100;
  if (this.xp >= xpForNextLevel) {
    this.level++;
    this.xp -= xpForNextLevel;
    
    // Unlock achievement for leveling up
    const levelAchievement = {
      type: 'milestone',
      name: `Level ${this.level} Crew`,
      description: `Reached crew level ${this.level}`,
      icon: '🏆',
      unlockedAt: new Date()
    };
    this.achievements.push(levelAchievement);
  }
  
  await this.save();
};

// Calculate crew score for leaderboards
crewSchema.methods.calculateScore = function() {
  const memberScore = this.members.length * 10;
  const activityScore = this.stats.weeklyActive * 50;
  const challengeScore = this.challenges.filter(c => c.isActive).length * 100;
  const levelScore = this.level * 200;
  
  return memberScore + activityScore + challengeScore + levelScore;
};

module.exports = mongoose.model('Crew', crewSchema);