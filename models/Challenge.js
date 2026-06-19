const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true
  },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ['individual', 'community', 'seasonal', 'boss'],
    default: 'individual'
  },
  category: {
    type: String,
    enum: ['transportation', 'energy', 'food', 'waste', 'water', 'shopping', 'general'],
    default: 'general'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'legendary'],
    default: 'medium'
  },
  xpReward: { type: Number, default: 200 },
  coinReward: { type: Number, default: 100 },
  badgeReward: { type: String, default: null },
  goal: { type: Number, required: true },       // e.g. log 10 meatless days
  unit: { type: String, default: 'actions' },   // e.g. 'days', 'kg', 'litres'
  icon: { type: String, default: '🏆' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    progress: { type: Number, default: 0 },
    completedAt: { type: Date, default: null }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Challenge', ChallengeSchema);
