const mongoose = require('mongoose');

const MissionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Mission title is required'],
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['transportation', 'energy', 'food', 'waste', 'water', 'shopping', 'general'],
    default: 'general'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'legendary'],
    default: 'easy'
  },
  xpReward: { type: Number, default: 50 },
  coinReward: { type: Number, default: 25 },
  carbonImpact: { type: Number, default: 0 },   // kg CO2 offset
  waterImpact: { type: Number, default: 0 },     // litres saved
  energyImpact: { type: Number, default: 0 },   // kWh saved
  icon: { type: String, default: '🌱' },
  isDaily: { type: Boolean, default: true },
  isRecurring: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Mission', MissionSchema);
