const express = require('express');
const router = express.Router();
const { startDiagnostic, submitDiagnostic, getDiagnosticResult, getDiagnosticHistory } = require('../controllers/diagnosticController');
const { protect } = require('../middleware/auth');
const { diagnosticValidator } = require('../utils/validators');

router.post('/start',             protect, startDiagnostic);
router.post('/submit',            protect, diagnosticValidator, submitDiagnostic);
router.get('/result',             protect, getDiagnosticResult);
router.get('/history',            protect, getDiagnosticHistory);

module.exports = router;
