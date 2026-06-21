const { supabase } = require('../lib/supabase');
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
  const { count, error } = await supabase
    .from('challenges')
    .select('*', { count: 'exact', head: true });

  if (!error && count === 0) {
    const formatted = SEED_CHALLENGES.map(c => ({
      title: c.title,
      description: c.description,
      type: c.type || 'individual',
      category: c.category || 'general',
      difficulty: c.difficulty || 'medium',
      xp_reward: c.xpReward,
      coin_reward: c.coinReward,
      badge_reward: c.badgeReward || null,
      goal: c.goal,
      unit: c.unit || 'actions',
      icon: c.icon || '🏆',
      is_active: true
    }));

    await supabase.from('challenges').insert(formatted);
    console.log('✅ Challenges seeded.');
  }
};

// @desc    Get all active challenges
// @route   GET /api/challenges
// @access  Private
exports.getChallenges = asyncHandler(async (req, res) => {
  await seedChallenges();
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
    .order('xp_reward', { ascending: false });

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // Format to match compatibility expectations
  const compatChallenges = (challenges || []).map(c => ({
    _id: c.id,
    id: c.id,
    title: c.title,
    description: c.description,
    type: c.type,
    category: c.category,
    difficulty: c.difficulty,
    xpReward: c.xp_reward,
    coinReward: c.coin_reward,
    badgeReward: c.badge_reward,
    goal: Number(c.goal),
    unit: c.unit,
    icon: c.icon,
    isActive: c.is_active,
    participants: [] // Empty array for compatibility
  }));

  res.status(200).json({ success: true, count: compatChallenges.length, challenges: compatChallenges });
});

// @desc    Join a challenge
// @route   POST /api/challenges/:id/join
// @access  Private
exports.joinChallenge = asyncHandler(async (req, res) => {
  const challengeId = req.params.id;

  const { data: challenge, error: challengeErr } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (challengeErr || !challenge) {
    return res.status(404).json({ success: false, error: 'Challenge not found.' });
  }

  const { data: existing, error: existErr } = await supabase
    .from('user_challenges')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('challenge_id', challengeId)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ success: false, error: 'Already participating in this challenge.' });
  }

  const { error: joinErr } = await supabase
    .from('user_challenges')
    .insert({
      user_id: req.user.id,
      challenge_id: challengeId,
      progress: 0
    });

  if (joinErr) {
    return res.status(400).json({ success: false, error: joinErr.message });
  }

  const compatChallenge = {
    _id: challenge.id,
    id: challenge.id,
    title: challenge.title,
    description: challenge.description,
    type: challenge.type,
    category: challenge.category,
    difficulty: challenge.difficulty,
    xpReward: challenge.xp_reward,
    coinReward: challenge.coin_reward,
    badgeReward: challenge.badge_reward,
    goal: Number(challenge.goal),
    unit: challenge.unit,
    icon: challenge.icon,
    isActive: challenge.is_active,
    participants: [{ user: req.user.id, progress: 0 }]
  };

  res.status(200).json({
    success: true,
    message: `Joined challenge: "${challenge.title}"!`,
    challenge: compatChallenge
  });
});

// @desc    Update challenge progress
// @route   PUT /api/challenges/:id/progress
// @access  Private
exports.updateProgress = asyncHandler(async (req, res) => {
  const challengeId = req.params.id;

  const { data: challenge, error: challengeErr } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .single();

  if (challengeErr || !challenge) {
    return res.status(404).json({ success: false, error: 'Challenge not found.' });
  }

  const { data: participant, error: partErr } = await supabase
    .from('user_challenges')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('challenge_id', challengeId)
    .maybeSingle();

  if (partErr || !participant) {
    return res.status(400).json({ success: false, error: 'You have not joined this challenge.' });
  }

  if (participant.completed_at) {
    return res.status(400).json({ success: false, error: 'Challenge already completed.' });
  }

  const increment = parseFloat(req.body.increment) || 1;
  const currentProgress = Number(participant.progress) || 0;
  const newProgress = Math.min(Number(challenge.goal), currentProgress + increment);
  const goal = Number(challenge.goal);

  let completed = false;
  let result = null;
  let completedAt = null;

  if (newProgress >= goal) {
    completedAt = new Date().toISOString();
    completed = true;
    result = await awardXP(req.user.id, challenge.xp_reward, challenge.coin_reward);
  }

  const { error: updateErr } = await supabase
    .from('user_challenges')
    .update({
      progress: newProgress,
      completed_at: completedAt
    })
    .eq('id', participant.id);

  if (updateErr) {
    return res.status(400).json({ success: false, error: updateErr.message });
  }

  res.status(200).json({
    success: true,
    progress: newProgress,
    goal: goal,
    percent: Math.round((newProgress / goal) * 100),
    completed,
    ...(completed && {
      message: `🏆 Challenge complete: "${challenge.title}" — +${challenge.xp_reward} XP!`,
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
  
  const { data: joinedChallenges, error } = await supabase
    .from('user_challenges')
    .select('*, challenges(*)')
    .eq('user_id', req.user.id);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  // Filter and map the active challenges
  const withProgress = (joinedChallenges || [])
    .filter(uc => uc.challenges && uc.challenges.is_active)
    .map(uc => {
      const c = uc.challenges;
      return {
        _id: c.id,
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        category: c.category,
        difficulty: c.difficulty,
        xpReward: c.xp_reward,
        coinReward: c.coin_reward,
        badgeReward: c.badge_reward,
        goal: Number(c.goal),
        unit: c.unit,
        icon: c.icon,
        isActive: c.is_active,
        myProgress: Number(uc.progress),
        myCompleted: !!uc.completed_at,
        participants: [] // compatible array
      };
    });

  res.status(200).json({ success: true, count: withProgress.length, challenges: withProgress });
});
