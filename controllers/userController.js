const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { getLevelFromXP, getRankFromLevel, getAvatarTier, checkBadges, checkAchievements } = require('../utils/xpEngine');
const { emitLevelUp, emitBadgeEarned } = require('../services/socketService');
const cloudinary = require('../services/cloudinaryService');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshTokens');
  res.status(200).json({ success: true, user });
});

// @desc    Update profile (username, email, avatar)
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  const updateData = {};
  if (username) updateData.username = username.trim();
  if (email) updateData.email = email.trim().toLowerCase();
  if (req.file && req.file.path) updateData.avatar = req.file.path;

  const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true }).select('-password');
  res.status(200).json({ success: true, message: 'Profile updated.', user });
});

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(req.body.currentPassword);
  if (!isMatch) return res.status(401).json({ success: false, error: 'Current password is incorrect.' });

  user.password = req.body.newPassword;
  await user.save();
  res.status(200).json({ success: true, message: 'Password updated successfully.' });
});

// @desc    Get user stats (XP, level, rank, badges, achievements)
// @route   GET /api/users/stats
// @access  Private
exports.getStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  const avatarTier = getAvatarTier(user.level);
  res.status(200).json({
    success: true,
    stats: {
      username: user.username,
      level: user.level,
      xp: user.xp,
      rank: user.rank,
      coins: user.coins,
      ecoPoints: user.ecoPoints,
      carbonOffset: user.carbonOffset,
      waterSaved: user.waterSaved,
      energyConserved: user.energyConserved,
      badges: user.badges,
      achievements: user.achievements,
      island: user.island,
      avatarTier
    }
  });
});

// @desc    Award XP and check for level-up, badges, achievements
// @route   POST /api/users/award-xp  (internal helper, also used by other controllers)
// @access  Private
exports.awardXP = async (userId, xpAmount, coinAmount = 0) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const oldLevel = user.level;
  user.xp += xpAmount;
  user.coins += coinAmount;
  user.ecoPoints += Math.floor(xpAmount / 10);

  const newLevel = getLevelFromXP(user.xp);
  user.level = newLevel;
  user.rank = getRankFromLevel(newLevel);

  // Check for new badges & achievements
  const existingBadgeIds = user.badges.map(b => b.id);
  const existingAchievementIds = user.achievements.map(a => a.id);
  const newBadges = checkBadges(user.toObject(), existingBadgeIds);
  const newAchievements = checkAchievements(user.toObject(), existingAchievementIds);

  if (newBadges.length) user.badges.push(...newBadges);
  if (newAchievements.length) user.achievements.push(...newAchievements);

  await user.save();

  const leveledUp = newLevel > oldLevel;

  // Emit real-time events
  if (leveledUp) {
    try { emitLevelUp(userId.toString(), { level: newLevel, rank: user.rank }); } catch {}
  }
  if (newBadges.length) {
    newBadges.forEach(b => {
      try { emitBadgeEarned(userId.toString(), b); } catch {}
    });
  }

  return { user, leveledUp, newBadges, newAchievements };
};

// @desc    Send friend request
// @route   POST /api/users/friend-request/:id
// @access  Private
exports.sendFriendRequest = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ success: false, error: 'User not found.' });
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ success: false, error: 'Cannot friend yourself.' });
  }
  res.status(200).json({ success: true, message: `Friend request sent to ${target.username}.` });
});

// @desc    Get leaderboard of friends
// @route   GET /api/users/friends/leaderboard
// @access  Private
exports.getFriendsLeaderboard = asyncHandler(async (req, res) => {
  // Simplified — returns top users for now
  const users = await User.find({})
    .select('username avatar level xp rank carbonOffset badges')
    .sort({ xp: -1 })
    .limit(20);
  res.status(200).json({ success: true, leaderboard: users });
});

// @desc    Delete account
// @route   DELETE /api/users/me
// @access  Private
exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(req.body.password);
  if (!isMatch) return res.status(401).json({ success: false, error: 'Password incorrect. Account not deleted.' });

  if (user.avatar && user.avatar.includes('cloudinary')) {
    const publicId = user.avatar.split('/').slice(-1)[0].split('.')[0];
    try { await cloudinary.uploader.destroy(`ecorealm/avatars/${publicId}`); } catch {}
  }

  await user.deleteOne();
  res.cookie('token', 'none', { expires: new Date(Date.now() + 5000), httpOnly: true });
  res.status(200).json({ success: true, message: 'Guardian account permanently deleted.' });
});
