import express from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../../utils/apiResponse.js';

const router = express.Router();

router.get('/', (req, res) => {
  const readyStates = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json(
    new ApiResponse(
      isHealthy ? 200 : 503,
      {
        service: 'Vidhyut Saathi Franchise Management API',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
          name: 'vidhyut_saathi',
          status: readyStates[dbState] || 'Unknown',
          readyState: dbState,
        },
      },
      isHealthy ? 'System is healthy and operational' : 'Database connection unavailable'
    )
  );
});

export default router;
