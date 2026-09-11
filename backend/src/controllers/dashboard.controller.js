import FranchisePartner from '../models/FranchisePartner.model.js';
import User from '../models/User.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ACCOUNT_STATUS, FRANCHISE_TYPES, USER_ROLES } from '../config/constants.js';

// Admin Dashboard Real-time Metrics (Aggregated from live MongoDB database)
export const getAdminMetrics = async (req, res, next) => {
  try {
    const [
      totalPartners,
      activePartners,
      inactivePartners,
      suspendedPartners,
      expiredPartners,
      pendingPartners,
      stateFranchises,
      districtFranchises,
      subFranchises,
      recentPartners,
      districtAllocations,
    ] = await Promise.all([
      FranchisePartner.countDocuments(),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.ACTIVE }),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.INACTIVE }),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.SUSPENDED }),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.EXPIRED }),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.PENDING_APPROVAL }),
      FranchisePartner.countDocuments({ franchiseType: FRANCHISE_TYPES.STATE_FRANCHISE }),
      FranchisePartner.countDocuments({ franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE }),
      FranchisePartner.countDocuments({ franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE }),
      FranchisePartner.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('parentPartnerId', 'fullName franchiseId')
        .select('franchiseId fullName mobileNumber email state district franchiseType accountStatus createdAt parentPartnerId'),
      // Aggregate distinct active districts
      FranchisePartner.aggregate([
        { $match: { accountStatus: ACCOUNT_STATUS.ACTIVE, franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE } },
        { $group: { _id: { state: '$state', district: '$district' }, count: { $sum: 1 } } },
      ]),
    ]);

    // Aggregate state-wise partner distribution
    const stateDistribution = await FranchisePartner.aggregate([
      {
        $group: {
          _id: '$state',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$accountStatus', ACCOUNT_STATUS.ACTIVE] }, 1, 0] } },
          districts: { $addToSet: '$district' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          overview: {
            totalPartners,
            activePartners,
            inactivePartners,
            suspendedPartners,
            expiredPartners,
            pendingPartners,
            stateFranchises,
            districtFranchises,
            subFranchises,
            activeDistrictsCovered: districtAllocations.length,
          },
          recentPartners,
          stateDistribution: stateDistribution.map((s) => ({
            state: s._id,
            totalPartners: s.total,
            activePartners: s.active,
            districtsCoveredCount: s.districts.length,
          })),
        },
        'Admin dashboard metrics retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

// Partner-Specific Dashboard Summary (Real DB statistics for logged-in Partner)
export const getPartnerSummary = async (req, res, next) => {
  try {
    const partner = await FranchisePartner.findOne({ userId: req.user._id })
      .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email state district');

    if (!partner) {
      return res.status(200).json(
        new ApiResponse(200, null, 'No partner profile associated with this account.')
      );
    }

    // Real DB query for Sub-Franchise partners under this partner
    const [
      totalSubFranchises,
      activeSubFranchises,
      inactiveSubFranchises,
      recentSubFranchises,
    ] = await Promise.all([
      FranchisePartner.countDocuments({ parentPartnerId: partner._id }),
      FranchisePartner.countDocuments({
        parentPartnerId: partner._id,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      }),
      FranchisePartner.countDocuments({
        parentPartnerId: partner._id,
        accountStatus: { $ne: ACCOUNT_STATUS.ACTIVE },
      }),
      FranchisePartner.find({ parentPartnerId: partner._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('franchiseId fullName mobileNumber state district city accountStatus joiningDate'),
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          partner,
          parentPartner: partner.parentPartnerId,
          subFranchises: {
            total: totalSubFranchises,
            active: activeSubFranchises,
            inactive: inactiveSubFranchises,
            recent: recentSubFranchises,
          },
          futureModules: {
            cardInventory: { status: 'Coming in Next Phase' },
            cardDistribution: { status: 'Coming in Next Phase' },
            customerInstallations: { status: 'Coming in Next Phase' },
          },
        },
        'Partner dashboard summary retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};
