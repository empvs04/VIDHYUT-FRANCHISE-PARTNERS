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

  // SMS Gateway Dispatch Function
  const sendRealSMS = async (phone, otp) => {
    try {
      // 1. Fast2SMS (India)
      if (process.env.FAST2SMS_API_KEY) {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otp,
            numbers: phone,
          }),
        });
        const data = await response.json();
        console.log(`[SMS Gateway: Fast2SMS] Response for ${phone}:`, data);
        return;
      }

      // 2. 2Factor (India)
      if (process.env.TWOFACTOR_API_KEY) {
        const url = `https://2factor.in/v1/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${phone}/${otp}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log(`[SMS Gateway: 2Factor] Response for ${phone}:`, data);
        return;
      }

      // 3. MSG91 (India)
      if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
        const response = await fetch('https://api.msg91.com/api/v5/otp', {
          method: 'POST',
          headers: {
            authkey: process.env.MSG91_AUTH_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template_id: process.env.MSG91_TEMPLATE_ID,
            mobile: `91${phone}`,
            otp,
          }),
        });
        const data = await response.json();
        console.log(`[SMS Gateway: MSG91] Response for ${phone}:`, data);
        return;
      }
    } catch (smsErr) {
      console.error(`[SMS Dispatch Error] Failed to send SMS to ${phone}:`, smsErr.message);
    }
  };

  // Dispatch real SMS asynchronously if configured
  await sendRealSMS(mobileNumber, rawOTP);

  // SMS Dispatch Logic / Development Logger
  if (process.env.ENABLE_DEV_OTP_LOG === 'true' || process.env.NODE_ENV !== 'production') {
    console.log(`\n========================================`);
    console.log(`[DEV OTP SERVICE] Mobile: ${mobileNumber}`);
    console.log(`[DEV OTP SERVICE] OTP Code: ${rawOTP}`);
    console.log(`[DEV OTP SERVICE] Expires In: ${OTP_EXPIRY_MINUTES} Minutes`);
    console.log(`========================================\n`);
  }

  // Determine if a live SMS gateway is configured
  const hasLiveSmsGateway = Boolean(
    process.env.FAST2SMS_API_KEY ||
    process.env.TWOFACTOR_API_KEY ||
    (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID)
  );

  return {
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    // Return devCode whenever live SMS gateway is absent or dev log is enabled
    devCode: (!hasLiveSmsGateway || process.env.ENABLE_DEV_OTP_LOG === 'true' || process.env.NODE_ENV !== 'production') ? rawOTP : undefined,
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
