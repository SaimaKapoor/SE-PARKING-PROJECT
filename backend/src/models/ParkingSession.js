import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const QR_TOKEN_TTL_MS = 15 * 60 * 1000;

const parkingSessionSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  qrToken: { type: String, default: randomUUID },
  qrTokenExpiresAt: { type: Date, default: () => new Date(Date.now() + QR_TOKEN_TTL_MS) },
  reservationId: { type: String, trim: true, default: null },
  vehicleId: { type: String, required: true, uppercase: true, trim: true },
  slotId: { type: String, required: true, trim: true, uppercase: true },
  entryTime: { type: Date, required: true, default: Date.now },
  exitTime: { type: Date, default: null },
  durationMinutes: { type: Number, default: null, min: 0 },
  durationHours: { type: Number, default: null, min: 0 },
  hourlyRate: { type: Number, required: true, min: 0 },
  fee: { type: Number, default: null, min: 0 },
  status: { type: String, enum: ['ACTIVE', 'AWAITING_PAYMENT', 'COMPLETED'], default: 'ACTIVE', index: true },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
}, { timestamps: true });

parkingSessionSchema.index({ customerId: 1, status: 1 });
parkingSessionSchema.index({ slotId: 1, status: 1 });
parkingSessionSchema.index({ qrToken: 1 }, { unique: true, sparse: true });

parkingSessionSchema.methods.hasValidQrToken = function (now = new Date()) {
  return Boolean(this.qrToken && this.qrTokenExpiresAt && this.qrTokenExpiresAt > now);
};

parkingSessionSchema.statics.findValidQrToken = function (token, now = new Date()) {
  return this.findOne({ qrToken: token, qrTokenExpiresAt: { $gt: now } });
};

export default mongoose.models.ParkingSession || mongoose.model('ParkingSession', parkingSessionSchema);
