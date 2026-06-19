const mongoose = require('mongoose');

const DiagnosticResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: {
    transportation: { type: Number, required: true },   // miles/km per week
    energy: { type: Number, required: true },           // kWh per month
    food: { type: Number, required: true },             // meat meals per week
    waste: { type: Number, required: true },            // bags of trash per week
    water: { type: Number, required: true },            // litres per day
    shopping: { type: Number, required: true }          // new items per month
  },
  scores: {
    transportation: { type: Number, default: 0 },
    energy: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    waste: { type: Number, default: 0 },
    water: { type: Number, default: 0 },
    shopping: { type: Number, default: 0 }
  },
  totalCarbonScore: { type: Number, required: true },  // tonnes CO2 per year
  sustainabilityRating: {
    type: String,
    enum: ['Excellent', 'Good', 'Average', 'High Impact', 'Critical'],
    required: true
  },
  guardianClassification: {
    type: String,
    required: true
  },
  recommendations: [{ type: String }],
  completedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('DiagnosticResult', DiagnosticResultSchema);
