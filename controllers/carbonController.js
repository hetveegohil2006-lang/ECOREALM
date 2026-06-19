const CarbonAssessment = require('../models/CarbonAssessment');
const asyncHandler = require('../middleware/asyncHandler');

const WEIGHTS = {
  travel: 0.21,
  electricity: 0.233,
  food: 3.3,
  waste: 0.5,
  water: 0.001,
  shopping: 5.0
};

const GLOBAL_AVERAGE = 4.8; // tonnes CO2/year

// @desc    Log a new Carbon Assessment
// @route   POST /api/carbon
// @access  Private
exports.logAssessment = asyncHandler(async (req, res) => {
  const { breakdown: inputBreakdown, period, notes } = req.body;

  if (!inputBreakdown) {
    return res.status(400).json({ success: false, error: 'Please provide carbon breakdown details.' });
  }

  // Parse inputs (assume monthly consumption or direct emissions)
  const travel = parseFloat(inputBreakdown.travel) || 0;
  const food = parseFloat(inputBreakdown.food) || 0;
  const electricity = parseFloat(inputBreakdown.electricity) || 0;
  const water = parseFloat(inputBreakdown.water) || 0;
  const waste = parseFloat(inputBreakdown.waste) || 0;
  const shopping = parseFloat(inputBreakdown.shopping) || 0;

  // Calculate breakdown in annual tonnes CO2
  // If input is already in tonnes (small numbers < 100), use directly, otherwise compute
  const breakdown = {
    travel: travel > 100 ? (travel * 12 * WEIGHTS.travel) / 1000 : travel,
    electricity: electricity > 100 ? (electricity * 12 * WEIGHTS.electricity) / 1000 : electricity,
    food: food > 20 ? (food * 52 * WEIGHTS.food) / 1000 : food,
    waste: waste > 20 ? (waste * 52 * WEIGHTS.waste) / 1000 : waste,
    water: water > 100 ? (water * 12 * WEIGHTS.water) / 1000 : water,
    shopping: shopping > 20 ? (shopping * 12 * WEIGHTS.shopping) / 1000 : shopping
  };

  const annualScore = parseFloat(Object.values(breakdown).reduce((a, b) => a + b, 0).toFixed(2));
  const monthlyScore = parseFloat((annualScore / 12).toFixed(3));
  const comparedToAverage = parseFloat((((annualScore - GLOBAL_AVERAGE) / GLOBAL_AVERAGE) * 100).toFixed(1));

  // Generate simple improvement areas
  const improvementAreas = [];
  if (breakdown.travel > 1.5) improvementAreas.push('Transition to cycling or public transit');
  if (breakdown.electricity > 1.0) improvementAreas.push('Switch to smart/LED devices and optimize cooling');
  if (breakdown.food > 1.0) improvementAreas.push('Adopt more plant-based meal options');
  if (breakdown.waste > 0.5) improvementAreas.push('Engage in sorting, recycling, and composting');
  if (breakdown.water > 0.3) improvementAreas.push('Install low-flow showerheads and save rain water');
  if (breakdown.shopping > 0.5) improvementAreas.push('Reduce fast-fashion purchases and prefer reusable items');

  if (improvementAreas.length === 0) {
    improvementAreas.push('Maintain your current sustainable footprint!');
  }

  // Format period: default to current YYYY-MM
  const date = new Date();
  const currentPeriod = period || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const assessment = await CarbonAssessment.create({
    user: req.user._id,
    annualScore,
    monthlyScore,
    breakdown,
    improvementAreas,
    comparedToAverage,
    period: currentPeriod,
    notes: notes || ''
  });

  res.status(201).json({
    success: true,
    message: 'Carbon footprint assessment logged successfully.',
    data: assessment
  });
});

// @desc    Get carbon assessment history
// @route   GET /api/carbon/history
// @access  Private
exports.getHistory = asyncHandler(async (req, res) => {
  const assessments = await CarbonAssessment.find({ user: req.user._id })
    .sort({ period: -1, createdAt: -1 })
    .limit(24);

  res.status(200).json({
    success: true,
    count: assessments.length,
    data: assessments
  });
});

// @desc    Get latest carbon assessment
// @route   GET /api/carbon/latest
// @access  Private
exports.getLatest = asyncHandler(async (req, res) => {
  const assessment = await CarbonAssessment.findOne({ user: req.user._id })
    .sort({ createdAt: -1 });

  if (!assessment) {
    return res.status(404).json({ success: false, error: 'No carbon assessment logged yet.' });
  }

  res.status(200).json({
    success: true,
    data: assessment
  });
});
