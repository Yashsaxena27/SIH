import express from 'express';
import { getTickets } from '../controllers/ticketController.js';

const router = express.Router();

router.get('/', getTickets);

export default router;
