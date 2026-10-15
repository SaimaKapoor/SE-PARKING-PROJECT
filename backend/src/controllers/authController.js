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
