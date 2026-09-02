import mongoose from 'mongoose';

const observationSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus reference (busId) is required'],
      index: true,
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: false, // Optional initially, populated during deduplication/clustering
      default: null,
      index: true,
    },
    detectionType: {
      type: String,
      required: [true, 'Detection Type is required'],
      trim: true,
      enum: ['POTHOLE', 'WATERLOGGING', 'STREETLIGHT_FAULT', 'GARBAGE_ACCUMULATION', 'ROAD_CRACK', 'OTHER'],
    },
    confidence: {
      type: Number,
      required: [true, 'Detection confidence score is required'],
      min: 0.0,
      max: 1.0,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: [true, 'Severity level is required'],
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude coordinate is required'],
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude coordinate is required'],
      min: -180,
      max: 180,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    evidenceUrl: {
      type: String,
      required: [true, 'Evidence image URL is required'],
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

observationSchema.index({ timestamp: -1 });
observationSchema.index({ busId: 1, timestamp: -1 });

export default mongoose.model('Observation', observationSchema);
