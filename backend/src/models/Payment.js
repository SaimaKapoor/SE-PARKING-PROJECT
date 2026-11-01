import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSession', required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
  provider: { type: String, default: 'MOCK' },
  transactionReference: { type: String, required: true, unique: true },
}, { timestamps: true });

// Deliberately do not store card numbers, CVVs, bank credentials, or payment passwords.
export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
