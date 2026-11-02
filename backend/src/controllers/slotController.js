import mongoose from 'mongoose';
import ParkingSlot from '../models/ParkingSlot.js';

/**
 * GET /api/slots
 * Retrieve parking slots with optional filtering by status, type, and floor.
 *
 * Requirements: B-014, FR-002, NFR-001
 * Query parameters:
 *  - status: AVAILABLE | RESERVED | OCCUPIED
 *  - type: 2-wheeler | 4-wheeler (case-insensitive)
 *  - floor: number
 */
export async function getSlots(req, res) {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = String(req.query.status).trim().toUpperCase();
    }

    if (req.query.type) {
      const typeStr = String(req.query.type).trim().toLowerCase();
      if (['2-wheeler', 'two-wheeler'].includes(typeStr)) {
        filter.type = { $in: ['2-wheeler', 'two-wheeler'] };
      } else if (['4-wheeler', 'four-wheeler'].includes(typeStr)) {
        filter.type = { $in: ['4-wheeler', 'four-wheeler'] };
      } else {
        filter.type = typeStr;
      }
    }

    if (req.query.floor !== undefined && req.query.floor !== '') {
      const parsedFloor = Number(req.query.floor);
      if (Number.isFinite(parsedFloor)) {
        filter.floor = parsedFloor;
      }
    }

    const slots = await ParkingSlot.find(filter)
      .sort({ floor: 1, slotNumber: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: slots.length,
      data: { slots },
      slots, // direct property for frontend convenience
    });
  } catch (error) {
    console.error('Error fetching slots:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve parking slots',
    });
  }
}

/**
 * GET /api/slots/:id
 * Retrieve a specific parking slot by ObjectId or slotNumber/slotId.
 */
export async function getSlotById(req, res) {
  try {
    const identifier = req.params.id;
    let slot;

    if (mongoose.isValidObjectId(identifier)) {
      slot = await ParkingSlot.findById(identifier).lean();
    }

    if (!slot) {
      slot = await ParkingSlot.findOne({
        $or: [
          { slotNumber: String(identifier).toUpperCase() },
          { slotId: String(identifier).toUpperCase() },
        ],
      }).lean();
    }

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { slot },
      slot,
    });
  } catch (error) {
    console.error('Error fetching slot by ID:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve parking slot',
    });
  }
}

/**
 * PUT /api/slots/:id/status
 * Update the status of a parking slot.
 * Allowed transitions: AVAILABLE -> RESERVED -> OCCUPIED -> AVAILABLE.
 *
 * Requirements: B-016, FR-006
 */
export async function updateSlotStatus(req, res) {
  try {
    const identifier = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'New status is required',
      });
    }

    const targetStatus = String(status).trim().toUpperCase();
    const validStatuses = ['AVAILABLE', 'RESERVED', 'OCCUPIED'];

    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const query = mongoose.isValidObjectId(identifier)
      ? { _id: identifier }
      : {
          $or: [
            { slotNumber: String(identifier).toUpperCase() },
            { slotId: String(identifier).toUpperCase() },
          ],
        };

    const slot = await ParkingSlot.findOne(query);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found',
      });
    }

    // Update status and clear references if slot is freed
    slot.status = targetStatus;
    if (targetStatus === 'AVAILABLE') {
      slot.currentSessionId = null;
      slot.currentReservationId = null;
    }

    await slot.save();

    return res.status(200).json({
      success: true,
      message: `Slot status updated to ${targetStatus}`,
      data: { slot },
      slot,
    });
  } catch (error) {
    console.error('Error updating slot status:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update slot status',
    });
  }
}

