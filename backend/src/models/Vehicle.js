import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle registration number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: {
        values: ['2-wheeler', '4-wheeler', 'two-wheeler', 'four-wheeler'],
        message: 'Vehicle type must be 2-wheeler or 4-wheeler',
      },
      lowercase: true,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
      default: '',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
