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
  const isDbHealthy = dbState === 1;

  const memUsage = process.memoryUsage();

  const healthData = {
    service: 'Vidhyut Saathi Franchise Management API',
    status: isDbHealthy ? 'OPERATIONAL' : 'DEGRADED',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: readyStates[dbState] || 'Unknown',
      readyState: dbState,
      ping: isDbHealthy ? 'OK' : 'FAIL',
    },
    system: {
      nodeVersion: process.version,
      memoryRssMb: Math.round((memUsage.rss / 1024 / 1024) * 10) / 10,
      memoryHeapUsedMb: Math.round((memUsage.heapUsed / 1024 / 1024) * 10) / 10,
    },
    services: {
      geocodingProvider: 'OSM_NOMINATIM / BigDataCloud (CONFIGURED)',
      notificationEngine: 'IN_APP_DATABASE (ACTIVE)',
      mediaStorage: process.env.CLOUDINARY_CLOUD_NAME ? 'CLOUDINARY (CONFIGURED)' : 'LOCAL_STORAGE (ACTIVE)',
      smsGateway: process.env.FAST2SMS_API_KEY ? 'FAST2SMS (CONFIGURED)' : 'DEV_MOCK_OTP (ACTIVE)',
    },
  };

  res.status(isDbHealthy ? 200 : 503).json(
    new ApiResponse(
      isDbHealthy ? 200 : 503,
      healthData,
      isDbHealthy ? 'Vidhyut Saathi system is operational' : 'System is experiencing degradation'
    )
  );
});

export default router;

