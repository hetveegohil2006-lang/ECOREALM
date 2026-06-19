const express = require('express');
const router = express.Router();
const { logAssessment, getHistory, getLatest } = require('../controllers/carbonController');
const { protect } = require('../middleware/auth');

router.use(protect); // Require JWT authentication for all carbon assessment routes

router.post('/', logAssessment);
router.get('/history', getHistory);
router.get('/latest', getLatest);

module.exports = router;
