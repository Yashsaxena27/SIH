import express from 'express';
import {
  createObservation,
  getObservations,
  getObservationById,
} from '../controllers/observationController.js';
const router = express.Router();

router.post('/', createObservation);
router.get('/', getObservations);
router.get('/:id', getObservationById);

export default router;
