import mongoose from 'mongoose';

const parkingSlotSchema = new mongoose.Schema(
  {
    slotNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    slotId: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    floor: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    type: {
      type: String,
      enum: ['2-wheeler', '4-wheeler', 'two-wheeler', 'four-wheeler'],
      default: '4-wheeler',
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'RESERVED', 'OCCUPIED'],
      default: 'AVAILABLE',
      index: true,
    },
    hourlyRate: {
      type: Number,
      required: true,
      default: 30,
      min: 0,
    },
    currentSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSession',
      default: null,
    },
    currentReservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Keep slotId and slotNumber synchronized for backward and forward compatibility
parkingSlotSchema.pre('validate', function (next) {
  if (!this.slotNumber && this.slotId) {
    this.slotNumber = this.slotId;
  }
  if (!this.slotId && this.slotNumber) {
    this.slotId = this.slotNumber;
  }
  if (this.slotNumber) {
    this.slotNumber = this.slotNumber.toUpperCase().trim();
  }
  if (this.slotId) {
    this.slotId = this.slotId.toUpperCase().trim();
  }
  next();
});

// Composite index for fast filtering
parkingSlotSchema.index({ status: 1, type: 1, floor: 1 });

const ParkingSlot = mongoose.models.ParkingSlot || mongoose.model('ParkingSlot', parkingSlotSchema);

export default ParkingSlot;
