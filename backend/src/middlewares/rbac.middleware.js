import { ApiError } from '../utils/apiError.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access Denied: Role '${req.user?.role || 'Guest'}' is not authorized to access this resource.`
        )
      );
    }
    next();
  };
};
