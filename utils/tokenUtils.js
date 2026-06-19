const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate a signed JWT access token
 * @param {string} id - User MongoDB _id
 * @returns {string} signed JWT
 */
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Generate a refresh token
 * @param {string} id - User MongoDB _id
 * @returns {string} signed refresh JWT
 */
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '30d'
  });
};

/**
 * Generate a secure random token (for email verification / password reset)
 * @returns {string} hex token
 */
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Set JWT cookie on the response
 * @param {Object} res - Express response object
 * @param {string} token - JWT string
 */
const sendTokenCookie = (res, token) => {
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };
  res.cookie('token', token, options);
};

/**
 * Send token response with user data
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  sendTokenCookie(res, accessToken);

  // Remove sensitive fields
  const userData = user.toObject ? user.toObject() : { ...user };
  delete userData.password;
  delete userData.refreshTokens;
  delete userData.resetPasswordToken;
  delete userData.emailVerificationToken;

  res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    refreshToken,
    user: userData
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateSecureToken,
  sendTokenCookie,
  sendTokenResponse
};
