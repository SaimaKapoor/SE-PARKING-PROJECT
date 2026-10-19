import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, vehicleNumber } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    const user = await User.create({ name, email, password, phone, vehicleNumber });
    return res.status(201).json({ success: true, message: 'Registration successful', data: { user } });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    console.error('Registration error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Authentication is not configured' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });
    return res.json({ success: true, message: 'Login successful', data: { token, user: user.toJSON() } });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
};
