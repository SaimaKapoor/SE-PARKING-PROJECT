import mongoose from 'mongoose';
import ParkingSession from '../models/ParkingSession.js';
import ParkingSlot from '../models/ParkingSlot.js';
import Payment from '../models/Payment.js';

const PAYMENT_STATUSES = ['SUCCESS', 'FAILED'];
const MAX_PAGE_SIZE = 100;

export async function getAdminTransactionRecords(req, res) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
      return res.status(400).json({ success: false, message: 'page and limit must be positive integers' });
    }

    const filter = {};
    if (req.query.status !== undefined) {
      const status = String(req.query.status).trim().toUpperCase();
      if (!PAYMENT_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'status must be SUCCESS or FAILED' });
      }
      filter.status = status;
    }

    if (req.query.userId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.userId)) {
        return res.status(400).json({ success: false, message: 'userId must be a valid ID' });
      }
      filter.customerId = req.query.userId;
    }

    if (req.query.sessionId !== undefined) {
      if (!mongoose.isValidObjectId(req.query.sessionId)) {
        return res.status(400).json({ success: false, message: 'sessionId must be a valid ID' });
      }
      filter.sessionId = req.query.sessionId;
    }

    if (req.query.from !== undefined || req.query.to !== undefined) {
      const createdAt = {};
      if (req.query.from !== undefined) {
        createdAt.$gte = new Date(req.query.from);
        if (Number.isNaN(createdAt.$gte.getTime())) {
          return res.status(400).json({ success: false, message: 'from must be a valid date' });
        }
      }
      if (req.query.to !== undefined) {
        createdAt.$lte = new Date(req.query.to);
        if (Number.isNaN(createdAt.$lte.getTime())) {
          return res.status(400).json({ success: false, message: 'to must be a valid date' });
        }
      }
      if (createdAt.$gte && createdAt.$lte && createdAt.$gte > createdAt.$lte) {
        return res.status(400).json({ success: false, message: 'from must be earlier than or equal to to' });
      }
      filter.createdAt = createdAt;
    }

    const pageSize = Math.min(limit, MAX_PAGE_SIZE);
    const [payments, total, sessions, slotUsage] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate('customerId', 'name email')
        .populate('sessionId', 'reservationId vehicleId slotId entryTime exitTime fee status')
        .lean(),
      Payment.countDocuments(filter),
      ParkingSession.find()
        .sort({ entryTime: -1 })
        .populate('customerId', 'name email')
        .lean(),
      ParkingSlot.find()
        .sort({ floor: 1, slotNumber: 1 })
        .populate('currentSessionId', 'customerId vehicleId slotId entryTime status')
        .populate('currentReservationId', 'reservationId userId vehicleId status startTime endTime')
        .lean(),
    ]);

    const transactions = payments.map((payment) => ({
      transactionId: payment._id,
      transactionReference: payment.transactionReference,
      user: payment.customerId,
      session: payment.sessionId,
      amount: payment.amount,
      provider: payment.provider,
      status: payment.status,
      timestamp: payment.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        sessions,
        slotUsage,
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (error) {
    console.error('Admin transaction records error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not retrieve transaction records' });
  }
}
