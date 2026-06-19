const User = require('../models/User');
const Mission = require('../models/Mission');
const Challenge = require('../models/Challenge');
const CommunityPost = require('../models/CommunityPost');
const CarbonAssessment = require('../models/CarbonAssessment');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
// @access  Admin
exports.getAnalytics = asyncHandler(async (req, res) => {
  const [users, missions, challenges, posts, assessments] = await Promise.all([
    User.countDocuments(),
    Mission.countDocuments(),
    Challenge.countDocuments(),
    CommunityPost.countDocuments({ isVisible: true }),
    CarbonAssessment.countDocuments()
  ]);

  const topUsers = await User.find()
    .select('username level xp ecoPoints carbonOffset rank')
    .sort({ ecoPoints: -1 })
    .limit(5);

  const avgCarbon = await CarbonAssessment.aggregate([
    { $group: { _id: null, avg: { $avg: '$annualScore' } } }
  ]);

  res.status(200).json({
    success: true,
    analytics: {
      totalUsers: users,
      totalMissions: missions,
      totalChallenges: challenges,
      totalPosts: posts,
      totalAssessments: assessments,
      avgCarbonScore: avgCarbon[0]?.avg?.toFixed(2) || '0.00',
      topGuardians: topUsers
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

  const filter = search ? { $or: [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};

  const users = await User.find(filter)
    .select('-password -refreshTokens -resetPasswordToken -emailVerificationToken')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await User.countDocuments(filter);

  res.status(200).json({ success: true, users, total, page, pages: Math.ceil(total / limit) });
});

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Admin
exports.updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin', 'moderator'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role.' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
  res.status(200).json({ success: true, message: `Role updated to ${role}.`, user });
});

// @desc    Ban / deactivate a user
// @route   DELETE /api/admin/users/:id
// @access  Admin
exports.banUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
  if (user.role === 'admin') return res.status(403).json({ success: false, error: 'Cannot ban an admin.' });

  await user.deleteOne();
  res.status(200).json({ success: true, message: `User ${user.username} has been removed.` });
});

// @desc    Create a new mission (admin)
// @route   POST /api/admin/missions
// @access  Admin
exports.createMission = asyncHandler(async (req, res) => {
  const mission = await Mission.create(req.body);
  res.status(201).json({ success: true, message: 'Mission created.', mission });
});

// @desc    Create a new challenge (admin)
// @route   POST /api/admin/challenges
// @access  Admin
exports.createChallenge = asyncHandler(async (req, res) => {
  const challenge = await Challenge.create(req.body);
  res.status(201).json({ success: true, message: 'Challenge created.', challenge });
});

// @desc    Moderate community post
// @route   DELETE /api/admin/posts/:id
// @access  Admin
exports.removePost = asyncHandler(async (req, res) => {
  const post = await CommunityPost.findByIdAndUpdate(req.params.id, { isVisible: false }, { new: true });
  if (!post) return res.status(404).json({ success: false, error: 'Post not found.' });
  res.status(200).json({ success: true, message: 'Post removed by admin.' });
});
