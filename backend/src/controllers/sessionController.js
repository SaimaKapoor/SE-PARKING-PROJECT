import mongoose from 'mongoose';
import ParkingSession from '../models/ParkingSession.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Payment from '../models/Payment.js';
import { calculateParkingFee, getHourlyRate } from '../services/feeCalculation.js';

export async function recordEntry(req, res) {
  try {
    const slotId = String(req.body.slotId || req.body.qrCode || '').trim().toUpperCase();
    if (!slotId || slotId.length > 40) {
      return res.status(400).json({ success: false, message: 'Scan a valid parking-slot QR code (slotId required)' });
    }
    const active = await ParkingSession.findOne({ slotId, status: { $in: ['ACTIVE', 'AWAITING_PAYMENT'] } });
    if (active) return res.status(409).json({ success: false, message: 'This parking slot is already occupied' });

    let slot = await ParkingSlot.findOne({ slotId });
    if (slot?.status === 'OCCUPIED') {
      return res.status(409).json({ success: false, message: 'This parking slot is already occupied' });
    }
    if (!slot) slot = await ParkingSlot.create({ slotId, status: 'AVAILABLE' });
    const vehicleId = String(req.body.vehicleNumber || req.user.vehicleNumber || '').trim().toUpperCase();
    if (!vehicleId) return res.status(400).json({ success: false, message: 'Vehicle number is required' });

    const session = await ParkingSession.create({
      customerId: req.user._id,
      reservationId: req.body.reservationId || null,
      vehicleId,
      slotId,
      entryTime: new Date(),
      hourlyRate: getHourlyRate(),
      status: 'ACTIVE',
      paymentStatus: 'PENDING',
    });
    slot.status = 'OCCUPIED';
    slot.currentSessionId = session._id;
    await slot.save();
    return res.status(201).json({ success: true, message: 'Vehicle entry recorded', data: { session } });
  } catch (error) {
    console.error('Entry error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not record vehicle entry' });
  }
}

export async function recordExit(req, res) {
  try {
    const sessionId = req.body.sessionId;
    const slotId = String(req.body.slotId || req.body.qrCode || '').trim().toUpperCase();
    if (!sessionId && !slotId) return res.status(400).json({ success: false, message: 'sessionId or slotId is required' });
    const query = sessionId
      ? { _id: sessionId, customerId: req.user._id, status: 'ACTIVE' }
      : { slotId, customerId: req.user._id, status: 'ACTIVE' };
    if (sessionId && !mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid sessionId' });
    }
    const session = await ParkingSession.findOne(query);
    if (!session) return res.status(404).json({ success: false, message: 'Active parking session not found' });

    const exitTime = new Date();
    const durationMinutes = Math.max(0, Math.ceil((exitTime - session.entryTime) / 60000));
    const durationHours = durationMinutes === 0 ? 0 : Math.ceil(durationMinutes / 60);
    session.exitTime = exitTime;
    session.durationMinutes = durationMinutes;
    session.durationHours = durationHours;
    session.fee = calculateParkingFee(durationMinutes, session.hourlyRate);
    session.status = 'AWAITING_PAYMENT';
    await session.save();
    return res.json({ success: true, message: 'Exit recorded; payment is pending', data: { session } });
  } catch (error) {
    console.error('Exit error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not record vehicle exit' });
  }
}

export async function completeSession(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }
    const session = await ParkingSession.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Parking session not found' });
    if (session.paymentStatus !== 'PAID') {
      return res.status(409).json({ success: false, message: 'Complete payment before closing the session' });
    }
    session.status = 'COMPLETED';
    await session.save();
    await ParkingSlot.findOneAndUpdate(
      { slotId: session.slotId, currentSessionId: session._id },
      { $set: { status: 'AVAILABLE', currentSessionId: null } }
    );
    return res.json({ success: true, message: 'Parking session completed', data: { session } });
  } catch (error) {
    console.error('Complete session error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not complete parking session' });
  }
}

export async function getHistory(req, res) {
  try {
    const sessions = await ParkingSession.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    const payments = await Payment.find({ customerId: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { sessions, payments } });
  } catch (error) {
    console.error('History error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not load parking history' });
  }
}
