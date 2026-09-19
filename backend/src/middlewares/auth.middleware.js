import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { verifyToken } from '../services/auth.service.js';
import { ApiError } from '../utils/apiError.js';
import { ACCOUNT_STATUS, USER_ROLES } from '../config/constants.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      throw new ApiError(401, 'Authentication token required. Please login.');
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new ApiError(401, 'User account associated with this token no longer exists.');
    }

    // Status check with friendly messages
    if (user.status === ACCOUNT_STATUS.INACTIVE) {
      throw new ApiError(403, 'Your partner account is inactive. Please contact Vidhyut Saathi administration.');
    } else if (user.status === ACCOUNT_STATUS.SUSPENDED) {
      throw new ApiError(403, 'Your partner account has been suspended. Please contact Vidhyut Saathi administration.');
    } else if (user.status === ACCOUNT_STATUS.EXPIRED) {
      throw new ApiError(403, 'Your franchise agreement has expired. Please contact Vidhyut Saathi administration.');
    } else if (user.status === ACCOUNT_STATUS.PENDING_APPROVAL) {
      throw new ApiError(403, 'Your partner account is pending approval.');
    } else if (user.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(403, 'Your account is not active. Please contact administrator.');
    }

    req.user = user;

    // If user is a partner, attach partner profile
    if (user.role !== USER_ROLES.SUPER_ADMIN) {
      const partner = await FranchisePartner.findOne({ userId: user._id });
      if (partner) {
        if (partner.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
          throw new ApiError(
            403,
            `Partner account status is ${partner.accountStatus}. Normal operations are restricted.`
          );
        }
        req.partner = partner;
        // Background touch lastActiveAt if older than 1 minute
        const lastActive = partner.lastActiveAt ? new Date(partner.lastActiveAt).getTime() : 0;
        if (Date.now() - lastActive > 60000) {
          FranchisePartner.updateOne({ _id: partner._id }, { $set: { lastActiveAt: new Date() } }).catch(() => {});
        }
      }
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Invalid authentication token.'));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Authentication token expired. Please login again.'));
    } else {
      next(error);
    }
  }
};

// Role-Based Access Control (RBAC)
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'You do not have permission to perform this action.')
      );
    }
    next();
  };
};
