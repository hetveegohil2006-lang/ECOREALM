const express = require('express');
const router = express.Router();
const { getChallenges, joinChallenge, updateProgress, getMyChallenges } = require('../controllers/challengeController');
const { protect } = require('../middleware/auth');

router.get('/',                  protect, getChallenges);
router.get('/my',                protect, getMyChallenges);
router.post('/:id/join',         protect, joinChallenge);
router.put('/:id/progress',      protect, updateProgress);

module.exports = router;
