import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: [true, 'Ticket identifier is required'],
      unique: true,
      trim: true,
      index: true,
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: [true, 'Associated Issue ID is required'],
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Assigned Department ID is required'],
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: [
        'DETECTED',
        'VERIFIED',
        'ASSIGNED',
        'IN_PROGRESS',
        'REINSPECTION',
        'RESOLVED',
        'STILL_PRESENT',
      ],
      default: 'DETECTED',
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    reinspectionStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'PASSED', 'FAILED', 'STILL_PRESENT'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ticketSchema.index({ status: 1, departmentId: 1 });
ticketSchema.index({ issueId: 1 });

export default mongoose.model('Ticket', ticketSchema);
