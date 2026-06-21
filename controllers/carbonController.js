const { supabase } = require('../lib/supabase');
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

const formatAssessment = (a) => {
  if (!a) return null;
  return {
    _id: a.id,
    id: a.id,
    user: a.user_id,
    annualScore: a.carbon_score,
    monthlyScore: parseFloat((a.carbon_score / 12).toFixed(3)),
    comparedToAverage: a.compared_to_average,
    period: a.period,
    notes: a.notes,
    improvementAreas: a.improvement_areas,
    breakdown: {
      travel: a.transportation,
      food: a.food,
      electricity: a.energy,
      waste: a.waste,
      water: a.water,
      shopping: a.shopping
    },
    createdAt: a.created_at
  };
};

// @desc    Log a new Carbon Assessment
// @route   POST /api/carbon
// @access  Private
exports.logAssessment = asyncHandler(async (req, res) => {
  const { breakdown: inputBreakdown, period, notes } = req.body;

  if (!inputBreakdown) {
    return res.status(400).json({ success: false, error: 'Please provide carbon breakdown details.' });
  }

  const travel = parseFloat(inputBreakdown.travel) || 0;
  const food = parseFloat(inputBreakdown.food) || 0;
  const electricity = parseFloat(inputBreakdown.electricity) || 0;
  const water = parseFloat(inputBreakdown.water) || 0;
  const waste = parseFloat(inputBreakdown.waste) || 0;
  const shopping = parseFloat(inputBreakdown.shopping) || 0;

  const breakdown = {
    travel: travel > 100 ? (travel * 12 * WEIGHTS.travel) / 1000 : travel,
    electricity: electricity > 100 ? (electricity * 12 * WEIGHTS.electricity) / 1000 : electricity,
    food: food > 20 ? (food * 52 * WEIGHTS.food) / 1000 : food,
    waste: waste > 20 ? (waste * 52 * WEIGHTS.waste) / 1000 : waste,
    water: water > 100 ? (water * 12 * WEIGHTS.water) / 1000 : water,
    shopping: shopping > 20 ? (shopping * 12 * WEIGHTS.shopping) / 1000 : shopping
  };

  const annualScore = parseFloat(Object.values(breakdown).reduce((a, b) => a + b, 0).toFixed(2));
  const comparedToAverage = parseFloat((((annualScore - GLOBAL_AVERAGE) / GLOBAL_AVERAGE) * 100).toFixed(1));

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

  const date = new Date();
  const currentPeriod = period || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  const { data: assessment, error } = await supabase
    .from('assessments')
    .insert({
      user_id: req.user.id,
      transportation: breakdown.travel,
      food: breakdown.food,
      energy: breakdown.electricity,
      waste: breakdown.waste,
      water: breakdown.water,
      shopping: breakdown.shopping,
      carbon_score: annualScore,
      period: currentPeriod,
      notes: notes || '',
      compared_to_average: comparedToAverage,
      improvement_areas: improvementAreas
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  res.status(201).json({
    success: true,
    message: 'Carbon footprint assessment logged successfully.',
    data: formatAssessment(assessment)
  });
});

// @desc    Get carbon assessment history
// @route   GET /api/carbon/history
// @access  Private
exports.getHistory = asyncHandler(async (req, res) => {
  const { data: assessments, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('period', { ascending: false })
    .limit(24);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  res.status(200).json({
    success: true,
    count: assessments.length,
    data: assessments.map(formatAssessment)
  });
});

// @desc    Get latest carbon assessment
// @route   GET /api/carbon/latest
// @access  Private
exports.getLatest = asyncHandler(async (req, res) => {
  const { data: assessment, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !assessment) {
    return res.status(404).json({ success: false, error: 'No carbon assessment logged yet.' });
  }

  res.status(200).json({
    success: true,
    data: formatAssessment(assessment)
  });
});
