import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';


const getTickets = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, [], 'Fetched tickets successfully'));
});

export { getTickets };
