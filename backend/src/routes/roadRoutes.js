import express from 'express';
import { getRoadSegments } from '../controllers/roadController.js';

const router = express.Router();

router.get('/', getRoadSegments);

export default router;
