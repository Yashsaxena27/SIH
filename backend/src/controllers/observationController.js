import mongoose from 'mongoose';
import Observation from '../models/Observation.js';
import Bus from '../models/Bus.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { processObservationDeduplication } from '../services/deduplicationService.js';

const ALLOWED_DETECTION_TYPES = [
  'POTHOLE',
  'WATERLOGGING',
  'STREETLIGHT_FAULT',
  'GARBAGE_ACCUMULATION',
  'ROAD_CRACK',
  'OTHER',
];

const ALLOWED_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/**
 * @desc    Ingest a new raw observation from mobile sensing bus unit
 * @route   POST /api/observations
 * @access  Public
 */
const createObservation = asyncHandler(async (req, res) => {
  const {
    busId,
    detectionType,
    confidence,
    severity,
    latitude,
    longitude,
    timestamp,
    evidenceUrl,
    metadata,
  } = req.body;

  // 1. Input Validation
  if (!busId) throw new ApiError(400, 'busId is required');
  if (!detectionType) throw new ApiError(400, 'detectionType is required');
  if (confidence === undefined || confidence === null)
    throw new ApiError(400, 'confidence is required');
  if (!severity) throw new ApiError(400, 'severity is required');
  if (latitude === undefined || latitude === null)
    throw new ApiError(400, 'latitude is required');
  if (longitude === undefined || longitude === null)
    throw new ApiError(400, 'longitude is required');
  if (!evidenceUrl) throw new ApiError(400, 'evidenceUrl is required');

  // Value validations
  if (!ALLOWED_DETECTION_TYPES.includes(detectionType)) {
    throw new ApiError(
      400,
      `Invalid detectionType. Allowed values: ${ALLOWED_DETECTION_TYPES.join(', ')}`
    );
  }

  if (!ALLOWED_SEVERITIES.includes(severity)) {
    throw new ApiError(
      400,
      `Invalid severity. Allowed values: ${ALLOWED_SEVERITIES.join(', ')}`
    );
  }

  const numConfidence = Number(confidence);
  if (isNaN(numConfidence) || numConfidence < 0 || numConfidence > 1) {
    throw new ApiError(400, 'confidence must be a number between 0.0 and 1.0');
  }

  const numLat = Number(latitude);
  if (isNaN(numLat) || numLat < -90 || numLat > 90) {
    throw new ApiError(400, 'latitude must be a valid number between -90 and 90');
  }

  const numLng = Number(longitude);
  if (isNaN(numLng) || numLng < -180 || numLng > 180) {
    throw new ApiError(400, 'longitude must be a valid number between -180 and 180');
  }

  // 2. Resolve or automatically create Bus reference
  let busDoc;
  if (mongoose.Types.ObjectId.isValid(busId)) {
    busDoc = await Bus.findById(busId);
  }

  if (!busDoc) {
    // Search by busId string code (e.g., "BUS-101")
    busDoc = await Bus.findOne({ busId: String(busId) });
  }

  if (!busDoc) {
    // If bus does not exist in database yet, auto-register fleet unit
    busDoc = await Bus.create({
      busId: String(busId),
      registrationNumber: `REG-${String(busId)}`,
      routeNumber: 'ROUTE-DEFAULT',
      deviceHardwareId: `EDGE-HW-${String(busId)}`,
      status: 'ACTIVE',
    });
  }

  // 3. Store raw Observation in MongoDB
  const newObservation = new Observation({
    busId: busDoc._id,
    detectionType,
    confidence: numConfidence,
    severity,
    latitude: numLat,
    longitude: numLng,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    evidenceUrl,
    metadata: metadata || {},
  });

  await newObservation.save();

  // 4. Delegate spatial clustering & deduplication logic to deduplicationService
  const deduplicationResult = await processObservationDeduplication(newObservation);

  // 5. Return clean JSON response
  return res.status(201).json(
    new ApiResponse(
      201,
      {
        observation: deduplicationResult.observation,
        issue: deduplicationResult.issue,
        isNewIssue: deduplicationResult.isNewIssue,
      },
      'Observation processed and associated with issue successfully'
    )
  );
});

/**
 * @desc    Get all observations with pagination & filter options
 * @route   GET /api/observations
 * @access  Public
 */
const getObservations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, detectionType, severity } = req.query;

  const query = {};
  if (detectionType) query.detectionType = detectionType;
  if (severity) query.severity = severity;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const observations = await Observation.find(query)
    .populate('busId', 'busId routeNumber registrationNumber')
    .populate('issueId', 'issueId status type priority severity')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Observation.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        observations,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
      'Fetched observations successfully'
    )
  );
});

/**
 * @desc    Get observation details by ID
 * @route   GET /api/observations/:id
 * @access  Public
 */
const getObservationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid Observation ID format');
  }

  const observation = await Observation.findById(id)
    .populate('busId', 'busId routeNumber registrationNumber status')
    .populate('issueId');

  if (!observation) {
    throw new ApiError(404, 'Observation not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, observation, 'Fetched observation successfully'));
});

export { createObservation, getObservations, getObservationById };
