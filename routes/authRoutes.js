const express = require('express');
const router = express.Router();
const { signup, login, logout, getMe, forgotPassword, resetPassword, verifyEmail, refreshToken } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { signupValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/signup',          authLimiter, signupValidator, signup);
router.post('/login',           authLimiter, loginValidator,  login);
router.get('/logout',           protect,                      logout);
router.get('/me',               protect,                      getMe);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidator, resetPassword);
router.get('/verify-email/:token',                            verifyEmail);
router.post('/refresh-token',                                 refreshToken);

module.exports = router;
