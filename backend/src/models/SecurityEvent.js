import mongoose from 'mongoose';

const securityEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ['LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'QR_VALIDATION_FAILED'],
    required: true,
    index: true,
  },
  outcome: { type: String, enum: ['DENIED'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  reason: { type: String, required: true },
}, { timestamps: true, versionKey: false });

securityEventSchema.index({ eventType: 1, createdAt: -1 });

export default mongoose.models.SecurityEvent || mongoose.model('SecurityEvent', securityEventSchema);
