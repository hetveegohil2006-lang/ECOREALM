const Challenge = require('../models/Challenge');
const asyncHandler = require('../middleware/asyncHandler');
const { awardXP } = require('./userController');

const SEED_CHALLENGES = [
  { title: 'Plastic Free Challenge', description: 'Go 30 days without using any single-use plastic.', type: 'individual', category: 'waste', difficulty: 'hard', xpReward: 500, coinReward: 250, badgeReward: 'ocean_protector', goal: 30, unit: 'days', icon: '🌊' },
  { title: 'Zero Waste Week', description: 'Produce zero landfill waste for 7 consecutive days.', type: 'individual', category: 'waste', difficulty: 'hard', xpReward: 350, coinReward: 175, goal: 7, unit: 'days', icon: '♻️' },
  { title: 'Energy Saver Challenge', description: 'Reduce electricity usage by 20% for a month.', type: 'individual', category: 'energy', difficulty: 'medium', xpReward: 300, coinReward: 150, badgeReward: 'energy_saver', goal: 30, unit: 'days', icon: '⚡' },
  { title: 'Green Mobility Month', description: 'Use only zero-emission transport for 30 days.', type: 'individual', category: 'transportation', difficulty: 'hard', xpReward: 450, coinReward: 225, badgeReward: 'green_traveler', goal: 30, unit: 'days', icon: '🚲' },
  { title: 'Community Tree Drive', description: 'As a community, plant 1,000 trees this month.', type: 'community', category: 'general', difficulty: 'legendary', xpReward: 800, coinReward: 400, badgeReward: 'tree_guardian', goal: 1000, unit: 'trees', icon: '🌳' },
  { title: 'Meatless Month', description: 'Eat plant-based for 30 consecutive days.', type: 'individual', category: 'food', difficulty: 'hard', xpReward: 400, coinReward: 200, goal: 30, unit: 'days', icon: '🥦' }
];

const seedChallenges = async () => {
  const count = await Challenge.countDocuments();
  if (count === 0) {
    await Challenge.insertMany(SEED_CHALLENGES);
    console.log('✅ Challenges seeded.');
  }
};

// @desc    Get all active challenges
// @route   GET /api/challenges
// @access  Private
exports.getChallenges = asyncHandler(async (req, res) => {
  await seedChallenges();
  const challenges = await Challenge.find({ isActive: true }).sort({ xpReward: -1 });
  res.status(200).json({ success: true, count: challenges.length, challenges });
});

// @desc    Join a challenge
// @route   POST /api/challenges/:id/join
// @access  Private
exports.joinChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found.' });

  const alreadyJoined = challenge.participants.some(p => p.user.toString() === req.user._id.toString());
  if (alreadyJoined) return res.status(400).json({ success: false, error: 'Already participating in this challenge.' });

  challenge.participants.push({ user: req.user._id, progress: 0 });
  await challenge.save();

  res.status(200).json({ success: true, message: `Joined challenge: "${challenge.title}"!`, challenge });
});

// @desc    Update challenge progress
// @route   PUT /api/challenges/:id/progress
// @access  Private
exports.updateProgress = asyncHandler(async (req, res) => {
  const challenge = await Challenge.findById(req.params.id);
  if (!challenge) return res.status(404).json({ success: false, error: 'Challenge not found.' });

  const participant = challenge.participants.find(p => p.user.toString() === req.user._id.toString());
  if (!participant) return res.status(400).json({ success: false, error: 'You have not joined this challenge.' });
  if (participant.completedAt) return res.status(400).json({ success: false, error: 'Challenge already completed.' });

  const increment = parseFloat(req.body.increment) || 1;
  participant.progress = Math.min(challenge.goal, participant.progress + increment);

  let completed = false;
  let result = null;
  if (participant.progress >= challenge.goal) {
    participant.completedAt = new Date();
    completed = true;
    result = await awardXP(req.user._id, challenge.xpReward, challenge.coinReward);
  }

  await challenge.save();

  res.status(200).json({
    success: true,
    progress: participant.progress,
    goal: challenge.goal,
    percent: Math.round((participant.progress / challenge.goal) * 100),
    completed,
    ...(completed && {
      message: `🏆 Challenge complete: "${challenge.title}" — +${challenge.xpReward} XP!`,
      leveledUp: result?.leveledUp,
      newBadges: result?.newBadges
    })
  });
});

// @desc    Get user's challenge progress
// @route   GET /api/challenges/my
// @access  Private
exports.getMyChallenges = asyncHandler(async (req, res) => {
  await seedChallenges();
  const challenges = await Challenge.find({ 'participants.user': req.user._id, isActive: true });
  const withProgress = challenges.map(c => {
    const p = c.participants.find(x => x.user.toString() === req.user._id.toString());
    return { ...c.toObject(), myProgress: p?.progress || 0, myCompleted: !!p?.completedAt };
  });
  res.status(200).json({ success: true, count: withProgress.length, challenges: withProgress });
});
