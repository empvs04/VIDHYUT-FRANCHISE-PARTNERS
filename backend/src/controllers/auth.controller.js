import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { generateToken } from '../services/auth.service.js';
import { createAndSendOTP, verifyOTP } from '../services/otp.service.js';
import { USER_ROLES, ACCOUNT_STATUS } from '../config/constants.js';

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

// Franchise Partner Request OTP
export const partnerRequestOTP = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;

    // Verify that the mobile number belongs to an ACTIVE Franchise Partner
    const user = await User.findOne({ mobileNumber, role: USER_ROLES.FRANCHISE_PARTNER });
    if (!user || user.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(
        403,
        'This mobile number is not registered or authorized as an active Vidhyut Saathi Partner.'
      );
    }

    const partnerProfile = await FranchisePartner.findOne({ userId: user._id });
    if (!partnerProfile || partnerProfile.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(
        403,
        'This mobile number is not registered or authorized as an active Vidhyut Saathi Partner.'
      );
    }

    const otpResult = await createAndSendOTP(mobileNumber);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          mobileNumber,
          expiresInMinutes: otpResult.expiresInMinutes,
          cooldownSeconds: otpResult.cooldownSeconds,
          devCode: otpResult.devCode, // populated only in dev environment
        },
        'OTP has been sent to your registered mobile number.'
      )
    );
  } catch (err) {
    next(err);
  }
};

// Franchise Partner Verify OTP & Login
export const partnerVerifyOTP = async (req, res, next) => {
  try {
    const { mobileNumber, otp } = req.body;

    const user = await User.findOne({ mobileNumber, role: USER_ROLES.FRANCHISE_PARTNER });
    if (!user || user.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(
        403,
        'This mobile number is not registered or authorized as an active Vidhyut Saathi Partner.'
      );
    }

    const partner = await FranchisePartner.findOne({ userId: user._id });
    if (!partner || partner.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(
        403,
        'This mobile number is not registered or authorized as an active Vidhyut Saathi Partner.'
      );
    }

    // Verify OTP
    await verifyOTP(mobileNumber, otp);

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
    const { mobileNumber } = req.body;

    const user = await User.findOne({ mobileNumber, role: USER_ROLES.FRANCHISE_PARTNER });
    if (!user || user.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(
        403,
        'This mobile number is not registered or authorized as an active Vidhyut Saathi Partner.'
      );
    }

    const otpResult = await createAndSendOTP(mobileNumber);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          mobileNumber,
          expiresInMinutes: otpResult.expiresInMinutes,
          cooldownSeconds: otpResult.cooldownSeconds,
          devCode: otpResult.devCode,
        },
        'A new OTP has been dispatched to your registered mobile number.'
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

// Logout (Client token discard notification)
export const logout = async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, null, 'Logged out successfully')
  );
};
