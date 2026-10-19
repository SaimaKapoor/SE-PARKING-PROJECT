import mongoose from 'mongoose';

const parkingSessionSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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

export default mongoose.models.ParkingSession || mongoose.model('ParkingSession', parkingSessionSchema);
