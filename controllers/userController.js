const { supabase } = require('../lib/supabase');
const asyncHandler = require('../middleware/asyncHandler');
const { getLevelFromXP, getRankFromLevel, getAvatarTier, checkBadges, checkAchievements } = require('../utils/xpEngine');

// Helper to format profile to match MongoDB schema structure expected by EJS
const formatProfile = (profile, badges = []) => {
  return {
    _id: profile.id,
    id: profile.id,
    username: profile.username,
    email: profile.email,
    avatar: profile.avatar,
    level: profile.level,
    xp: profile.xp,
    coins: profile.eco_points, // coins map to eco_points
    ecoPoints: profile.eco_points,
    carbonOffset: Number(profile.carbon_offset) || 0,
    waterSaved: Number(profile.water_saved) || 0,
    energyConserved: Number(profile.energy_conserved) || 0,
    rank: profile.guardian_rank,
    netZeroUnlocked: profile.net_zero_unlocked,
    customTitleBought: profile.custom_title_bought,
    scanCompleted: profile.scan_completed,
    island: profile.island,
    history: profile.history || [],
    badges: badges.map(b => ({ id: b.badge_id, earnedAt: b.earned_at })),
    achievements: profile.achievements || [],
    role: profile.role
  };
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) {
    return res.status(404).json({ success: false, error: 'Profile not found.' });
  }

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_id, earned_at')
    .eq('user_id', req.user.id);

  res.status(200).json({ success: true, user: formatProfile(profile, badges || []) });
});

// @desc    Update profile (username, email, avatar)
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  const updateData = {};
  if (username) updateData.username = username.trim();
  if (email) updateData.email = email.trim().toLowerCase();

  // Handle Supabase Storage upload if avatar file is sent
  if (req.file && req.file.buffer) {
    const fileExt = req.file.originalname.split('.').pop();
    const filename = `${req.user.id}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadErr) {
      return res.status(500).json({ success: false, error: 'Avatar upload failed: ' + uploadErr.message });
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);

    updateData.avatar = publicUrlData.publicUrl;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_id, earned_at')
    .eq('user_id', req.user.id);

  res.status(200).json({ success: true, message: 'Profile updated.', user: formatProfile(profile, badges || []) });
});

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Re-verify current credentials by signing in
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password: currentPassword
  });

  if (verifyErr) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  res.status(200).json({ success: true, message: 'Password updated successfully.' });
});

// @desc    Get user stats (XP, level, rank, badges, achievements)
// @route   GET /api/users/stats
// @access  Private
exports.getStats = asyncHandler(async (req, res) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) {
    return res.status(404).json({ success: false, error: 'Profile not found.' });
  }

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_id, earned_at')
    .eq('user_id', req.user.id);

  const formatted = formatProfile(profile, badges || []);
  const avatarTier = getAvatarTier(formatted.level);

  res.status(200).json({
    success: true,
    stats: {
      ...formatted,
      avatarTier
    }
  });
});

// @desc    Award XP and check for level-up, badges, achievements
// @route   POST /api/users/award-xp (internal helper)
// @access  Private
exports.awardXP = async (userId, xpAmount, coinAmount = 0) => {
  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const { data: badges } = await supabase
    .from('user_badges')
    .select('badge_id, earned_at')
    .eq('user_id', userId);

  const formattedUser = formatProfile(profile, badges || []);
  const oldLevel = profile.level;
  
  const newXP = profile.xp + xpAmount;
  const newCoins = profile.eco_points + coinAmount;
  const newLevel = getLevelFromXP(newXP);
  const newRank = getRankFromLevel(newLevel);

  formattedUser.xp = newXP;
  formattedUser.coins = newCoins;
  formattedUser.level = newLevel;
  formattedUser.rank = newRank;

  // Check for newly earned badges & achievements
  const existingBadgeIds = formattedUser.badges.map(b => b.id);
  const existingAchievementIds = formattedUser.achievements.map(a => a.id);
  
  const newBadges = checkBadges(formattedUser, existingBadgeIds);
  const newAchievements = checkAchievements(formattedUser, existingAchievementIds);

  const updatedAchievements = [...formattedUser.achievements, ...newAchievements];

  // Update profile database record
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .update({
      xp: newXP,
      eco_points: newCoins,
      level: newLevel,
      guardian_rank: newRank,
      achievements: updatedAchievements
    })
    .eq('id', userId)
    .select()
    .single();

  // Save new badges to user_badges table
  if (newBadges.length) {
    const badgeInserts = newBadges.map(b => ({
      user_id: userId,
      badge_id: b.id,
      earned_at: b.earnedAt
    }));
    await supabase.from('user_badges').insert(badgeInserts);
  }

  const leveledUp = newLevel > oldLevel;

  return { 
    user: formatProfile(updatedProfile, [...(badges || []), ...newBadges.map(b => ({ badge_id: b.id, earned_at: b.earnedAt }))]), 
    leveledUp, 
    newBadges, 
    newAchievements 
  };
};

// @desc    Send friend request
// @route   POST /api/users/friend-request/:id
// @access  Private
exports.sendFriendRequest = asyncHandler(async (req, res) => {
  const { data: target } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', req.params.id)
    .single();

  if (!target) return res.status(404).json({ success: false, error: 'User not found.' });
  if (req.params.id === req.user.id) {
    return res.status(400).json({ success: false, error: 'Cannot friend yourself.' });
  }

  res.status(200).json({ success: true, message: `Friend request sent to ${target.username}.` });
});

// @desc    Get leaderboard of friends
// @route   GET /api/users/friends/leaderboard
// @access  Private
exports.getFriendsLeaderboard = asyncHandler(async (req, res) => {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, username, avatar, level, xp, guardian_rank, carbon_offset')
    .order('xp', { ascending: false })
    .limit(20);

  if (error) return res.status(400).json({ success: false, error: error.message });

  // Map to match frontend expected fields
  const users = profiles.map(p => ({
    _id: p.id,
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    level: p.level,
    xp: p.xp,
    rank: p.guardian_rank,
    carbonOffset: Number(p.carbon_offset) || 0
  }));

  res.status(200).json({ success: true, leaderboard: users });
});

// @desc    Delete account
// @route   DELETE /api/users/me
// @access  Private
exports.deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  // Verify password first
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password: password
  });

  if (verifyErr) {
    return res.status(401).json({ success: false, error: 'Password incorrect. Account not deleted.' });
  }

  // Delete user account via admin client (requires Service Role)
  const { error: deleteErr } = await supabase.auth.admin.deleteUser(req.user.id);
  if (deleteErr) {
    return res.status(400).json({ success: false, error: deleteErr.message });
  }

  res.cookie('token', 'none', { expires: new Date(Date.now() + 5000), httpOnly: true });
  res.status(200).json({ success: true, message: 'Guardian account permanently deleted.' });
});
