import mongoose from 'mongoose';

const roadSegmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Road segment name is required'],
      trim: true,
      index: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ['LineString', 'MultiLineString', 'Polygon'],
        default: 'LineString',
        required: true,
      },
      coordinates: {
        type: Array,
        required: [true, 'GeoJSON coordinates are required'],
      },
    },
    healthScore: {
      type: Number,
      default: 100, // 0 (severely damaged) to 100 (excellent)
      min: 0,
      max: 100,
    },
    issueCount: {
      type: Number,
      default: 0,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },
    recurrence: {
      type: Number,
      default: 0, // Frequency of recurring issues over past 30 days
    },
    trafficImpact: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'SEVERE'],
      default: 'LOW',
    },
    waterlogging: {
      type: Boolean,
      default: false,
    },
    lastObservedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON 2dsphere index for geospatial GIS operations
roadSegmentSchema.index({ geometry: '2dsphere' });
roadSegmentSchema.index({ healthScore: 1 });

export default mongoose.model('RoadSegment', roadSegmentSchema);
