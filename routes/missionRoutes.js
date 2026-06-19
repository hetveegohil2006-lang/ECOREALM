const express = require('express');
const router = express.Router();
const { getMissions, getDailyMissions, getWeeklyMissions, getMonthlyMissions, completeMission } = require('../controllers/missionController');
const { protect } = require('../middleware/auth');

router.get('/',          protect, getMissions);
router.get('/daily',     protect, getDailyMissions);
router.get('/weekly',    protect, getWeeklyMissions);
router.get('/monthly',   protect, getMonthlyMissions);
router.post('/complete', protect, completeMission);

module.exports = router;
