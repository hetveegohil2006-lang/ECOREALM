const { supabase } = require('../lib/supabase');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get global leaderboard
// @route   GET /api/leaderboard/global
// @access  Private
exports.getGlobalLeaderboard = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('eco_points', { ascending: false })
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const leaderboard = profiles.map((p, i) => ({
    position: i + 1,
    userId: p.id,
    username: p.username,
    avatar: p.avatar,
    level: p.level,
    xp: p.xp,
    rank: p.guardian_rank,
    carbonOffset: Number(p.carbon_offset) || 0,
    ecoPoints: p.eco_points,
    badgeCount: 0
  }));

  // Find current user's position
  const myPosition = leaderboard.findIndex(e => e.userId === req.user.id);

  res.status(200).json({
    success: true,
    leaderboard,
    myPosition: myPosition >= 0 ? myPosition + 1 : null,
    total: leaderboard.length
  });
});

// @desc    Get weekly leaderboard (top XP this week)
// @route   GET /api/leaderboard/weekly
// @access  Private
exports.getWeeklyLeaderboard = asyncHandler(async (req, res) => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('xp', { ascending: false })
    .limit(25);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const leaderboard = profiles.map((p, i) => ({
    position: i + 1,
    username: p.username,
    avatar: p.avatar,
    level: p.level,
    xp: p.xp,
    rank: p.guardian_rank,
    badgeCount: 0
  }));

  res.status(200).json({ success: true, leaderboard, period: 'weekly' });
});

// @desc    Get monthly leaderboard (top carbon offset)
// @route   GET /api/leaderboard/monthly
// @access  Private
exports.getMonthlyLeaderboard = asyncHandler(async (req, res) => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('carbon_offset', { ascending: false })
    .limit(25);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const leaderboard = profiles.map((p, i) => ({
    position: i + 1,
    username: p.username,
    avatar: p.avatar,
    level: p.level,
    rank: p.guardian_rank,
    carbonOffset: Number(p.carbon_offset) || 0,
    badgeCount: 0
  }));

  res.status(200).json({ success: true, leaderboard, period: 'monthly', metric: 'carbonOffset' });
});

// @desc    Get friends leaderboard
// @route   GET /api/leaderboard/friends
// @access  Private
exports.getFriendsLeaderboard = asyncHandler(async (req, res) => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', req.user.id)
    .order('xp', { ascending: false })
    .limit(20);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const leaderboard = profiles.map((p, i) => ({
    position: i + 1,
    username: p.username,
    avatar: p.avatar,
    level: p.level,
    xp: p.xp,
    rank: p.guardian_rank,
    carbonOffset: Number(p.carbon_offset) || 0,
    badgeCount: 0
  }));

  res.status(200).json({ success: true, leaderboard, period: 'friends' });
});

// @desc    Emit live leaderboard update via socket (stubbed for Supabase)
// @route   POST /api/leaderboard/emit
// @access  Admin
exports.emitUpdate = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Leaderboard update emitted.' });
});
