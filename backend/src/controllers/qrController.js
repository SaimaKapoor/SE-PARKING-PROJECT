import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
import { recordSecurityEvent } from '../services/securityEventLogger.js';

const TOKEN_LIFETIME_MS = 15 * 60 * 1000;

function reservationQuery(identifier) {
  return mongoose.isValidObjectId(identifier)
    ? { _id: identifier }
    : { reservationId: String(identifier || '').trim().toUpperCase() };
}

export async function generateReservationQr(req, res) {
  try {
    const identifier = req.body.reservationId || req.body.reservation;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Reservation ID is required' });
    }
    const reservation = await Reservation.findOne({
      ...reservationQuery(identifier),
      userId: req.user._id,
    });
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }
    const now = new Date();
    if (reservation.status !== 'CONFIRMED' || reservation.endTime <= now) {
      return res.status(409).json({ success: false, message: 'Reservation is not active and cannot receive a QR code' });
    }
    if (reservation.qrUsedAt) {
      return res.status(409).json({ success: false, message: 'This reservation QR has already been used' });
    }

    const token = randomUUID();
    const expiresAt = new Date(Math.min(now.getTime() + TOKEN_LIFETIME_MS, reservation.endTime.getTime()));
    const updated = await Reservation.findOneAndUpdate(
      { _id: reservation._id, userId: req.user._id, status: 'CONFIRMED', endTime: { $gt: now }, qrUsedAt: { $exists: false } },
      { $set: { qrToken: token, qrExpiresAt: expiresAt }, $unset: { qrUsedAt: 1 } },
      { new: true }
    );
    if (!updated) {
      return res.status(409).json({ success: false, message: 'Reservation is no longer eligible for a QR code' });
    }
    const qrCode = await QRCode.toDataURL(token, { errorCorrectionLevel: 'M' });
    return res.status(201).json({
      success: true,
      message: 'Reservation QR generated successfully',
      data: {
        qrCode,
        expiresAt,
        reservation: {
          _id: updated._id,
          reservationId: updated.reservationId,
          slotId: updated.slotId,
          vehicleId: updated.vehicleId,
          startTime: updated.startTime,
          endTime: updated.endTime,
        },
      },
    });
  } catch (error) {
    console.error('QR generation error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to generate reservation QR' });
  }
}

export async function validateReservationQr(req, res) {
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
  if (!token || token.length > 100) {
    await recordSecurityEvent(req, { eventType: 'QR_VALIDATION_FAILED', userId: req.user._id, reason: 'invalid_token' });
    return res.status(400).json({ success: false, message: 'A valid QR token is required' });
  }
  try {
    const now = new Date();
    const reservation = await Reservation.findOneAndUpdate(
      {
        qrToken: token,
        status: 'CONFIRMED',
        endTime: { $gt: now },
        qrExpiresAt: { $gt: now },
        qrUsedAt: { $exists: false },
      },
      { $set: { qrUsedAt: now } },
      { new: true }
    ).populate('slot');

    if (!reservation) {
      const existing = await Reservation.findOne({ qrToken: token }).select('+qrToken');
      const reason = !existing
        ? 'invalid_token'
        : existing.qrUsedAt
          ? 'token_reused'
          : existing.status !== 'CONFIRMED'
            ? 'reservation_cancelled'
            : 'expired_token';
      await recordSecurityEvent(req, { eventType: 'QR_VALIDATION_FAILED', userId: req.user._id, reason });
      const reused = reason === 'token_reused';
      return res.status(reused ? 409 : 400).json({
        success: false,
        message: reused ? 'This QR code has already been used' : 'QR code is invalid, expired, or no longer active',
        reason,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'QR code validated successfully',
      data: {
        reservation: {
          reservationId: reservation.reservationId,
          slotId: reservation.slotId,
          vehicleId: reservation.vehicleId,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          status: reservation.status,
        },
      },
    });
  } catch (error) {
    console.error('QR validation error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to validate QR code' });
  }
}
