const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { emitLeaderboardUpdate } = require('../services/socketService');

// @desc    Get global leaderboard
// @route   GET /api/leaderboard/global
// @access  Private
exports.getGlobalLeaderboard = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  const users = await User.find({ role: { $ne: 'admin' } })
    .select('username avatar level xp rank carbonOffset ecoPoints badges coins')
    .sort({ ecoPoints: -1, xp: -1 })
    .limit(limit);

  const leaderboard = users.map((u, i) => ({
    position: i + 1,
    userId: u._id,
    username: u.username,
    avatar: u.avatar,
    level: u.level,
    xp: u.xp,
    rank: u.rank,
    carbonOffset: u.carbonOffset,
    ecoPoints: u.ecoPoints,
    badgeCount: u.badges?.length || 0
  }));

  // Find current user's position
  const myPosition = leaderboard.findIndex(e => e.userId.toString() === req.user._id.toString());

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
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const users = await User.find({ updatedAt: { $gte: oneWeekAgo }, role: { $ne: 'admin' } })
    .select('username avatar level xp rank ecoPoints carbonOffset badges')
    .sort({ xp: -1 })
    .limit(25);

  const leaderboard = users.map((u, i) => ({
    position: i + 1,
    username: u.username,
    avatar: u.avatar,
    level: u.level,
    xp: u.xp,
    rank: u.rank,
    badgeCount: u.badges?.length || 0
  }));

  res.status(200).json({ success: true, leaderboard, period: 'weekly' });
});

// @desc    Get monthly leaderboard (top carbon offset)
// @route   GET /api/leaderboard/monthly
// @access  Private
exports.getMonthlyLeaderboard = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $ne: 'admin' } })
    .select('username avatar level rank carbonOffset ecoPoints badges')
    .sort({ carbonOffset: -1 })
    .limit(25);

  const leaderboard = users.map((u, i) => ({
    position: i + 1,
    username: u.username,
    avatar: u.avatar,
    level: u.level,
    rank: u.rank,
    carbonOffset: u.carbonOffset,
    badgeCount: u.badges?.length || 0
  }));

  res.status(200).json({ success: true, leaderboard, period: 'monthly', metric: 'carbonOffset' });
});

// @desc    Get friends leaderboard
// @route   GET /api/leaderboard/friends
// @access  Private
exports.getFriendsLeaderboard = asyncHandler(async (req, res) => {
  // Simplified — returns the top 20 closest-level users
  const user = await User.findById(req.user._id);
  const users = await User.find({
    _id: { $ne: req.user._id },
    level: { $gte: Math.max(1, user.level - 3), $lte: user.level + 5 }
  })
    .select('username avatar level xp rank carbonOffset ecoPoints badges')
    .sort({ xp: -1 })
    .limit(20);

  const leaderboard = users.map((u, i) => ({
    position: i + 1,
    username: u.username,
    avatar: u.avatar,
    level: u.level,
    xp: u.xp,
    rank: u.rank,
    carbonOffset: u.carbonOffset,
    badgeCount: u.badges?.length || 0
  }));

  res.status(200).json({ success: true, leaderboard, period: 'friends' });
});

// @desc    Emit live leaderboard update via socket
// @route   POST /api/leaderboard/emit  (internal/admin use)
// @access  Admin
exports.emitUpdate = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $ne: 'admin' } })
    .select('username level xp rank carbonOffset ecoPoints')
    .sort({ ecoPoints: -1 })
    .limit(10);
  try { emitLeaderboardUpdate(users); } catch {}
  res.status(200).json({ success: true, message: 'Leaderboard update emitted.' });
});
