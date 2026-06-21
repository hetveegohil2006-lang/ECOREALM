const { supabase, supabaseAdmin } = require('../lib/supabase');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
// @access  Admin
exports.getAnalytics = asyncHandler(async (req, res) => {
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: totalMissions } = await supabase.from('missions').select('*', { count: 'exact', head: true });
  const { count: totalPosts } = await supabase.from('community_posts').select('*', { count: 'exact', head: true });
  const { count: totalAssessments } = await supabase.from('assessments').select('*', { count: 'exact', head: true });

  const { data: topUsers } = await supabase
    .from('profiles')
    .select('id, username, level, xp, eco_points, carbon_offset, guardian_rank')
    .order('eco_points', { ascending: false })
    .limit(5);

  const { data: assessments } = await supabase
    .from('assessments')
    .select('carbon_score');

  const avgCarbonScore = assessments && assessments.length > 0
    ? (assessments.reduce((sum, a) => sum + Number(a.carbon_score), 0) / assessments.length).toFixed(2)
    : '0.00';

  const formattedTopUsers = (topUsers || []).map(u => ({
    _id: u.id,
    id: u.id,
    username: u.username,
    level: u.level,
    xp: u.xp,
    ecoPoints: u.eco_points,
    coins: u.eco_points,
    carbonOffset: Number(u.carbon_offset) || 0,
    rank: u.guardian_rank
  }));

  res.status(200).json({
    success: true,
    analytics: {
      totalUsers: totalUsers || 0,
      totalMissions: totalMissions || 0,
      totalChallenges: 0, // Challenge logic is merged into missions for ECOREALM Postgres
      totalPosts: totalPosts || 0,
      totalAssessments: totalAssessments || 0,
      avgCarbonScore,
      topGuardians: formattedTopUsers
    }
  });
});

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Admin
exports.getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 25;
  const search = req.query.search || '';

  let query = supabase.from('profiles').select('*', { count: 'exact' });

  if (search) {
    query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: users, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  const formattedUsers = (users || []).map(u => ({
    _id: u.id,
    id: u.id,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    level: u.level,
    xp: u.xp,
    coins: u.eco_points,
    carbonOffset: Number(u.carbon_offset) || 0,
    rank: u.guardian_rank,
    role: u.role,
    createdAt: u.created_at
  }));

  res.status(200).json({ success: true, users: formattedUsers, total: count || 0, page, pages: Math.ceil((count || 0) / limit) });
});

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Admin
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin', 'moderator'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role.' });
  }

  const { data: user, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !user) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }

  res.status(200).json({
    success: true,
    message: `Role updated to ${role}.`,
    user: {
      _id: user.id,
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// @desc    Ban / deactivate a user
// @route   DELETE /api/admin/users/:id
// @access  Admin
exports.banUser = asyncHandler(async (req, res) => {
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role, username')
    .eq('id', req.params.id)
    .single();

  if (!userProfile) {
    return res.status(404).json({ success: false, error: 'User not found.' });
  }
  if (userProfile.role === 'admin') {
    return res.status(403).json({ success: false, error: 'Cannot ban an admin.' });
  }

  // Delete auth record (requires Service Role admin client)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  
  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  res.status(200).json({ success: true, message: `User ${userProfile.username} has been removed.` });
});

// @desc    Create a new mission (admin)
// @route   POST /api/admin/missions
// @access  Admin
exports.createMission = asyncHandler(async (req, res) => {
  const { title, description, category, difficulty, xpReward, coinReward, carbonImpact, waterImpact, energyImpact, icon, isDaily } = req.body;

  const { data: mission, error } = await supabase
    .from('missions')
    .insert({
      title,
      description,
      category: category || 'general',
      difficulty: difficulty || 'easy',
      xp_reward: xpReward || 50,
      eco_points_reward: coinReward || 25,
      carbon_impact: carbonImpact || 0,
      water_impact: waterImpact || 0,
      energy_impact: energyImpact || 0,
      icon: icon || '🌱',
      is_daily: isDaily !== undefined ? isDaily : true,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  res.status(201).json({
    success: true,
    message: 'Mission created.',
    mission: {
      _id: mission.id,
      id: mission.id,
      title: mission.title,
      description: mission.description,
      xpReward: mission.xp_reward,
      coinReward: mission.eco_points_reward
    }
  });
});

// @desc    Create a new challenge (stubbed for Postgres schema merge)
// @route   POST /api/admin/challenges
// @access  Admin
exports.createChallenge = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, message: 'Challenge created and merged into missions.' });
});

// @desc    Moderate community post
// @route   DELETE /api/admin/posts/:id
// @access  Admin
exports.removePost = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    return res.status(404).json({ success: false, error: 'Post not found.' });
  }

  res.status(200).json({ success: true, message: 'Post removed by admin.' });
});
