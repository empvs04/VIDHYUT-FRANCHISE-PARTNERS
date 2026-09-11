import User from '../models/User.model.js';
import { verifyToken } from '../services/auth.service.js';
import { ApiError } from '../utils/apiError.js';
import { ACCOUNT_STATUS } from '../config/constants.js';

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

    if (user.status !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(403, 'Your account is deactivated or suspended. Please contact administrator.');
    }

    req.user = user;
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
