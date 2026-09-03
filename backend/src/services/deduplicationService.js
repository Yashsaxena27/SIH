import Issue from '../models/Issue.js';
import Observation from '../models/Observation.js';
import Bus from '../models/Bus.js';

const SEVERITY_RANK = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};



const processObservationDeduplication = async (observation) => {
  const { _id, busId, detectionType, severity, latitude, longitude, timestamp, evidenceUrl, confidence } = observation;

  // Spatial search distance threshold: 30 meters
  const MAX_DISTANCE_METERS = 30;

  // 1. Search for an existing open/verified issue of the same type within MAX_DISTANCE_METERS
  const existingIssue = await Issue.findOne({
    type: detectionType,
    status: { $in: ['OPEN', 'VERIFIED', 'IN_PROGRESS'] },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude], // GeoJSON format: [longitude, latitude]
        },
        $maxDistance: MAX_DISTANCE_METERS,
      },
    },
  });

  let issue;
  let isNewIssue = false;

  if (!existingIssue) {
    // 2. No matching issue within 30 meters -> Create a new Issue
    const generatedIssueId = `ISS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    issue = await Issue.create({
      issueId: generatedIssueId,
      type: detectionType,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      firstDetectedAt: timestamp || new Date(),
      lastObservedAt: timestamp || new Date(),
      severity: severity,
      priority: severity, // Initial priority set to severity level
      status: 'OPEN',
      observationCount: 1,
      busCount: 1,
      evidence: [
        {
          evidenceUrl,
          capturedAt: timestamp || new Date(),
          busId,
          confidence,
        },
      ],
    });

    isNewIssue = true;
  } else {
    // 3. Matching issue found -> Link observation & update issue counters/severity
    issue = existingIssue;

    // Check if this bus has already submitted an evidence for this issue
    const existingBusEvidence = issue.evidence.some(
      (item) => item.busId && item.busId.toString() === busId.toString()
    );

    if (!existingBusEvidence) {
      issue.busCount += 1;
    }

    issue.observationCount += 1;
    issue.lastObservedAt = timestamp || new Date();

    // Upgrade severity if current observation has higher severity rank
    if (SEVERITY_RANK[severity] > SEVERITY_RANK[issue.severity]) {
      issue.severity = severity;
      // Upgrade priority if severity increased
      if (SEVERITY_RANK[severity] > SEVERITY_RANK[issue.priority]) {
        issue.priority = severity;
      }
    }

    // Append evidence
    issue.evidence.push({
      evidenceUrl,
      capturedAt: timestamp || new Date(),
      busId,
      confidence,
    });

    await issue.save();
  }

  // 4. Associate observation with the issue ID and save
  observation.issueId = issue._id;
  await observation.save();

  return {
    observation,
    issue,
    isNewIssue,
  };
};

export { processObservationDeduplication };
