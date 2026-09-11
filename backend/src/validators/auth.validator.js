import { ApiError } from '../utils/apiError.js';

export const validateAdminLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ApiError(400, 'Email and password are required.'));
  }
  next();
};

export const validatePartnerOTPRequest = (req, res, next) => {
  const { mobileNumber, identifier } = req.body;
  const input = (identifier || mobileNumber || '').toString().trim();

  if (!input) {
    return next(new ApiError(400, 'Please enter your Mobile Number, Email, or Franchise ID.'));
  }

  req.body.identifier = input;
  next();
};

export const validatePartnerOTPVerify = (req, res, next) => {
  const { mobileNumber, identifier, otp } = req.body;
  const input = (identifier || mobileNumber || '').toString().trim();
  const cleanOTP = (otp || '').toString().trim();

  if (!input || !cleanOTP) {
    return next(new ApiError(400, 'Identifier and OTP are required.'));
  }

  if (!/^\d{6}$/.test(cleanOTP)) {
    return next(new ApiError(400, 'OTP must be exactly 6 digits.'));
  }

  req.body.identifier = input;
  req.body.otp = cleanOTP;
  next();
};
