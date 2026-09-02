import express from 'express';
import { getIssues } from '../controllers/issueController.js';

const router = express.Router();

router.get('/', getIssues);

export default router;
