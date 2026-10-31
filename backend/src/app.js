import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { getHistory } from './controllers/sessionController.js';
import { requireAuth } from './middleware/requireAuth.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payments', paymentRoutes);
app.get('/api/history', requireAuth, getHistory);

app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'UP' : 'DOWN',
    backend: 'connected',
    database: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default app;
