import { body, validationResult } from 'express-validator';

// SEC-003: Validate and sanitize all user-supplied fields before processing
export const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9+\-() ]{7,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('vehicleNumber')
    .trim()
    .notEmpty()
    .withMessage('Vehicle registration number is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Vehicle number must be between 2 and 20 characters')
    .escape(),
];

// Validation rules for user login
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Validation rules for vehicle registration
export const vehicleValidation = [
  body('vehicleNumber')
    .trim()
    .notEmpty()
    .withMessage('Vehicle registration number is required')
    .isLength({ min: 2, max: 20 })
    .withMessage('Vehicle number must be between 2 and 20 characters')
    .escape(),

  body('vehicleType')
    .trim()
    .notEmpty()
    .withMessage('Vehicle type is required')
    .toLowerCase()
    .isIn(['2-wheeler', '4-wheeler', 'two-wheeler', 'four-wheeler'])
    .withMessage('Vehicle type must be 2-wheeler or 4-wheeler'),

  body('model')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Model name cannot exceed 100 characters')
    .escape(),
];

// Middleware to check validation results and return 400 on failure
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};
