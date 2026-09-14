import FranchisePartner from '../models/FranchisePartner.model.js';
import User from '../models/User.model.js';
import Customer from '../models/Customer.model.js';
import Installation from '../models/Installation.model.js';
import Card from '../models/Card.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ACCOUNT_STATUS, FRANCHISE_TYPES, USER_ROLES, CARD_STATUS } from '../config/constants.js';

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
      activeSubFranchises,
      subFranchiseCustomersCount,
      subFranchiseInstallationsCount,
      recentPartners,
      districtAllocations,
      totalCustomers,
      totalInstallations,
      installedCardsCount,
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
      FranchisePartner.countDocuments({
        franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      }),
      Customer.countDocuments({ createdByPartnerType: 'SUB_FRANCHISE' }),
      Installation.countDocuments({ createdByPartnerType: 'SUB_FRANCHISE' }),
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
      Customer.countDocuments(),
      Installation.countDocuments(),
      Card.countDocuments({ status: CARD_STATUS.INSTALLED }),
    ]);

    // Sub-Franchise installed cards sum
    const subCardsInstalledAgg = await Installation.aggregate([
      { $match: { createdByPartnerType: 'SUB_FRANCHISE' } },
      { $group: { _id: null, totalCards: { $sum: '$installedCardCount' } } },
    ]);
    const subFranchiseCardsInstalledCount = subCardsInstalledAgg[0]?.totalCards || 0;

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
            activeSubFranchises,
            subFranchiseCustomersCount,
            subFranchiseInstallationsCount,
            subFranchiseCardsInstalledCount,
            activeDistrictsCovered: districtAllocations.length,
            totalCustomers,
            totalInstallations,
            installedCardsCount,
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

    const isSubFranchise = partner.franchiseType === 'SUB_FRANCHISE';

    // Real DB query for Sub-Franchise partners, customers, and installations
    const [
      totalSubFranchises,
      activeSubFranchises,
      inactiveSubFranchises,
      recentSubFranchises,
      partnerCustomersCount,
      partnerInstallationsCount,
      partnerInstalledCardsCount,
      currentCardInventoryCount,
      pendingVerificationsCount,
      subFranchisePartnersList,
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
      Customer.countDocuments({ createdByPartnerId: partner._id }),
      Installation.countDocuments({ partnerId: partner._id }),
      Card.countDocuments({ currentOwnerId: partner._id, status: CARD_STATUS.INSTALLED }),
      Card.countDocuments({ currentOwnerId: partner._id, status: { $in: [CARD_STATUS.ASSIGNED, CARD_STATUS.AVAILABLE] } }),
      Installation.countDocuments({
        partnerId: partner._id,
        $or: [
          { customerConfirmationStatus: { $ne: CONFIRMATION_STATUS.CONFIRMED } },
          { verificationStatus: { $in: ['PENDING', 'REJECTED'] } },
        ],
      }),
      // Fetch all sub-franchises for District/State partners to compute real performance table
      !isSubFranchise
        ? FranchisePartner.find({ parentPartnerId: partner._id })
            .select('franchiseId fullName mobileNumber state district city accountStatus joiningDate')
            .lean()
        : Promise.resolve([]),
    ]);

    // Build Sub-Franchise Performance Breakdown for Parent Franchise
    let subFranchisePerformance = [];
    if (!isSubFranchise && subFranchisePartnersList.length > 0) {
      const subPartnerIds = subFranchisePartnersList.map((s) => s._id);

      // Aggregations per sub-franchise
      const [customersAgg, installationsAgg, cardsAgg, inventoryAgg] = await Promise.all([
        Customer.aggregate([
          { $match: { createdByPartnerId: { $in: subPartnerIds } } },
          { $group: { _id: '$createdByPartnerId', count: { $sum: 1 } } },
        ]),
        Installation.aggregate([
          { $match: { partnerId: { $in: subPartnerIds } } },
          { $group: { _id: '$partnerId', count: { $sum: 1 }, totalCards: { $sum: '$installedCardCount' } } },
        ]),
        Card.aggregate([
          { $match: { currentOwnerId: { $in: subPartnerIds }, status: CARD_STATUS.INSTALLED } },
          { $group: { _id: '$currentOwnerId', count: { $sum: 1 } } },
        ]),
        Card.aggregate([
          { $match: { currentOwnerId: { $in: subPartnerIds }, status: { $in: [CARD_STATUS.ASSIGNED, CARD_STATUS.AVAILABLE] } } },
          { $group: { _id: '$currentOwnerId', count: { $sum: 1 } } },
        ]),
      ]);

      const custMap = new Map(customersAgg.map((c) => [String(c._id), c.count]));
      const instMap = new Map(installationsAgg.map((i) => [String(i._id), { count: i.count, totalCards: i.totalCards }]));
      const cardMap = new Map(cardsAgg.map((c) => [String(c._id), c.count]));
      const invMap = new Map(inventoryAgg.map((v) => [String(v._id), v.count]));

      subFranchisePerformance = subFranchisePartnersList.map((sub) => {
        const idStr = String(sub._id);
        const instData = instMap.get(idStr) || { count: 0, totalCards: 0 };
        return {
          _id: sub._id,
          franchiseId: sub.franchiseId,
          fullName: sub.fullName,
          mobileNumber: sub.mobileNumber,
          state: sub.state,
          district: sub.district,
          city: sub.city,
          accountStatus: sub.accountStatus,
          joiningDate: sub.joiningDate,
          customersAdded: custMap.get(idStr) || 0,
          installationsCount: instData.count || 0,
          cardsInstalled: cardMap.get(idStr) || instData.totalCards || 0,
          currentInventory: invMap.get(idStr) || 0,
        };
      });
    }

    // Query latest card allotment batch for this partner
    const latestAssignedCard = await Card.findOne({
      currentOwnerId: partner._id,
      assignedAt: { $exists: true, $ne: null },
    })
      .sort({ assignedAt: -1 })
      .select('assignedAt serialNumber assignedBy notes')
      .populate('assignedBy', 'name role email');

    let latestAllotment = null;
    if (latestAssignedCard && latestAssignedCard.assignedAt) {
      const assignedTime = new Date(latestAssignedCard.assignedAt).getTime();
      const windowStart = new Date(assignedTime - 20000); // 20s window
      const windowEnd = new Date(assignedTime + 20000);

      const batchCards = await Card.find({
        currentOwnerId: partner._id,
        assignedAt: { $gte: windowStart, $lte: windowEnd },
      })
        .select('serialNumber assignedAt notes')
        .sort({ serialNumber: 1 });

      if (batchCards.length > 0) {
        latestAllotment = {
          allotmentId: `ALLOT_${partner._id}_${assignedTime}_${batchCards.length}`,
          cardCount: batchCards.length,
          firstSerial: batchCards[0].serialNumber,
          lastSerial: batchCards[batchCards.length - 1].serialNumber,
          assignedAt: latestAssignedCard.assignedAt,
          assignedBy: latestAssignedCard.assignedBy?.name || 'Central HQ Administrator',
          notes: batchCards[0].notes || 'Consignment allocation from Central Headquarters',
        };
      }
    }

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
            performance: subFranchisePerformance,
          },
          customers: {
            totalCardsAllotted: partnerInstalledCardsCount + currentCardInventoryCount,
            totalCustomers: partnerCustomersCount,
            totalInstallations: partnerInstallationsCount,
            installedCardsCount: partnerInstalledCardsCount,
            currentCardInventory: currentCardInventoryCount,
            pendingVerifications: pendingVerificationsCount,
          },
          latestAllotment,
        },
        'Partner dashboard summary retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

