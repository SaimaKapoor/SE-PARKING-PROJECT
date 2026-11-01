import mongoose from 'mongoose';

const parkingSlotSchema = new mongoose.Schema({
  slotId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  status: { type: String, enum: ['AVAILABLE', 'OCCUPIED'], default: 'AVAILABLE', index: true },
  currentSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSession', default: null },
}, { timestamps: true });

export default mongoose.models.ParkingSlot || mongoose.model('ParkingSlot', parkingSlotSchema);
