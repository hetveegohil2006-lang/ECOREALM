const { supabase } = require('../lib/supabase');
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

// @desc    Start diagnostic (just initializes session context)
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

  // Save to assessments table
  const { data: result, error } = await supabase
    .from('assessments')
    .insert({
      user_id: req.user.id,
      transportation: scores.transportation,
      food: scores.food,
      energy: scores.energy,
      waste: scores.waste,
      water: scores.water,
      shopping: scores.shopping,
      carbon_score: parseFloat(totalCarbonScore.toFixed(2))
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // Update profile to mark scan as completed and award XP
  await supabase
    .from('profiles')
    .update({
      scan_completed: true,
      carbon_score: parseFloat(totalCarbonScore.toFixed(2)),
      guardian_rank: classification
    })
    .eq('id', req.user.id);

  // Award XP for completing diagnostic
  const awardResult = await awardXP(req.user.id, 100, 50);

  res.status(201).json({
    success: true,
    message: 'Diagnostic complete. Guardian profile generated.',
    result: {
      id: result.id,
      totalCarbonScore: result.carbon_score,
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
  const { data: result, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !result) {
    return res.status(404).json({ success: false, error: 'No diagnostic on record. Run a scan first.' });
  }

  // Format to match old model structure
  const formatted = {
    _id: result.id,
    user: result.user_id,
    totalCarbonScore: result.carbon_score,
    answers: {
      transportation: result.transportation,
      food: result.food,
      energy: result.energy,
      waste: result.waste,
      water: result.water,
      shopping: result.shopping
    },
    createdAt: result.created_at
  };

  res.status(200).json({ success: true, result: formatted });
});

// @desc    Get all diagnostic history
// @route   GET /api/diagnostic/history
// @access  Private
exports.getDiagnosticHistory = asyncHandler(async (req, res) => {
  const { data: results, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const formatted = results.map(r => ({
    _id: r.id,
    user: r.user_id,
    totalCarbonScore: r.carbon_score,
    createdAt: r.created_at
  }));

  res.status(200).json({ success: true, count: formatted.length, results: formatted });
});
