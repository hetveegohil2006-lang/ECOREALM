const DiagnosticResult = require('../models/DiagnosticResult');
const asyncHandler = require('../middleware/asyncHandler');
const { awardXP } = require('./userController');
const { generateRecommendations } = require('../services/coachService');

// Carbon scoring weights (kg CO2 per unit)
const WEIGHTS = {
  transportation: 0.21,  // per km
  energy: 0.233,         // per kWh
  food: 3.3,             // per meat meal
  waste: 0.5,            // per bag
  water: 0.001,          // per litre
  shopping: 5.0          // per item
};

const GLOBAL_AVERAGE = 4.8; // tonnes CO2/year

function classifyScore(score) {
  if (score < 2)  return { rating: 'Excellent', classification: 'Eco-Pioneer' };
  if (score < 4)  return { rating: 'Good', classification: 'Green Guardian' };
  if (score < 7)  return { rating: 'Average', classification: 'Climate Recruit' };
  if (score < 10) return { rating: 'High Impact', classification: 'Carbon Challenger' };
  return { rating: 'Critical', classification: 'Impact Override' };
}

// @desc    Start diagnostic (just initializes session context, returns categories)
// @route   POST /api/diagnostic/start
// @access  Private
exports.startDiagnostic = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Diagnostic scan initialized. Submit your answers to receive your Guardian profile.',
    categories: ['transportation', 'energy', 'food', 'waste', 'water', 'shopping']
  });
});

// @desc    Submit diagnostic answers and calculate carbon score
// @route   POST /api/diagnostic/submit
// @access  Private
exports.submitDiagnostic = asyncHandler(async (req, res) => {
  const { transportation, energy, food, waste, water, shopping } = req.body;

  const answers = {
    transportation: parseFloat(transportation) || 0,
    energy: parseFloat(energy) || 0,
    food: parseFloat(food) || 0,
    waste: parseFloat(waste) || 0,
    water: parseFloat(water) || 0,
    shopping: parseFloat(shopping) || 0
  };

  // Calculate per-category annual scores (tonnes CO2)
  const scores = {
    transportation: (answers.transportation * 52 * WEIGHTS.transportation) / 1000,
    energy: (answers.energy * 12 * WEIGHTS.energy) / 1000,
    food: (answers.food * 52 * WEIGHTS.food) / 1000,
    waste: (answers.waste * 52 * WEIGHTS.waste) / 1000,
    water: (answers.water * 365 * WEIGHTS.water) / 1000,
    shopping: (answers.shopping * 12 * WEIGHTS.shopping) / 1000
  };

  const totalCarbonScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const { rating, classification } = classifyScore(totalCarbonScore);
  const comparedToAverage = (((totalCarbonScore - GLOBAL_AVERAGE) / GLOBAL_AVERAGE) * 100).toFixed(1);

  // Generate AI recommendations
  let recommendations = [];
  try {
    const scaledScores = {};
    Object.keys(scores).forEach(k => scaledScores[k] = Math.round((scores[k] / 5) * 10));
    recommendations = await generateRecommendations(scaledScores);
  } catch {
    recommendations = [
      'Switch to public transport or cycling for daily commutes.',
      'Reduce meat consumption to 3 days per week.',
      'Install LED lighting and unplug idle electronics.',
      'Start a home composting system to reduce landfill waste.'
    ];
  }

  const result = await DiagnosticResult.create({
    user: req.user._id,
    answers,
    scores,
    totalCarbonScore: parseFloat(totalCarbonScore.toFixed(2)),
    sustainabilityRating: rating,
    guardianClassification: classification,
    recommendations
  });

  // Award XP for completing diagnostic
  await awardXP(req.user._id, 100, 50);

  res.status(201).json({
    success: true,
    message: 'Diagnostic complete. Guardian profile generated.',
    result: {
      id: result._id,
      totalCarbonScore: result.totalCarbonScore,
      sustainabilityRating: rating,
      guardianClassification: classification,
      comparedToAverage: `${comparedToAverage}%`,
      breakdown: scores,
      recommendations
    }
  });
});

// @desc    Get latest diagnostic result
// @route   GET /api/diagnostic/result
// @access  Private
exports.getDiagnosticResult = asyncHandler(async (req, res) => {
  const result = await DiagnosticResult.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  if (!result) return res.status(404).json({ success: false, error: 'No diagnostic on record. Run a scan first.' });
  res.status(200).json({ success: true, result });
});

// @desc    Get all diagnostic history
// @route   GET /api/diagnostic/history
// @access  Private
exports.getDiagnosticHistory = asyncHandler(async (req, res) => {
  const results = await DiagnosticResult.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(10);
  res.status(200).json({ success: true, count: results.length, results });
});
