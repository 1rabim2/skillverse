const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware to handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({
        field: e.param,
        message: e.msg,
        value: e.value
      }))
    });
  }
  next();
}

/**
 * Validate user registration input
 */
const validateRegistration = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and numbers'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
  handleValidationErrors
];

/**
 * Validate user login input
 */
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validate course creation/update
 */
const validateCourse = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be 10-5000 characters'),
  body('category')
    .trim()
    .isIn(['web-development', 'mobile-development', 'data-science', 'ai-ml', 'devops', 'cloud', 'databases', 'design', 'business', 'other'])
    .withMessage('Invalid category'),
  body('level')
    .trim()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid level'),
  body('price')
    .optional()
    .isFloat({ min: 0, max: 999999 })
    .withMessage('Price must be a valid number'),
  handleValidationErrors
];

/**
 * Validate quiz attempt input
 */
const validateQuizAttempt = [
  body('answers')
    .isArray({ min: 1 })
    .withMessage('Answers must be a non-empty array'),
  body('answers.*.questionId')
    .notEmpty()
    .withMessage('Question ID is required for each answer'),
  body('answers.*.selectedOption')
    .notEmpty()
    .withMessage('Selected option is required for each answer'),
  handleValidationErrors
];

/**
 * Validate project submission
 */
const validateProjectSubmission = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be 10-5000 characters'),
  body('deploymentUrl')
    .optional()
    .isURL()
    .withMessage('Deployment URL must be a valid URL'),
  body('sourceCodeUrl')
    .optional()
    .isURL()
    .withMessage('Source code URL must be a valid URL'),
  handleValidationErrors
];

/**
 * Validate community post
 */
const validateCommunityPost = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Title must be 5-300 characters'),
  body('content')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Content must be 10-5000 characters'),
  handleValidationErrors
];

/**
 * Validate pagination query
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = [
  param('id')
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('Invalid ID format'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateCourse,
  validateQuizAttempt,
  validateProjectSubmission,
  validateCommunityPost,
  validatePagination,
  validateObjectId,
  handleValidationErrors
};
