import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Department type is required'],
      trim: true,
      enum: ['PUBLIC_WORKS', 'MUNICIPAL_CORPORATION', 'ELECTRICITY_BOARD', 'TRAFFIC_MANAGEMENT', 'WATER_SEWERAGE'],
    },
    contactInformation: {
      email: {
        type: String,
        required: [true, 'Department contact email is required'],
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: [true, 'Department contact phone is required'],
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    supportedIssueTypes: [
      {
        type: String,
        enum: ['POTHOLE', 'WATERLOGGING', 'STREETLIGHT_FAULT', 'GARBAGE_ACCUMULATION', 'ROAD_CRACK', 'OTHER'],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
departmentSchema.index({ name: 1 });
departmentSchema.index({ supportedIssueTypes: 1 });

export default mongoose.model('Department', departmentSchema);
