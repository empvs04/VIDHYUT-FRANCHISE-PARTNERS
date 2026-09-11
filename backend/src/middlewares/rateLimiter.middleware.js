import rateLimit from 'express-rate-limit';

// Strict rate limiter for login & OTP endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // Max 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});
