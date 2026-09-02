import mongoose from 'mongoose';

const busSchema = new mongoose.Schema(
  {
    busId: {
      type: String,
      required: [true, 'Bus Identifier is required'],
      unique: true,
      trim: true,
      index: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration Number is required'],
      trim: true,
    },
    routeNumber: {
      type: String,
      required: [true, 'Route Number is required'],
      trim: true,
      index: true,
    },
    deviceHardwareId: {
      type: String,
      required: [true, 'Edge Sensing Unit Hardware ID is required'],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'],
      default: 'ACTIVE',
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
busSchema.index({ busId: 1, status: 1 });

export default mongoose.model('Bus', busSchema);
