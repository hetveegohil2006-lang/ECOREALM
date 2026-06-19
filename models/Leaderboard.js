const mongoose = require('mongoose');

const LeaderboardEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar: { type: String, default: '' },
  rank: { type: String, default: 'Seed Guardian' },
  level: { type: Number, default: 1 },
  score: { type: Number, default: 0 },       // Main sorting score
  carbonOffset: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  badgeCount: { type: Number, default: 0 },
  position: { type: Number, default: 0 }
}, { _id: false });

const LeaderboardSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['global', 'weekly', 'monthly', 'country'],
    default: 'global'
  },
  country: { type: String, default: null },
  period: { type: String, default: null },   // e.g. '2025-W24' for weekly
  entries: [LeaderboardEntrySchema],
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);
