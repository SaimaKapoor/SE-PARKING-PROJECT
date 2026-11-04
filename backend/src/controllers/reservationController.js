import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
import ParkingSlot from '../models/ParkingSlot.js';

/**
 * Helper to generate a unique human-friendly reservation code: RES-XXXXXX
 */
function generateReservationId() {
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const timeSuffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `RES-${timeSuffix}${randomSuffix}`;
}

/**
 * POST /api/reservations
 * Reserve an available parking slot for the authenticated user's vehicle.
 *
 * Requirements: B-018, FR-003, UT-05, ST-01, UT-02
 */
export async function createReservation(req, res) {
  try {
    const rawSlotId = req.body.slotId || req.body.slotNumber;
    if (!rawSlotId) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID / Number is required to make a reservation',
      });
    }

    const slotId = String(rawSlotId).trim().toUpperCase();
    const vehicleId = String(
      req.body.vehicleId || req.body.vehicleNumber || req.user.vehicleNumber || ''
    )
      .trim()
      .toUpperCase();

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle registration number is required',
      });
    }

    // Check if slot exists
    const slot = await ParkingSlot.findOne({
      $or: [{ slotNumber: slotId }, { slotId: slotId }],
    });

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: `Parking slot "${slotId}" not found`,
      });
    }

    // UT-02: Reject reservation of occupied or already reserved slot
    if (slot.status !== 'AVAILABLE') {
      return res.status(409).json({
        success: false,
        message: `Parking slot "${slotId}" is currently ${slot.status.toLowerCase()} and cannot be reserved`,
      });
    }

    const durationHours = Number(req.body.durationHours) || 2;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    const reservationId = generateReservationId();

    const reservation = await Reservation.create({
      reservationId,
      userId: req.user._id,
      vehicleId,
      slotId: slot.slotNumber || slot.slotId,
      slot: slot._id,
      status: 'CONFIRMED',
      startTime,
      endTime,
    });

    // Update slot status to RESERVED and link reservation
    slot.status = 'RESERVED';
    slot.currentReservationId = reservation._id;
    await slot.save();

    return res.status(201).json({
      success: true,
      message: 'Parking slot reserved successfully',
      data: {
        reservation,
        slot,
      },
      reservation,
    });
  } catch (error) {
    console.error('Reservation creation error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create reservation',
    });
  }
}

/**
 * GET /api/reservations
 * Retrieve reservations for the authenticated user (or all if staff/admin).
 */
export async function getReservations(req, res) {
  try {
    const query = ['admin', 'staff'].includes(req.user.role)
      ? {}
      : { userId: req.user._id };

    const reservations = await Reservation.find(query)
      .populate('slot')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: reservations.length,
      data: { reservations },
      reservations,
    });
  } catch (error) {
    console.error('Error fetching reservations:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reservations',
    });
  }
}

/**
 * GET /api/reservations/:id
 * Retrieve a single reservation by ID or reservationId.
 */
export async function getReservationById(req, res) {
  try {
    const identifier = req.params.id;
    const query = mongoose.isValidObjectId(identifier)
      ? { _id: identifier }
      : { reservationId: String(identifier).toUpperCase() };

    const reservation = await Reservation.findOne(query).populate('slot').lean();

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      });
    }

    // Role check: Only reservation owner or staff/admin can view
    const isOwner = reservation.userId.toString() === req.user._id.toString();
    const isStaff = ['admin', 'staff'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access this reservation',
      });
    }

    return res.status(200).json({
      success: true,
      data: { reservation },
      reservation,
    });
  } catch (error) {
    console.error('Error fetching reservation:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reservation',
    });
  }
}

/**
 * PUT /api/reservations/:id/cancel
 * Cancel an active reservation and release the parking slot back to AVAILABLE.
 */
export async function cancelReservation(req, res) {
  try {
    const identifier = req.params.id;
    const query = mongoose.isValidObjectId(identifier)
      ? { _id: identifier }
      : { reservationId: String(identifier).toUpperCase() };

    const reservation = await Reservation.findOne(query);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      });
    }

    // Check ownership or staff privileges
    const isOwner = reservation.userId.toString() === req.user._id.toString();
    const isStaff = ['admin', 'staff'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot cancel this reservation',
      });
    }

    if (reservation.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: `Reservation cannot be cancelled as it is already ${reservation.status.toLowerCase()}`,
      });
    }

    reservation.status = 'CANCELLED';
    await reservation.save();

    // Revert slot status back to AVAILABLE if it was reserved by this reservation
    await ParkingSlot.findOneAndUpdate(
      {
        $or: [
          { currentReservationId: reservation._id },
          { slotNumber: reservation.slotId, status: 'RESERVED' },
          { slotId: reservation.slotId, status: 'RESERVED' },
        ],
      },
      {
        $set: {
          status: 'AVAILABLE',
          currentReservationId: null,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Reservation cancelled successfully and slot released',
      data: { reservation },
      reservation,
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel reservation',
    });
  }
}

