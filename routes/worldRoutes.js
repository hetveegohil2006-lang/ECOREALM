const express = require('express');
const router = express.Router();
const { getRegions, contribute, unlockRegion, getSummary } = require('../controllers/worldController');
const { protect } = require('../middleware/auth');

router.get('/',                  protect, getRegions);
router.get('/summary',                    getSummary);  // Public - for landing page
router.post('/:id/contribute',   protect, contribute);
router.post('/:id/unlock',       protect, unlockRegion);

module.exports = router;
