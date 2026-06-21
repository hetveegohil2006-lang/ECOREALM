const crypto = require('crypto');

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
    sameSite: 'lax'
  };
  res.cookie('token', token, options);
};

/**
 * Send token response with user data from Supabase profile
 */
const sendTokenResponse = (profile, session, statusCode, res, message = 'Success') => {
  const accessToken = session?.access_token || '';
  const refreshToken = session?.refresh_token || '';

  if (accessToken) {
    sendTokenCookie(res, accessToken);
  }

  res.status(statusCode).json({
    success: true,
    message,
    accessToken,
    refreshToken,
    user: {
      _id: profile.id,
      id: profile.id,
      username: profile.username,
      email: profile.email,
      avatar: profile.avatar,
      level: profile.level,
      xp: profile.xp,
      coins: profile.eco_points,
      ecoPoints: profile.eco_points,
      carbonOffset: Number(profile.carbon_offset) || 0,
      waterSaved: Number(profile.water_saved) || 0,
      energyConserved: Number(profile.energy_conserved) || 0,
      rank: profile.guardian_rank,
      netZeroUnlocked: profile.net_zero_unlocked,
      customTitleBought: profile.custom_title_bought,
      scanCompleted: profile.scan_completed,
      island: profile.island,
      history: profile.history
    }
  });
};

module.exports = {
  generateSecureToken,
  sendTokenCookie,
  sendTokenResponse
};
