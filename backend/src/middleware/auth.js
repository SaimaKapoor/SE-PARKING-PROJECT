import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { recordSecurityEvent } from '../services/securityEventLogger.js';

/**
 * Middleware to authenticate requests via JWT Bearer token.
 * Extracts token from 'Authorization: Bearer <token>' header,
 * verifies signature and expiration, and attaches user to req.user.
 *
 * Requirements: SEC-002, B-009, B-041
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      await recordSecurityEvent(req, {
        eventType: 'UNAUTHORIZED_ACCESS',
        reason: 'missing_token',
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication token required',
      });
    }

    const secret = process.env.JWT_SECRET || 'fallback_jwt_secret';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      await recordSecurityEvent(req, {
        eventType: 'UNAUTHORIZED_ACCESS',
        reason: err.name === 'TokenExpiredError' ? 'expired_token' : 'invalid_token',
      });
      return res.status(401).json({
        success: false,
        message:
          err.name === 'TokenExpiredError'
            ? 'Token has expired'
            : 'Invalid authentication token',
      });
    }

    const userId = decoded.id || decoded.sub;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      await recordSecurityEvent(req, {
        eventType: 'UNAUTHORIZED_ACCESS',
        userId,
        reason: 'user_not_found',
      });
      return res.status(401).json({
        success: false,
        message: 'User belonging to token no longer exists',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
    });
  }
};

/**
 * Middleware to restrict route access to specific roles (RBAC).
 * Returns 403 Forbidden if req.user role is not authorized.
 *
 * Requirements: SEC-002, B-009, B-039
 */
export const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      await recordSecurityEvent(req, {
        eventType: 'UNAUTHORIZED_ACCESS',
        userId: req.user?._id,
        reason: 'role_not_allowed',
      });
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions for this resource',
      });
    }
    next();
  };
};

export const requireAuth = protect;
export const requireRole = authorize;
