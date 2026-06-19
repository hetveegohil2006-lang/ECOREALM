const express = require('express');
const router = express.Router();
const { getGlobalLeaderboard, getWeeklyLeaderboard, getMonthlyLeaderboard, getFriendsLeaderboard, emitUpdate } = require('../controllers/leaderboardController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

router.get('/global',            protect, getGlobalLeaderboard);
router.get('/weekly',            protect, getWeeklyLeaderboard);
router.get('/monthly',           protect, getMonthlyLeaderboard);
router.get('/friends',           protect, getFriendsLeaderboard);
router.post('/emit',             protect, authorize('admin'), emitUpdate);

module.exports = router;
