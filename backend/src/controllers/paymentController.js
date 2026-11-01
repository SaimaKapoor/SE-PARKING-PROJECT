import crypto from 'node:crypto';
import mongoose from 'mongoose';
import ParkingSession from '../models/ParkingSession.js';
import Payment from '../models/Payment.js';

export async function processMockPayment(req, res) {
  try {
    const { sessionId, outcome = 'success' } = req.body;
    if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({ success: false, message: 'A valid sessionId is required' });
    }
    const session = await ParkingSession.findOne({ _id: sessionId, customerId: req.user._id });
    if (!session) return res.status(404).json({ success: false, message: 'Parking session not found' });
    if (session.status !== 'AWAITING_PAYMENT') {
      return res.status(409).json({ success: false, message: 'Session is not awaiting payment' });
    }
    const existing = await Payment.findOne({ sessionId, status: 'SUCCESS' });
    if (existing) {
      return res.json({ success: true, message: 'Payment was already completed', data: { payment: existing, session } });
    }
    if (!['success', 'failure'].includes(outcome)) {
      return res.status(400).json({ success: false, message: 'outcome must be success or failure' });
    }

    const succeeded = outcome === 'success';
    const payment = await Payment.create({
      sessionId,
      customerId: req.user._id,
      amount: session.fee,
      status: succeeded ? 'SUCCESS' : 'FAILED',
      provider: 'MOCK',
      transactionReference: `MOCK-${crypto.randomUUID()}`,
    });
    session.paymentStatus = succeeded ? 'PAID' : 'FAILED';
    await session.save();
    return res.status(succeeded ? 201 : 402).json({
      success: succeeded,
      message: succeeded ? 'Mock payment successful' : 'Mock payment failed',
      data: { payment, session },
    });
  } catch (error) {
    console.error('Payment error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not process payment' });
  }
}
