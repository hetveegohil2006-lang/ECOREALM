const { body, param, query, validationResult } = require('express-validator');

// Middleware to check validation results and return errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array().map(e => e.msg).join(', ')
    });
  }
  next();
};

// Auth validators
const signupValidator = [
  body('username')
    .trim().notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, _ and -'),
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

const forgotPasswordValidator = [
  body('email').trim().isEmail().withMessage('Please enter a valid email'),
  validate
];

const resetPasswordValidator = [
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
];

// Chat validator
const chatValidator = [
  body('message')
    .trim().notEmpty().withMessage('Message cannot be empty')
    .isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters'),
  validate
];

// Community post validator
const postValidator = [
  body('title')
    .trim().notEmpty().withMessage('Post title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('content')
    .trim().notEmpty().withMessage('Post content is required')
    .isLength({ max: 5000 }).withMessage('Content cannot exceed 5000 characters'),
  body('category')
    .optional().isIn(['tips', 'achievement', 'challenge', 'discussion', 'news', 'general'])
    .withMessage('Invalid category'),
  validate
];

// Diagnostic submit validator
const diagnosticValidator = [
  body('transportation').isNumeric().withMessage('Transportation value must be numeric'),
  body('energy').isNumeric().withMessage('Energy value must be numeric'),
  body('food').isNumeric().withMessage('Food value must be numeric'),
  body('waste').isNumeric().withMessage('Waste value must be numeric'),
  body('water').isNumeric().withMessage('Water value must be numeric'),
  body('shopping').isNumeric().withMessage('Shopping value must be numeric'),
  validate
];

// Carbon assessment validator
const carbonAssessmentValidator = [
  body('breakdown').notEmpty().withMessage('Breakdown details are required'),
  body('breakdown.travel').isNumeric().withMessage('Travel must be a numeric value'),
  body('breakdown.food').isNumeric().withMessage('Food must be a numeric value'),
  body('breakdown.electricity').isNumeric().withMessage('Electricity must be a numeric value'),
  body('breakdown.waste').isNumeric().withMessage('Waste must be a numeric value'),
  body('breakdown.water').isNumeric().withMessage('Water must be a numeric value'),
  body('breakdown.shopping').isNumeric().withMessage('Shopping must be a numeric value'),
  body('period').optional().isString().withMessage('Period must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  validate
];

// Update profile validator
const updateProfileValidator = [
  body('username').optional().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters'),
  body('email').optional().trim().isEmail().withMessage('Please enter a valid email'),
  validate
];

// Change password validator
const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate
];

module.exports = {
  validate,
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  chatValidator,
  postValidator,
  diagnosticValidator,
  carbonAssessmentValidator,
  updateProfileValidator,
  changePasswordValidator
};
