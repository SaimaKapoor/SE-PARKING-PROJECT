import mongoose from 'mongoose';
import SecurityEvent from '../models/SecurityEvent.js';

/** Persist a security denial without copying request bodies or headers. */
export async function recordSecurityEvent(req, { eventType, userId = null, reason }) {
  try {
    const safeUserId = userId && mongoose.isValidObjectId(userId) ? userId : null;
    // Log Express's route template or mount prefix, never user-supplied path values.
    const requestPath = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.baseUrl || '/';
    await SecurityEvent.create({
      eventType,
      outcome: 'DENIED',
      userId: safeUserId,
      method: req.method,
      path: requestPath,
      reason,
    });
  } catch {
    // Audit persistence failures must not expose credentials or change the auth response.
    console.error('Could not persist security event');
  }
}
