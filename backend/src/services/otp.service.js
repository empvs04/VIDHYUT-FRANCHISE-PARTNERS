import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import OTP from '../models/OTP.model.js';
import { ApiError } from '../utils/apiError.js';
import { OTP_PURPOSE } from '../config/constants.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

export const generateNumericOTP = (digits = 6) => {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return crypto.randomInt(min, max + 1).toString();
};

export const createAndSendOTP = async (mobileNumber, purpose = OTP_PURPOSE.PARTNER_LOGIN) => {
  // Check for recent OTP to enforce resend cooldown
  const recentOTP = await OTP.findOne({
    mobileNumber,
    purpose,
    isUsed: false,
    createdAt: { $gte: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) },
  });

  if (recentOTP) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(recentOTP.createdAt).getTime()) / 1000);
    const waitTime = OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds;
    throw new ApiError(429, `Please wait ${waitTime} seconds before requesting a new OTP.`);
  }

  // Invalidate any previous unused OTPs for this number and purpose
  await OTP.updateMany({ mobileNumber, purpose, isUsed: false }, { isUsed: true });

  // Generate 6-digit OTP
  const rawOTP = generateNumericOTP(6);
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(rawOTP, salt);

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OTP.create({
    mobileNumber,
    otpHash,
    purpose,
    expiresAt,
    attempts: 0,
    isUsed: false,
  });

  // SMS Dispatch Logic / Development Logger
  if (process.env.ENABLE_DEV_OTP_LOG === 'true' || process.env.NODE_ENV !== 'production') {
    console.log(`\n========================================`);
    console.log(`[DEV OTP SERVICE] Mobile: ${mobileNumber}`);
    console.log(`[DEV OTP SERVICE] OTP Code: ${rawOTP}`);
    console.log(`[DEV OTP SERVICE] Expires In: ${OTP_EXPIRY_MINUTES} Minutes`);
    console.log(`========================================\n`);
  }

  return {
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    // Return OTP code in dev for easy inspection if configured
    devCode: (process.env.ENABLE_DEV_OTP_LOG === 'true' || process.env.NODE_ENV !== 'production') ? rawOTP : undefined,
  };
};

export const verifyOTP = async (mobileNumber, enteredOTP, purpose = OTP_PURPOSE.PARTNER_LOGIN) => {
  const otpRecord = await OTP.findOne({
    mobileNumber,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpRecord) {
    throw new ApiError(400, 'Invalid or expired OTP. Please request a new one.');
  }

  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    await OTP.findByIdAndUpdate(otpRecord._id, { isUsed: true });
    throw new ApiError(429, 'Maximum verification attempts exceeded. Please request a new OTP.');
  }

  const isMatch = await bcrypt.compare(enteredOTP, otpRecord.otpHash);

  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remainingAttempts = OTP_MAX_ATTEMPTS - otpRecord.attempts;
    throw new ApiError(400, `Incorrect OTP. ${remainingAttempts} attempts remaining.`);
  }

  // Mark OTP as used
  otpRecord.isUsed = true;
  await otpRecord.save();

  return true;
};
