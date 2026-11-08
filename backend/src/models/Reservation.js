import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema(
  {
    reservationId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicleId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    slotId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSlot',
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED', 'COMPLETED'],
      default: 'CONFIRMED',
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 60 * 60 * 1000), // Default 2 hours reservation window
    },
    qrToken: { type: String, select: false },
    qrExpiresAt: { type: Date },
    qrUsedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

reservationSchema.index({ userId: 1, status: 1 });
reservationSchema.index({ slotId: 1, status: 1 });
reservationSchema.index({ qrToken: 1 }, { unique: true, sparse: true });

const Reservation =
  mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);

export default Reservation;

