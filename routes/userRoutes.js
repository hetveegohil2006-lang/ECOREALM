const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, changePassword, getStats, sendFriendRequest, getFriendsLeaderboard, deleteAccount } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { updateProfileValidator, changePasswordValidator } = require('../utils/validators');

router.get('/profile',                   protect, getProfile);
router.put('/profile',                   protect, uploadAvatar, updateProfileValidator, updateProfile);
router.put('/change-password',           protect, changePasswordValidator, changePassword);
router.get('/stats',                     protect, getStats);
router.post('/friend-request/:id',       protect, sendFriendRequest);
router.get('/friends/leaderboard',       protect, getFriendsLeaderboard);
router.delete('/me',                     protect, deleteAccount);

module.exports = router;
