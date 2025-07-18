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

// Add member
crewSchema.methods.addMember = async function(userId) {
  if (this.members.length >= this.maxMembers) {
    throw new Error('Crew is at maximum capacity');
  }
  
  if (!this.isMember(userId)) {
    this.members.push(userId);
    await this.save();
  }
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

module.exports = mongoose.model('Crew', crewSchema);