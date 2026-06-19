const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const { sendTokenResponse, generateSecureToken } = require('../utils/tokenUtils');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

// @desc    Register a new Guardian
// @route   POST /api/auth/signup
// @access  Public
exports.signup = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const user = await User.create({ username, email, password });

  // Send verification email (non-blocking)
  const token = generateSecureToken();
  user.emailVerificationToken = token;
  await user.save({ validateBeforeSave: false });
  try { await sendVerificationEmail(user, token); } catch (e) { console.warn('Email send failed:', e.message); }

  sendTokenResponse(user, 201, res, 'Guardian account created! Check your email to verify.');
});

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials.' });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials.' });

  sendTokenResponse(user, 200, res, 'Welcome back, Guardian!');
});

// @desc    Logout — clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 5000), httpOnly: true });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, user });
});

// @desc    Forgot Password — sends reset email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ success: false, error: 'No account with that email.' });

  const resetToken = generateSecureToken();
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(user, resetToken);
    res.status(200).json({ success: true, message: 'Password reset link sent to your email.' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500).json({ success: false, error: 'Email could not be sent.' });
  }
});

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired reset token.' });

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password reset successful!');
});

// @desc    Verify Email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ emailVerificationToken: req.params.token });
  if (!user) return res.status(400).json({ success: false, error: 'Invalid verification token.' });

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: 'Email verified! Your Guardian status is now active.' });
});

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, error: 'No refresh token provided.' });

  const jwt = require('jsonwebtoken');
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ success: false, error: 'User not found.' });

  const { generateAccessToken } = require('../utils/tokenUtils');
  const newAccessToken = generateAccessToken(user._id);

  res.status(200).json({ success: true, accessToken: newAccessToken });
});
