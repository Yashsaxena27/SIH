import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema(
  {
    issueId: {
      type: String,
      required: [true, 'Issue identifier is required'],
      unique: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Issue type is required'],
      trim: true,
      enum: ['POTHOLE', 'WATERLOGGING', 'STREETLIGHT_FAULT', 'GARBAGE_ACCUMULATION', 'ROAD_CRACK', 'OTHER'],
      index: true,
    },
    // GeoJSON Point location [longitude, latitude]
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Point coordinates [longitude, latitude] are required'],
      },
    },
    firstDetectedAt: {
      type: Date,
      default: Date.now,
    },
    lastObservedAt: {
      type: Date,
      default: Date.now,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    observationCount: {
      type: Number,
      default: 1,
    },
    busCount: {
      type: Number,
      default: 1,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
      index: true,
    },
    roadSegmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoadSegment',
      required: false,
      index: true,
    },
    evidence: [
      {
        evidenceUrl: { type: String, required: true },
        capturedAt: { type: Date, default: Date.now },
        busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
        confidence: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// GeoJSON 2dsphere index for proximity searches & spatial clustering
issueSchema.index({ location: '2dsphere' });
issueSchema.index({ status: 1, priority: -1 });

export default mongoose.model('Issue', issueSchema);
