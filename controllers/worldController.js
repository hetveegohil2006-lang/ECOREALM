const { supabase } = require('../lib/supabase');
const asyncHandler = require('../middleware/asyncHandler');

// Map database world region keys to frontend expected format
const formatRegion = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    name: r.name,
    description: r.description,
    icon: r.icon,
    category: r.category,
    color: r.color,
    position: r.position,
    isLocked: r.is_locked,
    unlockCost: r.unlock_cost,
    treesPlanted: r.trees_planted,
    carbonReduced: Number(r.carbon_reduced) || 0,
    wasteRecycled: Number(r.waste_recycled) || 0,
    waterSaved: Number(r.water_saved) || 0,
    restorationPercent: Number(r.restoration_percent) || 0,
    contributors: r.contributors || []
  };
};

// @desc    Get all world regions
// @route   GET /api/world
// @access  Private
exports.getRegions = asyncHandler(async (req, res) => {
  const { data: regions, error } = await supabase
    .from('world_regions')
    .select('*')
    .order('is_locked', { ascending: true })
    .order('restoration_percent', { ascending: false });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  res.status(200).json({ success: true, regions: regions.map(formatRegion) });
});

// @desc    Contribute to a region
// @route   POST /api/world/:id/contribute
// @access  Private
exports.contribute = asyncHandler(async (req, res) => {
  const { data: region, error: getErr } = await supabase
    .from('world_regions')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (getErr || !region) {
    return res.status(404).json({ success: false, error: 'Region not found.' });
  }

  if (region.is_locked) {
    return res.status(403).json({ success: false, error: 'Region is locked. Unlock it first.' });
  }

  const { trees = 0, carbon = 0, waste = 0, water = 0 } = req.body;

  const newTrees = region.trees_planted + parseInt(trees);
  const newCarbon = Number(region.carbon_reduced) + parseFloat(carbon);
  const newWaste = Number(region.waste_recycled) + parseFloat(waste);
  const newWater = Number(region.water_saved) + parseFloat(water);

  let contributors = region.contributors || [];
  if (!contributors.includes(req.user.id)) {
    contributors.push(req.user.id);
  }

  // Recalculate restoration percentage
  const progress = Math.min(
    100,
    (newTrees / 100) * 25 + (newCarbon / 500) * 25 + (newWaste / 200) * 25 + (newWater / 10000) * 25
  );
  const restorationPercent = parseFloat(progress.toFixed(1));

  const { data: updatedRegion, error: updateErr } = await supabase
    .from('world_regions')
    .update({
      trees_planted: newTrees,
      carbon_reduced: newCarbon,
      waste_recycled: newWaste,
      water_saved: newWater,
      contributors,
      restoration_percent: restorationPercent
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) {
    return res.status(400).json({ success: false, error: updateErr.message });
  }

  res.status(200).json({ success: true, message: `Contributed to ${region.name}!`, region: formatRegion(updatedRegion) });
});

// @desc    Unlock a region
// @route   POST /api/world/:id/unlock
// @access  Private
exports.unlockRegion = asyncHandler(async (req, res) => {
  const { data: region, error: getErr } = await supabase
    .from('world_regions')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (getErr || !region) {
    return res.status(404).json({ success: false, error: 'Region not found.' });
  }
  if (!region.is_locked) {
    return res.status(400).json({ success: false, error: 'Region is already unlocked.' });
  }

  // Fetch profiles to check coins
  const { data: profile } = await supabase
    .from('profiles')
    .select('eco_points, net_zero_unlocked')
    .eq('id', req.user.id)
    .single();

  if (profile.eco_points < region.unlock_cost) {
    return res.status(400).json({ success: false, error: `Insufficient Eco Coins. Need ${region.unlock_cost}.` });
  }

  const newCoins = profile.eco_points - region.unlock_cost;
  const isNetZero = req.params.id === 'netzero';

  // Deduct coins from profiles
  await supabase
    .from('profiles')
    .update({
      eco_points: newCoins,
      net_zero_unlocked: isNetZero ? true : profile.net_zero_unlocked
    })
    .eq('id', req.user.id);

  let contributors = region.contributors || [];
  if (!contributors.includes(req.user.id)) {
    contributors.push(req.user.id);
  }

  const { data: updatedRegion, error: updateErr } = await supabase
    .from('world_regions')
    .update({
      is_locked: false,
      contributors
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (updateErr) {
    return res.status(400).json({ success: false, error: updateErr.message });
  }

  res.status(200).json({ success: true, message: `🔓 ${region.name} is now unlocked!`, region: formatRegion(updatedRegion), coins: newCoins });
});

// @desc    Get global restoration summary
// @route   GET /api/world/summary
// @access  Public
exports.getSummary = asyncHandler(async (req, res) => {
  const { data: regions, error } = await supabase
    .from('world_regions')
    .select('*');

  if (error || !regions) {
    return res.status(400).json({ success: false, error: error?.message || 'Failed to fetch summary.' });
  }

  const { count: totalGuardians } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const summary = {
    totalTreesPlanted: regions.reduce((a, r) => a + (r.trees_planted || 0), 0),
    totalCarbonReduced: regions.reduce((a, r) => a + Number(r.carbon_reduced || 0), 0),
    totalWasteRecycled: regions.reduce((a, r) => a + Number(r.waste_recycled || 0), 0),
    totalWaterSaved: regions.reduce((a, r) => a + Number(r.water_saved || 0), 0),
    averageRestoration: (regions.reduce((a, r) => a + Number(r.restoration_percent || 0), 0) / regions.length).toFixed(1),
    totalGuardians: totalGuardians || 0
  };

  res.status(200).json({ success: true, summary, regions: regions.map(formatRegion) });
});
