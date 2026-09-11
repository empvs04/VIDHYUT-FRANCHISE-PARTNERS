import { ApiError } from '../utils/apiError.js';

export const validateAdminLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ApiError(400, 'Email and password are required.'));
  }
  next();
};

export const validatePartnerOTPRequest = (req, res, next) => {
  const { mobileNumber } = req.body;
  if (!mobileNumber) {
    return next(new ApiError(400, 'Mobile number is required.'));
  }
  const cleanNumber = mobileNumber.toString().trim();
  if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
    return next(new ApiError(400, 'Please provide a valid 10-digit Indian mobile number.'));
  }
  req.body.mobileNumber = cleanNumber;
  next();
};

export const validatePartnerOTPVerify = (req, res, next) => {
  const { mobileNumber, otp } = req.body;
  if (!mobileNumber || !otp) {
    return next(new ApiError(400, 'Mobile number and OTP are required.'));
  }
  const cleanNumber = mobileNumber.toString().trim();
  const cleanOTP = otp.toString().trim();

  if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
    return next(new ApiError(400, 'Invalid mobile number format.'));
  }
  if (!/^\d{6}$/.test(cleanOTP)) {
    return next(new ApiError(400, 'OTP must be exactly 6 digits.'));
  }

  req.body.mobileNumber = cleanNumber;
  req.body.otp = cleanOTP;
  next();
};
