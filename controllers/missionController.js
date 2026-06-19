const Mission = require('../models/Mission');
const asyncHandler = require('../middleware/asyncHandler');
const { awardXP } = require('./userController');

const SEED_MISSIONS = [
  { title: 'Commute Green', description: 'Walk, cycle, or use public transit instead of driving.', category: 'transportation', difficulty: 'easy', xpReward: 50, coinReward: 25, carbonImpact: 3.5, energyImpact: 0.8, icon: '🚲', isDaily: true },
  { title: 'Meatless Day', description: 'Eat only plant-based meals for an entire day.', category: 'food', difficulty: 'easy', xpReward: 40, coinReward: 20, carbonImpact: 2.5, waterImpact: 150, icon: '🥦', isDaily: true },
  { title: 'Zero Waste Actions', description: 'Use only reusable bags, bottles, and containers today.', category: 'waste', difficulty: 'easy', xpReward: 30, coinReward: 15, carbonImpact: 1.2, waterImpact: 20, icon: '♻️', isDaily: true },
  { title: 'Unplug Idle Electronics', description: 'Unplug all devices not in use before sleeping.', category: 'energy', difficulty: 'easy', xpReward: 25, coinReward: 12, energyImpact: 1.5, icon: '⚡', isDaily: true },
  { title: 'Plant a Seedling', description: 'Plant a seedling or tend to your garden today.', category: 'general', difficulty: 'medium', xpReward: 60, coinReward: 30, carbonImpact: 4.0, waterImpact: 10, icon: '🌱', isDaily: true },
  { title: 'Sort & Recycle', description: 'Sort all your household waste and recycle properly.', category: 'waste', difficulty: 'easy', xpReward: 20, coinReward: 10, carbonImpact: 1.0, waterImpact: 5, icon: '🗑️', isDaily: true },
  { title: 'Cold Water Wash', description: 'Wash your clothes in cold water only.', category: 'energy', difficulty: 'easy', xpReward: 20, coinReward: 10, energyImpact: 2.0, icon: '🧺', isDaily: false, isRecurring: true },
  { title: 'Short Shower Challenge', description: 'Limit your shower to under 4 minutes.', category: 'water', difficulty: 'easy', xpReward: 25, coinReward: 12, waterImpact: 60, icon: '🚿', isDaily: true },
  { title: 'No Single-Use Plastic', description: 'Go an entire day without using any single-use plastic.', category: 'waste', difficulty: 'medium', xpReward: 50, coinReward: 25, carbonImpact: 1.5, icon: '🌊', isDaily: true },
  { title: 'Switch to LED', description: 'Replace at least one incandescent bulb with an LED.', category: 'energy', difficulty: 'easy', xpReward: 35, coinReward: 18, energyImpact: 5.0, icon: '💡', isDaily: false }
];

// @desc    Seed missions if DB is empty
const seedMissions = async () => {
  const count = await Mission.countDocuments();
  if (count === 0) {
    await Mission.insertMany(SEED_MISSIONS);
    console.log('✅ Missions seeded.');
  }
};

// @desc    Get all missions
// @route   GET /api/missions
// @access  Private
exports.getMissions = asyncHandler(async (req, res) => {
  await seedMissions();
  const { category, difficulty } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (difficulty) filter.difficulty = difficulty;

  const missions = await Mission.find(filter).sort({ xpReward: -1 });
  res.status(200).json({ success: true, count: missions.length, missions });
});

// @desc    Get daily missions
// @route   GET /api/missions/daily
// @access  Private
exports.getDailyMissions = asyncHandler(async (req, res) => {
  await seedMissions();
  const missions = await Mission.find({ isDaily: true, isActive: true }).limit(6);
  res.status(200).json({ success: true, count: missions.length, missions });
});

// @desc    Get weekly missions
// @route   GET /api/missions/weekly
// @access  Private
exports.getWeeklyMissions = asyncHandler(async (req, res) => {
  await seedMissions();
  const missions = await Mission.find({ difficulty: { $in: ['medium', 'hard'] }, isActive: true }).limit(4);
  res.status(200).json({ success: true, count: missions.length, missions });
});

// @desc    Get monthly missions
// @route   GET /api/missions/monthly
// @access  Private
exports.getMonthlyMissions = asyncHandler(async (req, res) => {
  await seedMissions();
  const missions = await Mission.find({ difficulty: { $in: ['hard', 'legendary'] }, isActive: true }).limit(3);
  res.status(200).json({ success: true, count: missions.length, missions });
});

// @desc    Complete a mission
// @route   POST /api/missions/complete
// @access  Private
exports.completeMission = asyncHandler(async (req, res) => {
  const { missionId } = req.body;
  const mission = await Mission.findById(missionId);
  if (!mission) return res.status(404).json({ success: false, error: 'Mission not found.' });

  const alreadyDone = mission.completedBy.includes(req.user._id);
  if (alreadyDone) return res.status(400).json({ success: false, error: 'Mission already completed today.' });

  mission.completedBy.push(req.user._id);
  await mission.save();

  const result = await awardXP(req.user._id, mission.xpReward, mission.coinReward);

  // Add to history
  const User = require('../models/User');
  await User.findByIdAndUpdate(req.user._id, {
    $inc: {
      carbonOffset: mission.carbonImpact || 0,
      waterSaved: mission.waterImpact || 0,
      energyConserved: mission.energyImpact || 0
    },
    $push: {
      history: {
        $each: [{ name: mission.title, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), coins: mission.coinReward, xp: mission.xpReward }],
        $position: 0,
        $slice: 20
      }
    }
  });

  res.status(200).json({
    success: true,
    message: `✅ Mission complete: "${mission.title}" — +${mission.xpReward} XP, +${mission.coinReward} Coins!`,
    xpEarned: mission.xpReward,
    coinsEarned: mission.coinReward,
    leveledUp: result?.leveledUp || false,
    newBadges: result?.newBadges || [],
    user: result?.user
  });
});
