const WorldRegion = require('../models/WorldRegion');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');

const SEED_REGIONS = [
  { id: 'industrial', name: 'Industrial Zone', description: 'A smog-heavy district converting to clean energy.', icon: '🏭', category: 'industrial', color: '#f59e0b', position: { x: 15, y: 60 }, isLocked: false, unlockCost: 0 },
  { id: 'forest', name: 'Forest Zone', description: 'Ancient woodland being revitalized by Guardians.', icon: '🌲', category: 'forest', color: '#22c55e', position: { x: 35, y: 30 }, isLocked: false, unlockCost: 0 },
  { id: 'ocean', name: 'Ocean Cleanup Coast', description: 'Coastal cleanup mission removing marine debris.', icon: '🌊', category: 'ocean', color: '#0ea5e9', position: { x: 60, y: 70 }, isLocked: false, unlockCost: 0 },
  { id: 'wildlife', name: 'Wildlife Sanctuary', description: 'Protected habitat for endangered species.', icon: '🦋', category: 'wildlife', color: '#a855f7', position: { x: 75, y: 35 }, isLocked: false, unlockCost: 0 },
  { id: 'energy', name: 'Green Energy Zone', description: 'Solar and wind farms powering the new world.', icon: '⚡', category: 'energy', color: '#00ff88', position: { x: 50, y: 15 }, isLocked: false, unlockCost: 0 },
  { id: 'netzero', name: 'Net-Zero Future Hub', description: 'The pinnacle of restoration — a carbon-neutral utopia.', icon: '🌟', category: 'netzero', color: '#00d4ff', position: { x: 85, y: 20 }, isLocked: true, unlockCost: 150 }
];

const seedRegions = async () => {
  const count = await WorldRegion.countDocuments();
  if (count === 0) {
    await WorldRegion.insertMany(SEED_REGIONS);
    console.log('✅ World Regions seeded.');
  }
};

// @desc    Get all world regions
// @route   GET /api/world
// @access  Private
exports.getRegions = asyncHandler(async (req, res) => {
  await seedRegions();
  const regions = await WorldRegion.find().sort({ isLocked: 1, restorationPercent: -1 });
  res.status(200).json({ success: true, regions });
});

// @desc    Contribute to a region
// @route   POST /api/world/:id/contribute
// @access  Private
exports.contribute = asyncHandler(async (req, res) => {
  const region = await WorldRegion.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ success: false, error: 'Region not found.' });
  if (region.isLocked) return res.status(403).json({ success: false, error: 'Region is locked. Unlock it first.' });

  const { trees = 0, carbon = 0, waste = 0, water = 0 } = req.body;

  region.treesPlanted += parseInt(trees);
  region.carbonReduced += parseFloat(carbon);
  region.wasteRecycled += parseFloat(waste);
  region.waterSaved += parseFloat(water);

  if (!region.contributors.includes(req.user._id)) {
    region.contributors.push(req.user._id);
  }

  // Recalculate restoration percentage
  const progress = Math.min(100, (region.treesPlanted / 100) * 25 + (region.carbonReduced / 500) * 25 + (region.wasteRecycled / 200) * 25 + (region.waterSaved / 10000) * 25);
  region.restorationPercent = parseFloat(progress.toFixed(1));

  await region.save();

  res.status(200).json({ success: true, message: `Contributed to ${region.name}!`, region });
});

// @desc    Unlock a region
// @route   POST /api/world/:id/unlock
// @access  Private
exports.unlockRegion = asyncHandler(async (req, res) => {
  const region = await WorldRegion.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ success: false, error: 'Region not found.' });
  if (!region.isLocked) return res.status(400).json({ success: false, error: 'Region is already unlocked.' });

  const user = await User.findById(req.user._id);
  if (user.coins < region.unlockCost) {
    return res.status(400).json({ success: false, error: `Insufficient Eco Coins. Need ${region.unlockCost}.` });
  }

  user.coins -= region.unlockCost;
  if (req.params.id === 'netzero') user.netZeroUnlocked = true;
  await user.save({ validateBeforeSave: false });

  region.isLocked = false;
  region.contributors.push(req.user._id);
  await region.save();

  res.status(200).json({ success: true, message: `🔓 ${region.name} is now unlocked!`, region, coins: user.coins });
});

// @desc    Get global restoration summary
// @route   GET /api/world/summary
// @access  Public
exports.getSummary = asyncHandler(async (req, res) => {
  await seedRegions();
  const regions = await WorldRegion.find();
  const summary = {
    totalTreesPlanted: regions.reduce((a, r) => a + r.treesPlanted, 0),
    totalCarbonReduced: regions.reduce((a, r) => a + r.carbonReduced, 0),
    totalWasteRecycled: regions.reduce((a, r) => a + r.wasteRecycled, 0),
    totalWaterSaved: regions.reduce((a, r) => a + r.waterSaved, 0),
    averageRestoration: (regions.reduce((a, r) => a + r.restorationPercent, 0) / regions.length).toFixed(1),
    totalGuardians: await User.countDocuments()
  };
  res.status(200).json({ success: true, summary, regions });
});
