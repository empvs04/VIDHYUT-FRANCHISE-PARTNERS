import { ApiError } from '../utils/apiError.js';
import { USER_ROLES } from '../config/constants.js';

/**
 * Middleware to enforce territory boundaries on creation/updating of partners.
 * Validates request payload against authenticated user's authorized territory.
 */
export const enforceTerritoryScope = (req, res, next) => {
  const user = req.user;
  const partner = req.partner;

  // Super Admin has full unrestricted access across India
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return next();
  }

  // Non-admins must have an active partner profile attached
  if (!partner) {
    return next(new ApiError(403, 'Partner profile not found for this user.'));
  }

  const requestedState = req.body.state || req.query.state;
  const requestedDistrict = req.body.district || req.query.district;

  // State Franchise validation
  if (user.role === USER_ROLES.STATE_FRANCHISE) {
    if (requestedState && requestedState.toLowerCase() !== partner.state.toLowerCase()) {
      return next(
        new ApiError(
          403,
          `Territory violation: You are only authorized to operate within ${partner.state}. Cannot access or create records in ${requestedState}.`
        )
      );
    }
  }

  // District Franchise validation
  if (user.role === USER_ROLES.DISTRICT_FRANCHISE) {
    if (requestedState && requestedState.toLowerCase() !== partner.state.toLowerCase()) {
      return next(
        new ApiError(
          403,
          `Territory violation: You are only authorized to operate within ${partner.state}.`
        )
      );
    }

    if (requestedDistrict && requestedDistrict.toLowerCase() !== partner.district.toLowerCase()) {
      return next(
        new ApiError(
          403,
          `Territory violation: You are only authorized to operate within ${partner.district} district. Cannot operate in ${requestedDistrict}.`
        )
      );
    }

    // District Franchise can ONLY create Sub-Franchise partners
    if (req.body.franchiseType && req.body.franchiseType !== 'SUB_FRANCHISE') {
      return next(
        new ApiError(
          403,
          'District Franchise Partners are only permitted to create Sub-Franchise partners within their district.'
        )
      );
    }
  }

  // Sub-Franchise partners are not allowed to create other partners
  if (user.role === USER_ROLES.SUB_FRANCHISE) {
    return next(
      new ApiError(403, 'Sub-Franchise partners do not have permission to register new partners.')
    );
  }

  next();
};
