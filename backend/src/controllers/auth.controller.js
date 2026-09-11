import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { generateToken } from '../services/auth.service.js';
import { createAndSendOTP, verifyOTP } from '../services/otp.service.js';
import { USER_ROLES, ACCOUNT_STATUS } from '../config/constants.js';

// Helper to resolve Franchise Partner by Mobile, Email, or Franchise ID
const resolvePartnerByIdentifier = async (identifier) => {
  const clean = identifier.trim();
  let partner = null;
  let user = null;

  // 1. Check if identifier is Franchise ID (e.g. VS-...)
  if (clean.toUpperCase().startsWith('VS-')) {
    partner = await FranchisePartner.findOne({ franchiseId: clean.toUpperCase() });
    if (partner) {
      user = await User.findById(partner.userId);
    }
  }

  // 2. Check if identifier is Email Address
  if (!partner && clean.includes('@')) {
    user = await User.findOne({ email: clean.toLowerCase(), role: USER_ROLES.FRANCHISE_PARTNER });
    if (user) {
      partner = await FranchisePartner.findOne({ userId: user._id });
    }
  }

  // 3. Check if identifier is 10-digit Mobile Number
  if (!partner && /^\d{10}$/.test(clean)) {
    user = await User.findOne({ mobileNumber: clean, role: USER_ROLES.FRANCHISE_PARTNER });
    if (user) {
      partner = await FranchisePartner.findOne({ userId: user._id });
    }
  }

  // 4. Fallback search on partner collection directly
  if (!partner) {
    partner = await FranchisePartner.findOne({
      $or: [
        { franchiseId: clean.toUpperCase() },
        { email: clean.toLowerCase() },
        { mobileNumber: clean },
      ],
    });
    if (partner) {
      user = await User.findById(partner.userId);
    }
  }

  return { partner, user };
};

// Super Admin Password Login
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new ApiError(401, 'Invalid admin email or password.');
    }

    if (user.role !== USER_ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Access denied. You do not have Super Admin privileges.');
    }

    if (user.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(403, 'Your admin account has been suspended or deactivated.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid admin email or password.');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken({
      userId: user._id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          token,
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNumber: user.mobileNumber,
            role: user.role,
            status: user.status,
          },
        },
        'Admin logged in successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

// Franchise Partner Request OTP (Supports Mobile, Email, or Franchise ID)
export const partnerRequestOTP = async (req, res, next) => {
  try {
    const { identifier } = req.body;

    const { partner, user } = await resolvePartnerByIdentifier(identifier);

    if (!partner || !user || partner.accountStatus !== ACCOUNT_STATUS.ACTIVE || user.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(
        403,
        'This Mobile Number, Email, or Franchise ID is not registered or authorized as an active Vidhyut Saathi Partner.'
      );
    }

    const targetMobile = partner.mobileNumber;
    const otpResult = await createAndSendOTP(targetMobile);

    // Mask phone number for security in response (e.g. +91 98****3456)
    const maskedMobile = `+91 ${targetMobile.substring(0, 2)}******${targetMobile.substring(8)}`;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          mobileNumber: targetMobile,
          maskedMobile,
          franchiseId: partner.franchiseId,
          partnerName: partner.fullName,
          expiresInMinutes: otpResult.expiresInMinutes,
          cooldownSeconds: otpResult.cooldownSeconds,
          devCode: otpResult.devCode, // populated only in development
        },
        `OTP has been sent to registered mobile number ${maskedMobile}`
      )
    );
  } catch (err) {
    next(err);
  }
};

// Franchise Partner Verify OTP & Login
export const partnerVerifyOTP = async (req, res, next) => {
  try {
    const { identifier, otp } = req.body;

    const { partner, user } = await resolvePartnerByIdentifier(identifier);

    if (!partner || !user || partner.accountStatus !== ACCOUNT_STATUS.ACTIVE || user.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(
        403,
        'This Mobile Number, Email, or Franchise ID is not registered or authorized as an active Vidhyut Saathi Partner.'
      );
    }

    // Verify OTP against registered mobile
    await verifyOTP(partner.mobileNumber, otp);

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken({
      userId: user._id,
      partnerId: partner._id,
      franchiseId: partner.franchiseId,
      role: user.role,
      mobileNumber: user.mobileNumber,
      fullName: user.fullName,
      state: partner.state,
      district: partner.district,
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          token,
          partner: {
            id: partner._id,
            userId: user._id,
            franchiseId: partner.franchiseId,
            franchiseType: partner.franchiseType,
            fullName: partner.fullName,
            mobileNumber: partner.mobileNumber,
            email: partner.email,
            state: partner.state,
            district: partner.district,
            city: partner.city,
            addressLine1: partner.addressLine1,
            pinCode: partner.pinCode,
            accountStatus: partner.accountStatus,
            isGovIdVerified: partner.isGovIdVerified,
            govIdType: partner.govIdType,
            joiningDate: partner.joiningDate,
          },
        },
        'Authentication successful. Welcome to Vidhyut Saathi Partner Network.'
      )
    );
  } catch (err) {
    next(err);
  }
};

// Resend OTP
export const partnerResendOTP = async (req, res, next) => {
  try {
    const { identifier } = req.body;
    const { partner, user } = await resolvePartnerByIdentifier(identifier);

    if (!partner || !user || partner.accountStatus !== ACCOUNT_STATUS.ACTIVE || user.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(
        403,
        'This Mobile Number, Email, or Franchise ID is not registered or authorized as an active Vidhyut Saathi Partner.'
      );
    }

    const otpResult = await createAndSendOTP(partner.mobileNumber);
    const maskedMobile = `+91 ${partner.mobileNumber.substring(0, 2)}******${partner.mobileNumber.substring(8)}`;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          mobileNumber: partner.mobileNumber,
          maskedMobile,
          expiresInMinutes: otpResult.expiresInMinutes,
          cooldownSeconds: otpResult.cooldownSeconds,
          devCode: otpResult.devCode,
        },
        `A new OTP has been dispatched to ${maskedMobile}`
      )
    );
  } catch (err) {
    next(err);
  }
};

// Get Current Logged-in User Profile
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = req.user;
    let partnerProfile = null;

    if (user.role === USER_ROLES.FRANCHISE_PARTNER) {
      partnerProfile = await FranchisePartner.findOne({ userId: user._id });
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNumber: user.mobileNumber,
            role: user.role,
            status: user.status,
            lastLoginAt: user.lastLoginAt,
          },
          partner: partnerProfile,
        },
        'Profile retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

// Logout
export const logout = async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, null, 'Logged out successfully')
  );
};
