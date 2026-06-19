const mongoose = require('mongoose');

const EmissionBreakdownSchema = new mongoose.Schema({
  travel: { type: Number, default: 0 },
  food: { type: Number, default: 0 },
  electricity: { type: Number, default: 0 },
  water: { type: Number, default: 0 },
  waste: { type: Number, default: 0 },
  shopping: { type: Number, default: 0 }
}, { _id: false });

const CarbonAssessmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  annualScore: { type: Number, required: true },   // tonnes CO2/year
  monthlyScore: { type: Number, required: true },  // tonnes CO2/month
  breakdown: EmissionBreakdownSchema,
  improvementAreas: [{ type: String }],
  comparedToAverage: { type: Number, default: 0 }, // % above/below global avg (4.8t)
  period: { type: String },                        // e.g. '2025-06'
  notes: { type: String, default: '' }
}, { timestamps: true });

CarbonAssessmentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CarbonAssessment', CarbonAssessmentSchema);
