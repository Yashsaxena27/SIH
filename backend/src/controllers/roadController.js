import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// @desc    Get road segment analytics
// @route   GET /api/roads
const getRoadSegments = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, [], 'Fetched road segments successfully'));
});

export { getRoadSegments };
