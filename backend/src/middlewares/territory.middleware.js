import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiError } from '../utils/apiError.js';
import { USER_ROLES, FRANCHISE_TYPES } from '../config/constants.js';

export const enforceTerritory = async (req, res, next) => {
  try {
    // Super Admins bypass territory restrictions
    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
      return next();
    }

    // For Franchise Partner operations
    const partner = await FranchisePartner.findOne({ userId: req.user._id });
    if (!partner) {
      throw new ApiError(404, 'Franchise Partner profile not found.');
    }

    req.partner = partner;

    // If request contains target state or district, check boundary access
    const targetState = req.body?.state || req.query?.state;
    const targetDistrict = req.body?.district || req.query?.district;

    if (targetState && targetState.toLowerCase() !== partner.state.toLowerCase()) {
      throw new ApiError(
        403,
        `Territory Violation: Your authorized state is ${partner.state}. You cannot operate in ${targetState}.`
      );
    }

    if (partner.franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE) {
      if (targetDistrict && targetDistrict.toLowerCase() !== partner.district.toLowerCase()) {
        throw new ApiError(
          403,
          `Territory Violation: Your authorized district is ${partner.district}. You cannot operate in ${targetDistrict}.`
        );
      }
    } else if (partner.franchiseType === FRANCHISE_TYPES.STATE_FRANCHISE) {
      if (
        targetDistrict &&
        partner.authorizedDistricts &&
        partner.authorizedDistricts.length > 0
      ) {
        const isDistrictAllowed = partner.authorizedDistricts.some(
          (d) => d.toLowerCase() === targetDistrict.toLowerCase()
        );
        if (!isDistrictAllowed) {
          throw new ApiError(
            403,
            `Territory Violation: District ${targetDistrict} is not in your authorized districts list.`
          );
        }
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};
