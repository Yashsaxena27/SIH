import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import issueRoutes from './routes/issueRoutes.js';
import observationRoutes from './routes/observationRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import roadRoutes from './routes/roadRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

// Import Error Middleware
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));
app.use(cookieParser());

app.use('/api/issues', issueRoutes);
app.use('/api/observations', observationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/roads', roadRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(errorHandler);

export default app;