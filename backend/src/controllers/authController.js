import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * POST /api/auth/register
 * Register a new user account.
 *
 * Request body: { name, email, password, phone, vehicleNumber }
 * Success response (201): { success, message, data: { user } }
 * Conflict response (409): duplicate email
 * Error response (500): server error
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, vehicleNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Create user (password hashing handled by pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      phone,
      vehicleNumber,
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate user with email and password, returning JWT token.
 *
 * Request body: { email, password }
 * Success response (200): { success, message, data: { token, user } }
 * Unauthorized response (401): invalid credentials
 * Error response (500): server error
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback_jwt_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};
