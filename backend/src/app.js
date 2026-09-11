import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import v1Routes from './routes/v1/index.js';
import { notFound, errorHandler } from './middlewares/error.middleware.js';
import { apiRateLimiter } from './middlewares/rateLimiter.middleware.js';

const app = express();

// Security Middlewares
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by Access-Control-Allow-Origin'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// General Rate Limiter
app.use(apiRateLimiter);

// Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Mount REST API v1
app.use('/api/v1', v1Routes);

// Root Welcome Route
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Vidhyut Saathi Franchise Management API',
    version: '1.0.0',
    documentation: '/api/v1/health',
  });
});

// Centralized 404 and Global Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
