const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const IslandSchema = new mongoose.Schema({
  trees: { type: Number, default: 1 },
  flowers: { type: Number, default: 1 },
  waterCleanliness: { type: Number, default: 25 },
  meadowGreenness: { type: Number, default: 25 },
  solarPanels: { type: Number, default: 0 },
  windTurbines: { type: Number, default: 0 }
}, { _id: false });

const BadgeSchema = new mongoose.Schema({
  id: String,
  name: String,
  icon: String,
  earnedAt: { type: Date, default: Date.now }
}, { _id: false });

const AchievementSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  icon: String,
  earnedAt: { type: Date, default: Date.now }
}, { _id: false });

const HistorySchema = new mongoose.Schema({
  name: String,
  timestamp: String,
  coins: { type: Number, default: 0 },
  xp: { type: Number, default: 0 }
}, { _id: false });

const DiagnosticSchema = new mongoose.Schema({
  transportation: { type: Number, default: 0 },
  energy: { type: Number, default: 0 },
  food: { type: Number, default: 0 },
  waste: { type: Number, default: 0 },
  water: { type: Number, default: 0 },
  shopping: { type: Number, default: 0 },
  carbonScore: { type: Number, default: 0 },
  rating: { type: String, default: '' },
  classification: { type: String, default: '' },
  completedAt: { type: Date, default: Date.now }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: ''
  },
  googleId: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },

  // RPG Progression
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  ecoPoints: { type: Number, default: 0 },
  coins: { type: Number, default: 100 },
  rank: { type: String, default: 'Seed Guardian' },
  customTitle: { type: String, default: null },

  // Environmental Impact
  carbonOffset: { type: Number, default: 0 },
  waterSaved: { type: Number, default: 0 },
  energyConserved: { type: Number, default: 0 },
  startingCarbonScore: { type: Number, default: 16.0 },

  // Guardian Data
  badges: [BadgeSchema],
  achievements: [AchievementSchema],
  history: [HistorySchema],
  island: { type: IslandSchema, default: () => ({}) },
  diagnostic: { type: DiagnosticSchema, default: null },

  // State flags
  netZeroUnlocked: { type: Boolean, default: false },
  customTitleBought: { type: Boolean, default: false },
  scanCompleted: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpire: { type: Date, default: null },

  // Refresh tokens
  refreshTokens: [{ type: String }]
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update rank based on level
UserSchema.methods.syncRank = function () {
  if (this.level >= 50) this.rank = 'Planet Savior';
  else if (this.level >= 30) this.rank = 'Earth Defender';
  else if (this.level >= 20) this.rank = 'Climate Ranger';
  else if (this.level >= 10) this.rank = 'Forest Protector';
  else if (this.level >= 5) this.rank = 'Sprout Keeper';
  else this.rank = 'Seed Guardian';
  return this.rank;
};

// Recalculate level from XP
UserSchema.methods.syncLevel = function () {
  this.level = Math.floor(this.xp / 100) + 1;
  this.syncRank();
};

module.exports = mongoose.model('User', UserSchema);
