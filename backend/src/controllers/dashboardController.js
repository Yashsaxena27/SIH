import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// get urban dashboard stats
const getDashboardStats = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Fetched dashboard stats successfully'));
});

export { getDashboardStats };
