const express = require('express');
const router = express.Router();
const { chat, getRecommendations, getChatHistory, clearChatHistory } = require('../controllers/coachController');
const { protect } = require('../middleware/auth');
const { chatValidator } = require('../utils/validators');
const { coachLimiter } = require('../middleware/rateLimiter');

router.post('/chat',             protect, coachLimiter, chatValidator, chat);
router.post('/recommendations',  protect, getRecommendations);
router.get('/history',           protect, getChatHistory);
router.delete('/history',        protect, clearChatHistory);

module.exports = router;
