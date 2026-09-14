import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import OTP from '../models/OTP.model.js';
import { ApiError } from '../utils/apiError.js';
import { OTP_PURPOSE, AUDIT_ACTIONS, ENTITY_TYPES, USER_ROLES } from '../config/constants.js';
import { logAuditEvent } from './audit.service.js';
import { sendPartnerRegistrationOTPEmail } from './email.service.js';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || process.env.OTP_EXPIRY_SECONDS ? Math.ceil(parseInt(process.env.OTP_EXPIRY_SECONDS, 10) / 60) : '5', 10) || 5;
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

/**
 * Generate cryptographically secure 6-digit random numeric OTP
 */
export const generateNumericOTP = (digits = 6) => {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return crypto.randomInt(min, max + 1).toString();
};

/**
 * Universal SMS Gateway Dispatcher (MSG91 / Fast2SMS / 2Factor)
 */
export const sendSMSViaGateway = async (phone, otp) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const mobileWithCountryCode = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  try {
    // 1. MSG91 (India) - Official API v5
    if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
      const payload = {
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: mobileWithCountryCode,
        otp,
      };

      if (process.env.MSG91_SENDER_ID) {
        payload.sender = process.env.MSG91_SENDER_ID;
      }

      const response = await fetch('https://api.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log(`[SMS Gateway: MSG91] Response for ${phone}:`, data);
      const isSuccess = data?.type === 'success' || response.ok;
      return { success: isSuccess, provider: 'MSG91', data };
    }

    // 2. Fast2SMS (India)
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
          numbers: cleanPhone,
        }),
      });
      const data = await response.json();
      console.log(`[SMS Gateway: Fast2SMS] Response for ${phone}:`, data);
      return { success: data?.return === true, provider: 'FAST2SMS', data };
    }

    // 3. 2Factor (India)
    if (process.env.TWOFACTOR_API_KEY) {
      const url = `https://2factor.in/v1/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${cleanPhone}/${otp}`;
      const response = await fetch(url);
      const data = await response.json();
      console.log(`[SMS Gateway: 2Factor] Response for ${phone}:`, data);
      return { success: data?.Status === 'Success', provider: '2FACTOR', data };
    }

    // Development / Simulator mode
    if (process.env.ENABLE_DEV_OTP_LOG === 'true' || process.env.NODE_ENV !== 'production') {
      console.log(`[DEV SMS SIMULATOR] Dispatched SMS to ${cleanPhone} with OTP: ${otp}`);
    }

    return { success: true, provider: 'DEV_SIMULATOR' };
  } catch (smsErr) {
    console.error(`[SMS Dispatch Error] Failed to send SMS to ${phone}:`, smsErr.message);
    return { success: false, error: smsErr.message };
  }
};

/**
 * 1. Partner Login / Customer Confirmation OTP Dispatch
 */
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
    channel: 'SMS',
    expiresAt,
    attempts: 0,
    isUsed: false,
  });

  // Dispatch real SMS asynchronously
  await sendSMSViaGateway(mobileNumber, rawOTP);

  // Development Logger
  if (process.env.ENABLE_DEV_OTP_LOG === 'true' || process.env.NODE_ENV !== 'production') {
    console.log(`\n========================================`);
    console.log(`[DEV OTP SERVICE] Mobile: ${mobileNumber}`);
    console.log(`[DEV OTP SERVICE] OTP Code: ${rawOTP}`);
    console.log(`[DEV OTP SERVICE] Expires In: ${OTP_EXPIRY_MINUTES} Minutes`);
    console.log(`========================================\n`);
  }

  const hasLiveSmsGateway = Boolean(
    process.env.FAST2SMS_API_KEY ||
    process.env.TWOFACTOR_API_KEY ||
    (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID)
  );

  return {
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    devCode: (!hasLiveSmsGateway || process.env.ENABLE_DEV_OTP_LOG === 'true' || process.env.NODE_ENV !== 'production') ? rawOTP : undefined,
  };
};

/**
 * 2. Dedicated Registration OTP Dispatch AFTER Successful Partner Creation
 * Generates ONE single secure OTP and sends to newly created partner's registered Mobile & Email.
 */
export const createAndSendPartnerRegistrationOTP = async ({ partner, creatorUser, reqMetadata = {} }) => {
  if (!partner) return { success: false, reason: 'NO_PARTNER_DATA' };

  const mobileNumber = (partner.mobileNumber || '').trim();
  const email = (partner.email || '').trim().toLowerCase();

  // If neither mobile nor email is provided, return gracefully
  if (!mobileNumber && !email) {
    return { success: false, reason: 'NO_CONTACT_CHANNELS' };
  }

  try {
    // Determine delivery channels
    let channel = 'BOTH';
    if (mobileNumber && !email) channel = 'SMS';
    else if (!mobileNumber && email) channel = 'EMAIL';

    // Invalidate any previous unused registration OTPs for this partner
    await OTP.updateMany(
      {
        $or: [
          ...(partner._id ? [{ partnerId: partner._id }] : []),
          ...(mobileNumber ? [{ mobileNumber }] : []),
          ...(email ? [{ email }] : []),
        ],
        purpose: OTP_PURPOSE.PARTNER_REGISTRATION,
        isUsed: false,
      },
      { isUsed: true }
    );

    // Generate ONE single 6-digit OTP for both channels
    const rawOTP = generateNumericOTP(6);
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOTP, salt);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save secure OTP record
    await OTP.create({
      partnerId: partner._id,
      mobileNumber: mobileNumber || '',
      email: email || '',
      otpHash,
      purpose: OTP_PURPOSE.PARTNER_REGISTRATION,
      channel,
      expiresAt,
      attempts: 0,
      isUsed: false,
    });

    const actorUserId = creatorUser?._id || creatorUser?.id || partner.userId;
    const actorRole = creatorUser?.role || USER_ROLES.SUPER_ADMIN;
    const actorPartnerId = creatorUser?.partner?._id || null;

    // Audit log: Registration OTP Generated (NEVER log the raw OTP or credentials)
    await logAuditEvent({
      actorUserId,
      actorRole,
      actorPartnerId,
      action: AUDIT_ACTIONS.REGISTRATION_OTP_GENERATED,
      entityType: ENTITY_TYPES.PARTNER,
      entityId: partner.franchiseId || partner._id?.toString() || 'PARTNER',
      description: `Generated secure registration OTP for partner: ${partner.fullName} (${partner.franchiseId || 'New Partner'}) via ${channel}`,
      ipAddress: reqMetadata.ipAddress || '127.0.0.1',
      userAgent: reqMetadata.userAgent || '',
      metadata: {
        partnerId: partner._id,
        franchiseId: partner.franchiseId,
        franchiseType: partner.franchiseType,
        channel,
        hasMobile: Boolean(mobileNumber),
        hasEmail: Boolean(email),
      },
    });

    let smsResult = { success: false };
    let emailResult = { success: false };

    // 1. Dispatch SMS OTP if mobile is available
    if (mobileNumber) {
      smsResult = await sendSMSViaGateway(mobileNumber, rawOTP);

      if (smsResult.success) {
        await logAuditEvent({
          actorUserId,
          actorRole,
          actorPartnerId,
          action: AUDIT_ACTIONS.REGISTRATION_SMS_SENT,
          entityType: ENTITY_TYPES.PARTNER,
          entityId: partner.franchiseId || partner._id?.toString() || 'PARTNER',
          description: `Registration SMS OTP sent successfully to partner mobile: ${mobileNumber.slice(-4).padStart(mobileNumber.length, '*')}`,
          ipAddress: reqMetadata.ipAddress || '127.0.0.1',
          userAgent: reqMetadata.userAgent || '',
          metadata: { provider: smsResult.provider },
        });
      } else {
        await logAuditEvent({
          actorUserId,
          actorRole,
          actorPartnerId,
          action: AUDIT_ACTIONS.REGISTRATION_SMS_FAILED,
          entityType: ENTITY_TYPES.PARTNER,
          entityId: partner.franchiseId || partner._id?.toString() || 'PARTNER',
          description: `Failed to deliver registration SMS OTP to ${mobileNumber}: ${smsResult.error || 'Gateway error'}`,
          ipAddress: reqMetadata.ipAddress || '127.0.0.1',
          userAgent: reqMetadata.userAgent || '',
          metadata: { error: smsResult.error },
        });
      }
    }

    // 2. Dispatch Email OTP if email is available
    if (email) {
      emailResult = await sendPartnerRegistrationOTPEmail({
        toEmail: email,
        partnerName: partner.fullName,
        otp: rawOTP,
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      });

      if (emailResult.success) {
        await logAuditEvent({
          actorUserId,
          actorRole,
          actorPartnerId,
          action: AUDIT_ACTIONS.REGISTRATION_EMAIL_SENT,
          entityType: ENTITY_TYPES.PARTNER,
          entityId: partner.franchiseId || partner._id?.toString() || 'PARTNER',
          description: `Registration Email OTP sent successfully to partner email: ${email}`,
          ipAddress: reqMetadata.ipAddress || '127.0.0.1',
          userAgent: reqMetadata.userAgent || '',
          metadata: { provider: emailResult.provider },
        });
      } else {
        await logAuditEvent({
          actorUserId,
          actorRole,
          actorPartnerId,
          action: AUDIT_ACTIONS.REGISTRATION_EMAIL_FAILED,
          entityType: ENTITY_TYPES.PARTNER,
          entityId: partner.franchiseId || partner._id?.toString() || 'PARTNER',
          description: `Failed to deliver registration Email OTP to ${email}: ${emailResult.error || 'Email error'}`,
          ipAddress: reqMetadata.ipAddress || '127.0.0.1',
          userAgent: reqMetadata.userAgent || '',
          metadata: { error: emailResult.error },
        });
      }
    }

    // Development Console Output
    if (process.env.ENABLE_DEV_OTP_LOG === 'true' || process.env.NODE_ENV !== 'production') {
      console.log(`\n========================================`);
      console.log(`[DEV REGISTRATION OTP] Partner: ${partner.fullName} (${partner.franchiseId})`);
      console.log(`[DEV REGISTRATION OTP] Mobile: ${mobileNumber || 'N/A'}`);
      console.log(`[DEV REGISTRATION OTP] Email: ${email || 'N/A'}`);
      console.log(`[DEV REGISTRATION OTP] OTP Code: ${rawOTP}`);
      console.log(`[DEV REGISTRATION OTP] Valid For: ${OTP_EXPIRY_MINUTES} Minutes`);
      console.log(`========================================\n`);
    }

    return {
      success: true,
      otpTriggered: true,
      channel,
      smsSent: smsResult.success,
      emailSent: emailResult.success,
      devCode: (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_OTP_LOG === 'true') ? rawOTP : undefined,
    };
  } catch (err) {
    console.error('[Registration OTP Dispatch Error]:', err.message);
    // Never throw or block partner creation if notification sending encounters an issue
    return { success: false, error: err.message };
  }
};

/**
 * 3. Verify OTP
 */
export const verifyOTP = async (identifier, enteredOTP, purpose = OTP_PURPOSE.PARTNER_LOGIN) => {
  const cleanIdentifier = (identifier || '').trim();

  const otpRecord = await OTP.findOne({
    $or: [
      { mobileNumber: cleanIdentifier },
      { email: cleanIdentifier.toLowerCase() },
    ],
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
