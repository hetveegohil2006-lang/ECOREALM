const mongoose = require('mongoose');

const WorldRegionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String, default: '🌍' },
  category: {
    type: String,
    enum: ['industrial', 'forest', 'ocean', 'wildlife', 'energy', 'netzero'],
    required: true
  },
  restorationPercent: { type: Number, default: 0, min: 0, max: 100 },
  treesPlanted: { type: Number, default: 0 },
  carbonReduced: { type: Number, default: 0 },    // kg CO2
  wasteRecycled: { type: Number, default: 0 },    // kg
  waterSaved: { type: Number, default: 0 },       // litres
  contributors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isLocked: { type: Boolean, default: false },
  unlockCost: { type: Number, default: 0 },       // Eco coins
  color: { type: String, default: '#00ff88' },
  position: { type: Object, default: { x: 0, y: 0 } } // map coordinates
}, { timestamps: true });

module.exports = mongoose.model('WorldRegion', WorldRegionSchema);
