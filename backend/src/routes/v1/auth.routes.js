import express from 'express';
import {
  adminLogin,
  partnerRequestOTP,
  partnerVerifyOTP,
  partnerResendOTP,
  getCurrentUser,
  logout,
} from '../../controllers/auth.controller.js';
import {
  validateAdminLogin,
  validatePartnerOTPRequest,
  validatePartnerOTPVerify,
} from '../../validators/auth.validator.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authRateLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// Admin Authentication
router.post('/admin/login', authRateLimiter, validateAdminLogin, adminLogin);

// Franchise Partner OTP Authentication
router.post('/partner/request-otp', authRateLimiter, validatePartnerOTPRequest, partnerRequestOTP);
router.post('/partner/verify-otp', authRateLimiter, validatePartnerOTPVerify, partnerVerifyOTP);
router.post('/partner/resend-otp', authRateLimiter, validatePartnerOTPRequest, partnerResendOTP);

// Common User Routes
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logout);

export default router;
