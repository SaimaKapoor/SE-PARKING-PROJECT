import crypto from 'node:crypto';
import mongoose from 'mongoose';
import ParkingSession from '../models/ParkingSession.js';
import Payment from '../models/Payment.js';
import { runInTransaction, transactionError } from '../services/mongoTransaction.js';

export async function processMockPayment(req, res) {
  try {
    const { sessionId, outcome = 'success' } = req.body;
    if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ success: false, message: 'A valid sessionId is required' });
    }
    if (!['success', 'failure'].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'outcome must be success or failure' });
    }

    const succeeded = outcome === 'success';
    const result = await runInTransaction(async (mongoSession) => {
      const parkingSession = await ParkingSession.findOne({ _id: sessionId, customerId: req.user._id }).session(mongoSession);
      if (!parkingSession) throw transactionError('Parking session not found', 404);
      if (parkingSession.status !== 'AWAITING_PAYMENT') {
        throw transactionError('Session is not awaiting payment', 409);
      }
      const existing = await Payment.findOne({ sessionId, status: 'SUCCESS' }).session(mongoSession);
      if (existing) return { payment: existing, session: parkingSession, alreadyCompleted: true };

      const [payment] = await Payment.create([{
        sessionId,
        customerId: req.user._id,
        amount: parkingSession.fee,
        status: succeeded ? 'SUCCESS' : 'FAILED',
        provider: 'MOCK',
        transactionReference: `MOCK-${crypto.randomUUID()}`,
      }], { session: mongoSession });
      parkingSession.paymentStatus = succeeded ? 'PAID' : 'FAILED';
      await parkingSession.save({ session: mongoSession });
      return { payment, session: parkingSession, alreadyCompleted: false };
    });

    if (result.alreadyCompleted) {
      return res.json({ success: true, message: 'Payment was already completed', data: { payment: result.payment, session: result.session } });
    }
    return res.status(succeeded ? 201 : 402).json({
      success: succeeded,
      message: succeeded ? 'Mock payment successful' : 'Mock payment failed',
      data: { payment: result.payment, session: result.session },
    });
  } catch (error) {
    console.error('Payment error:', error.message);
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : 'Could not process payment' });
  }
}
