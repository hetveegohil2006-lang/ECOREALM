const { supabase } = require('../lib/supabase');
const asyncHandler = require('../middleware/asyncHandler');
const { awardXP } = require('./userController');

const SEED_MISSIONS = [
  { title: 'Commute Green', description: 'Walk, cycle, or use public transit instead of driving.', category: 'transportation', difficulty: 'easy', xp_reward: 50, eco_points_reward: 25, carbon_impact: 3.5, energy_impact: 0.8, icon: '🚲', is_daily: true },
  { title: 'Meatless Day', description: 'Eat only plant-based meals for an entire day.', category: 'food', difficulty: 'easy', xp_reward: 40, eco_points_reward: 20, carbon_impact: 2.5, water_impact: 150, icon: '🥦', is_daily: true },
  { title: 'Zero Waste Actions', description: 'Use only reusable bags, bottles, and containers today.', category: 'waste', difficulty: 'easy', xp_reward: 30, eco_points_reward: 15, carbon_impact: 1.2, water_impact: 20, icon: '♻️', is_daily: true },
  { title: 'Unplug Idle Electronics', description: 'Unplug all devices not in use before sleeping.', category: 'energy', difficulty: 'easy', xp_reward: 25, eco_points_reward: 12, energy_impact: 1.5, icon: '⚡', is_daily: true },
  { title: 'Plant a Seedling', description: 'Plant a seedling or tend to your garden today.', category: 'general', difficulty: 'medium', xp_reward: 60, eco_points_reward: 30, carbon_impact: 4.0, water_impact: 10, icon: '🌱', is_daily: true },
  { title: 'Sort & Recycle', description: 'Sort all your household waste and recycle properly.', category: 'waste', difficulty: 'easy', xp_reward: 20, eco_points_reward: 10, carbon_impact: 1.0, water_impact: 5, icon: '🗑️', is_daily: true },
  { title: 'Cold Water Wash', description: 'Wash your clothes in cold water only.', category: 'energy', difficulty: 'easy', xp_reward: 20, eco_points_reward: 10, energy_impact: 2.0, icon: '🧺', is_daily: false, is_recurring: true },
  { title: 'Short Shower Challenge', description: 'Limit your shower to under 4 minutes.', category: 'water', difficulty: 'easy', xp_reward: 25, eco_points_reward: 12, water_impact: 60, icon: '🚿', is_daily: true },
  { title: 'No Single-Use Plastic', description: 'Go an entire day without using any single-use plastic.', category: 'waste', difficulty: 'medium', xp_reward: 50, eco_points_reward: 25, carbon_impact: 1.5, icon: '🌊', is_daily: true },
  { title: 'Switch to LED', description: 'Replace at least one incandescent bulb with an LED.', category: 'energy', difficulty: 'easy', xp_reward: 35, eco_points_reward: 18, energy_impact: 5.0, icon: '💡', is_daily: false }
];

// @desc    Seed missions if DB is empty
const seedMissions = async () => {
  const { count, error } = await supabase
    .from('missions')
    .select('*', { count: 'exact', head: true });

  if (!error && count === 0) {
    // Format keys to match schema
    const formatted = SEED_MISSIONS.map(m => ({
      title: m.title,
      description: m.description,
      category: m.category,
      difficulty: m.difficulty,
      xp_reward: m.xp_reward,
      eco_points_reward: m.eco_points_reward,
      carbon_impact: m.carbon_impact || 0,
      water_impact: m.water_impact || 0,
      energy_impact: m.energy_impact || 0,
      icon: m.icon,
      is_daily: m.is_daily,
      is_recurring: m.is_recurring !== undefined ? m.is_recurring : true,
      is_active: true
    }));

    await supabase.from('missions').insert(formatted);
    console.log('✅ Missions seeded in PostgreSQL.');
  }
};

// @desc    Get all missions
// @route   GET /api/missions
// @access  Private
exports.getMissions = asyncHandler(async (req, res) => {
  await seedMissions();
  const { category, difficulty } = req.query;
  
  let query = supabase.from('missions').select('*').eq('is_active', true);
  
  if (category) query = query.eq('category', category);
  if (difficulty) query = query.eq('difficulty', difficulty);

  const { data: missions, error } = await query.order('xp_reward', { ascending: false });

  if (error) return res.status(400).json({ success: false, error: error.message });

  // Map back to compat model keys
  const compatMissions = missions.map(m => ({
    _id: m.id,
    id: m.id,
    title: m.title,
    description: m.description,
    category: m.category,
    difficulty: m.difficulty,
    xpReward: m.xp_reward,
    coinReward: m.eco_points_reward,
    carbonImpact: m.carbon_impact,
    waterImpact: m.water_impact,
    energyImpact: m.energy_impact,
    icon: m.icon,
    isDaily: m.is_daily,
    isActive: m.is_active
  }));

  res.status(200).json({ success: true, count: compatMissions.length, missions: compatMissions });
});

// @desc    Get daily missions
// @route   GET /api/missions/daily
// @access  Private
exports.getDailyMissions = asyncHandler(async (req, res) => {
  await seedMissions();
  
  const { data: missions, error } = await supabase
    .from('missions')
    .select('*')
    .eq('is_daily', true)
    .eq('is_active', true)
    .limit(6);

  if (error) return res.status(400).json({ success: false, error: error.message });

  const compatMissions = missions.map(m => ({
    _id: m.id,
    id: m.id,
    title: m.title,
    xpReward: m.xp_reward,
    coinReward: m.eco_points_reward,
    carbonImpact: m.carbon_impact,
    waterImpact: m.water_impact,
    energyImpact: m.energy_impact,
    icon: m.icon
  }));

  res.status(200).json({ success: true, count: compatMissions.length, missions: compatMissions });
});

// @desc    Get weekly missions
// @route   GET /api/missions/weekly
// @access  Private
exports.getWeeklyMissions = asyncHandler(async (req, res) => {
  await seedMissions();
  
  const { data: missions, error } = await supabase
    .from('missions')
    .select('*')
    .in('difficulty', ['medium', 'hard'])
    .eq('is_active', true)
    .limit(4);

  if (error) return res.status(400).json({ success: false, error: error.message });

  const compatMissions = missions.map(m => ({
    _id: m.id,
    id: m.id,
    title: m.title,
    xpReward: m.xp_reward,
    coinReward: m.eco_points_reward,
    carbonImpact: m.carbon_impact,
    waterImpact: m.water_impact,
    energyImpact: m.energy_impact,
    icon: m.icon
  }));

  res.status(200).json({ success: true, count: compatMissions.length, missions: compatMissions });
});

// @desc    Get monthly missions
// @route   GET /api/missions/monthly
// @access  Private
exports.getMonthlyMissions = asyncHandler(async (req, res) => {
  await seedMissions();
  
  const { data: missions, error } = await supabase
    .from('missions')
    .select('*')
    .in('difficulty', ['hard', 'legendary'])
    .eq('is_active', true)
    .limit(3);

  if (error) return res.status(400).json({ success: false, error: error.message });

  const compatMissions = missions.map(m => ({
    _id: m.id,
    id: m.id,
    title: m.title,
    xpReward: m.xp_reward,
    coinReward: m.eco_points_reward,
    carbonImpact: m.carbon_impact,
    waterImpact: m.water_impact,
    energyImpact: m.energy_impact,
    icon: m.icon
  }));

  res.status(200).json({ success: true, count: compatMissions.length, missions: compatMissions });
});

// @desc    Complete a mission
// @route   POST /api/missions/complete
// @access  Private
exports.completeMission = asyncHandler(async (req, res) => {
  const { missionId } = req.body;

  const { data: mission, error: missionErr } = await supabase
    .from('missions')
    .select('*')
    .eq('id', missionId)
    .single();

  if (missionErr || !mission) {
    return res.status(404).json({ success: false, error: 'Mission not found.' });
  }

  // Check if already completed today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('user_missions')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('mission_id', missionId)
    .gte('completed_at', todayStart.toISOString());

  if (existing && existing.length > 0) {
    return res.status(400).json({ success: false, error: 'Mission already completed today.' });
  }

  // Insert completion record
  await supabase
    .from('user_missions')
    .insert({
      user_id: req.user.id,
      mission_id: missionId,
      status: 'completed'
    });

  // Award XP & Coins (which updates profiles DB and returns updated user profile)
  const awardResult = await awardXP(req.user.id, mission.xp_reward, mission.eco_points_reward);

  // Sync offsets and history in profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  const newHistory = [
    {
      name: mission.title,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      coins: mission.eco_points_reward,
      xp: mission.xp_reward
    },
    ...(profile.history || [])
  ].slice(0, 20);

  const newCarbonOffset = (Number(profile.carbon_offset) || 0) + (Number(mission.carbon_impact) || 0);
  const newWaterSaved = (Number(profile.water_saved) || 0) + (Number(mission.water_impact) || 0);
  const newEnergyConserved = (Number(profile.energy_conserved) || 0) + (Number(mission.energy_impact) || 0);

  const { data: updatedProfile } = await supabase
    .from('profiles')
    .update({
      carbon_offset: newCarbonOffset,
      water_saved: newWaterSaved,
      energy_conserved: newEnergyConserved,
      history: newHistory
    })
    .eq('id', req.user.id)
    .select()
    .single();

  // Fetch badges for formatProfile
  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_id, earned_at')
    .eq('user_id', req.user.id);

  // Map to frontend user format
  const formatProfile = (p, bList = []) => ({
    _id: p.id,
    id: p.id,
    username: p.username,
    email: p.email,
    avatar: p.avatar,
    level: p.level,
    xp: p.xp,
    coins: p.eco_points,
    ecoPoints: p.eco_points,
    carbonOffset: Number(p.carbon_offset) || 0,
    waterSaved: Number(p.water_saved) || 0,
    energyConserved: Number(p.energy_conserved) || 0,
    rank: p.guardian_rank,
    netZeroUnlocked: p.net_zero_unlocked,
    customTitleBought: p.custom_title_bought,
    scanCompleted: p.scan_completed,
    island: p.island,
    history: p.history || [],
    badges: bList.map(b => ({ id: b.badge_id, earnedAt: b.earned_at })),
    achievements: p.achievements || []
  });

  res.status(200).json({
    success: true,
    message: `✅ Mission complete: "${mission.title}" — +${mission.xp_reward} XP, +${mission.eco_points_reward} Coins!`,
    xpEarned: mission.xp_reward,
    coinsEarned: mission.eco_points_reward,
    leveledUp: awardResult?.leveledUp || false,
    newBadges: awardResult?.newBadges || [],
    user: formatProfile(updatedProfile, badges || [])
  });
});
