import  {asyncHandler} from '../utils/asyncHandler.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const getIssues = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, [], 'Fetched issues successfully'));
});

export { getIssues };
