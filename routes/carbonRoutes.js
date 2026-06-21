const express = require('express');
const router = express.Router();
const { logAssessment, getHistory, getLatest } = require('../controllers/carbonController');
const { protect } = require('../middleware/auth');
const { carbonAssessmentValidator } = require('../utils/validators');

router.use(protect); // Require JWT authentication for all carbon assessment routes

router.post('/', carbonAssessmentValidator, logAssessment);
router.get('/history', getHistory);
router.get('/latest', getLatest);

module.exports = router;
