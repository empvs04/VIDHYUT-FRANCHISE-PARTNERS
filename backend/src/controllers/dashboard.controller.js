import FranchisePartner from '../models/FranchisePartner.model.js';
import User from '../models/User.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ACCOUNT_STATUS, FRANCHISE_TYPES, USER_ROLES } from '../config/constants.js';

// Admin Dashboard Real-time Metrics
export const getAdminMetrics = async (req, res, next) => {
  try {
    const [
      totalPartners,
      activePartners,
      inactivePartners,
      stateFranchises,
      districtFranchises,
      totalUsers,
      recentPartners,
    ] = await Promise.all([
      FranchisePartner.countDocuments(),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.ACTIVE }),
      FranchisePartner.countDocuments({ accountStatus: { $ne: ACCOUNT_STATUS.ACTIVE } }),
      FranchisePartner.countDocuments({ franchiseType: FRANCHISE_TYPES.STATE_FRANCHISE }),
      FranchisePartner.countDocuments({ franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE }),
      User.countDocuments(),
      FranchisePartner.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('franchiseId fullName mobileNumber state district franchiseType accountStatus createdAt'),
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          overview: {
            totalPartners,
            activePartners,
            inactivePartners,
            stateFranchises,
            districtFranchises,
            totalUsers,
          },
          recentPartners,
        },
        'Admin dashboard metrics retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

// Partner-Specific Dashboard Summary
export const getPartnerSummary = async (req, res, next) => {
  try {
    const partner = await FranchisePartner.findOne({ userId: req.user._id });
    if (!partner) {
      return res.status(200).json(
        new ApiResponse(200, null, 'No partner profile associated with this account.')
      );
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          partner,
          futureModules: {
            cardInventory: { count: 0, status: 'Coming in Phase 2' },
            installations: { total: 0, status: 'Coming in Phase 4' },
            subFranchises: { total: 0, status: 'Coming in Phase 3' },
          },
        },
        'Partner dashboard summary retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};
