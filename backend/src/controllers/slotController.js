import mongoose from 'mongoose';
import ParkingSlot from '../models/ParkingSlot.js';

const SLOT_TYPES = ['2-wheeler', '4-wheeler', 'two-wheeler', 'four-wheeler'];
const SLOT_STATUSES = ['AVAILABLE', 'RESERVED', 'OCCUPIED'];

function slotQuery(identifier) {
  const value = String(identifier).trim();
  if (mongoose.isValidObjectId(value)) return { _id: value };
  const slotId = value.toUpperCase();
  return { $or: [{ slotNumber: slotId }, { slotId }] };
}

function handleSlotWriteError(error, res, message) {
  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: 'A parking slot with this number already exists' });
  }
  if (error?.name === 'ValidationError' || error?.name === 'CastError') {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error(`${message}:`, error.message);
  return res.status(500).json({ success: false, message });
}

function isNonNegativeNumber(value) {
  return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
    && Number.isFinite(Number(value))
    && Number(value) >= 0;
}

/** POST /api/admin/slots */
export async function createAdminSlot(req, res) {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'A slot object is required' });
    }
    const { slotNumber, slotId, floor, type, hourlyRate, status } = req.body;
    const rawIdentifier = slotNumber ?? slotId;
    if (typeof rawIdentifier !== 'string' || !rawIdentifier.trim()) {
      return res.status(400).json({ success: false, message: 'slotNumber is required' });
    }
    if (slotNumber && slotId && String(slotNumber).trim().toUpperCase() !== String(slotId).trim().toUpperCase()) {
      return res.status(400).json({ success: false, message: 'slotNumber and slotId must match' });
    }
    if (floor !== undefined && !isNonNegativeNumber(floor)) {
      return res.status(400).json({ success: false, message: 'floor must be a non-negative number' });
    }
    if (type !== undefined && !SLOT_TYPES.includes(String(type).trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: `type must be one of: ${SLOT_TYPES.join(', ')}` });
    }
    if (hourlyRate !== undefined && !isNonNegativeNumber(hourlyRate)) {
      return res.status(400).json({ success: false, message: 'hourlyRate must be a non-negative number' });
    }
    if (status !== undefined && String(status).trim().toUpperCase() !== 'AVAILABLE') {
      return res.status(400).json({ success: false, message: 'New parking slots must start as AVAILABLE' });
    }

    const normalizedSlotNumber = rawIdentifier.trim().toUpperCase();
    const slot = await ParkingSlot.create({
      slotNumber: normalizedSlotNumber,
      slotId: normalizedSlotNumber,
      ...(floor !== undefined ? { floor: Number(floor) } : {}),
      ...(type !== undefined ? { type: String(type).trim().toLowerCase() } : {}),
      ...(hourlyRate !== undefined ? { hourlyRate: Number(hourlyRate) } : {}),
      status: 'AVAILABLE',
    });

    return res.status(201).json({ success: true, message: 'Parking slot created', data: { slot } });
  } catch (error) {
    return handleSlotWriteError(error, res, 'Could not create parking slot');
  }
}

/** PUT /api/admin/slots/:id */
export async function updateAdminSlot(req, res) {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'A slot object is required' });
    }
    const allowedFields = ['slotNumber', 'slotId', 'floor', 'type', 'status', 'hourlyRate'];
    const fields = Object.keys(req.body);
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one slot field is required' });
    }
    if (fields.some((field) => !allowedFields.includes(field))) {
      return res.status(400).json({ success: false, message: 'Request contains unsupported slot fields' });
    }

    const slot = await ParkingSlot.findOne(slotQuery(req.params.id));
    if (!slot) return res.status(404).json({ success: false, message: 'Parking slot not found' });

    const { slotNumber, slotId, floor, type, status, hourlyRate } = req.body;
    if (slotNumber !== undefined || slotId !== undefined) {
      if (slotNumber !== undefined && (typeof slotNumber !== 'string' || !slotNumber.trim())) {
        return res.status(400).json({ success: false, message: 'slotNumber must be a non-empty string' });
      }
      if (slotId !== undefined && (typeof slotId !== 'string' || !slotId.trim())) {
        return res.status(400).json({ success: false, message: 'slotId must be a non-empty string' });
      }
      if (slotNumber && slotId && slotNumber.trim().toUpperCase() !== slotId.trim().toUpperCase()) {
        return res.status(400).json({ success: false, message: 'slotNumber and slotId must match' });
      }
      const normalizedSlotNumber = String(slotNumber ?? slotId).trim().toUpperCase();
      slot.slotNumber = normalizedSlotNumber;
      slot.slotId = normalizedSlotNumber;
    }
    if (floor !== undefined) {
      if (!isNonNegativeNumber(floor)) {
        return res.status(400).json({ success: false, message: 'floor must be a non-negative number' });
      }
      slot.floor = Number(floor);
    }
    if (type !== undefined) {
      const normalizedType = String(type).trim().toLowerCase();
      if (!SLOT_TYPES.includes(normalizedType)) {
        return res.status(400).json({ success: false, message: `type must be one of: ${SLOT_TYPES.join(', ')}` });
      }
      slot.type = normalizedType;
    }
    if (status !== undefined) {
      const normalizedStatus = String(status).trim().toUpperCase();
      if (!SLOT_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ success: false, message: `status must be one of: ${SLOT_STATUSES.join(', ')}` });
      }
      slot.status = normalizedStatus;
      if (normalizedStatus === 'AVAILABLE') {
        slot.currentSessionId = null;
        slot.currentReservationId = null;
      }
    }
    if (hourlyRate !== undefined) {
      if (!isNonNegativeNumber(hourlyRate)) {
        return res.status(400).json({ success: false, message: 'hourlyRate must be a non-negative number' });
      }
      slot.hourlyRate = Number(hourlyRate);
    }

    await slot.save();
    return res.status(200).json({ success: true, message: 'Parking slot updated', data: { slot } });
  } catch (error) {
    return handleSlotWriteError(error, res, 'Could not update parking slot');
  }
}

/** PUT /api/admin/slots/:id/rate */
export async function updateAdminSlotRate(req, res) {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'hourlyRate is required' });
    }
    const { hourlyRate } = req.body;
    if (!isNonNegativeNumber(hourlyRate)) {
      return res.status(400).json({ success: false, message: 'hourlyRate must be a non-negative number' });
    }

    const slot = await ParkingSlot.findOne(slotQuery(req.params.id));
    if (!slot) return res.status(404).json({ success: false, message: 'Parking slot not found' });

    slot.hourlyRate = Number(hourlyRate);
    await slot.save();
    return res.status(200).json({ success: true, message: 'Parking slot rate updated', data: { slot } });
  } catch (error) {
    return handleSlotWriteError(error, res, 'Could not update parking slot rate');
  }
}

/** DELETE /api/admin/slots/:id */
export async function deleteAdminSlot(req, res) {
  try {
    const slot = await ParkingSlot.findOne(slotQuery(req.params.id));
    if (!slot) return res.status(404).json({ success: false, message: 'Parking slot not found' });
    if (slot.status !== 'AVAILABLE' || slot.currentSessionId || slot.currentReservationId) {
      return res.status(409).json({ success: false, message: 'Only unassigned AVAILABLE slots can be deleted' });
    }

    await slot.deleteOne();
    return res.status(200).json({ success: true, message: 'Parking slot deleted', data: { slot } });
  } catch (error) {
    return handleSlotWriteError(error, res, 'Could not delete parking slot');
  }
}

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

