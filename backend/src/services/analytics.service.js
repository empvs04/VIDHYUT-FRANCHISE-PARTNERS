import mongoose from 'mongoose';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import Transaction from '../models/Transaction.model.js';
import Installation from '../models/Installation.model.js';
import Customer from '../models/Customer.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import LocationVerification from '../models/LocationVerification.model.js';
import {
  CARD_STATUS,
  CARD_ACTIONS,
  TRANSACTION_STATUS,
  PAYMENT_STATUS,
  INSTALLATION_VERIFICATION_STATUS,
  LOCATION_VERIFICATION_STATUS,
  GPS_ACCURACY_STATUS,
  CUSTOMER_TYPES,
  ACCOUNT_STATUS,
  USER_ROLES,
  FRANCHISE_TYPES,
} from '../config/constants.js';

// Helper: Parse Date Range Filter into MongoDB Date Match Objects
export const parseDateRange = (dateRange, startDate, endDate) => {
  const now = new Date();
  let currentStart = null;
  let currentEnd = new Date(now.setHours(23, 59, 59, 999));
  let previousStart = null;
  let previousEnd = null;

  switch (dateRange) {
    case 'TODAY': {
      currentStart = new Date();
      currentStart.setHours(0, 0, 0, 0);

      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
      break;
    }
    case 'YESTERDAY': {
      currentStart = new Date();
      currentStart.setDate(currentStart.getDate() - 1);
      currentStart.setHours(0, 0, 0, 0);

      currentEnd = new Date(currentStart);
      currentEnd.setHours(23, 59, 59, 999);

      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
      break;
    }
    case 'LAST_7_DAYS': {
      currentStart = new Date();
      currentStart.setDate(currentStart.getDate() - 7);
      currentStart.setHours(0, 0, 0, 0);

      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 7);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
      break;
    }
    case 'LAST_30_DAYS': {
      currentStart = new Date();
      currentStart.setDate(currentStart.getDate() - 30);
      currentStart.setHours(0, 0, 0, 0);

      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 30);
      previousEnd = new Date(currentStart);
      previousEnd.setMilliseconds(-1);
      break;
    }
    case 'THIS_MONTH': {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousStart = prevMonth;
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'LAST_MONTH': {
      currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      previousStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'THIS_QUARTER': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);

      previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59, 999);
      break;
    }
    case 'THIS_YEAR': {
      currentStart = new Date(now.getFullYear(), 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    }
    case 'CUSTOM': {
      if (startDate) {
        currentStart = new Date(startDate);
        currentStart.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        currentEnd = new Date(endDate);
        currentEnd.setHours(23, 59, 59, 999);
      }
      if (currentStart && currentEnd) {
        const diffMs = currentEnd.getTime() - currentStart.getTime();
        previousStart = new Date(currentStart.getTime() - diffMs);
        previousEnd = new Date(currentStart.getTime() - 1);
      }
      break;
    }
    default: {
      currentStart = null;
      break;
    }
  }

  return {
    current: currentStart ? { $gte: currentStart, $lte: currentEnd } : null,
    previous: previousStart && previousEnd ? { $gte: previousStart, $lte: previousEnd } : null,
    currentStart,
    currentEnd,
  };
};

// Helper: Calculate Safe Percentage Change
export const calculatePercentageGrowth = (currentVal, previousVal) => {
  if (!previousVal || previousVal === 0) {
    return currentVal > 0 ? 100 : 0;
  }
  const growth = ((currentVal - previousVal) / previousVal) * 100;
  return Math.round(growth * 10) / 10;
};

// Helper: Build Partner Scope & Filtering Objects
export const getPartnerScopeData = async (user, partner) => {
  if (!user || user.role === USER_ROLES.SUPER_ADMIN || !partner) {
    // For Admin: Include only Franchise Partners (State & District Franchise), strictly excluding Sub-Franchise
    const franchisePartnerIds = await FranchisePartner.find({
      franchiseType: {
        $in: [
          FRANCHISE_TYPES.STATE_FRANCHISE,
          FRANCHISE_TYPES.DISTRICT_FRANCHISE,
          FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
          FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT,
          FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT,
        ],
      },
    }).distinct('_id');

    return {
      isSuperAdmin: true,
      partnerIds: null,
      partnerMatch: {},
      installationMatch: {},
      cardMatch: {},
      p2pSalesMatch: {
        buyerPartnerId: { $in: franchisePartnerIds },
      },
      p2pPurchaseMatch: {
        buyerPartnerId: { $in: franchisePartnerIds },
      },
      transactionMatch: {
        buyerPartnerId: { $in: franchisePartnerIds },
      },
      historyMatch: {},
      customerMatch: {},
      stateMatch: {},
      districtMatch: {},
    };
  }

  const partnerObjectId = new mongoose.Types.ObjectId(partner._id);

  // Strictly query direct sub-partners created under this partner
  const subPartners = await FranchisePartner.find({
    parentPartnerId: partner._id,
  }).distinct('_id');

  const downlinePartnerIds = Array.from(
    new Set([partner._id.toString(), ...subPartners.map((id) => id.toString())])
  ).map((id) => new mongoose.Types.ObjectId(id));

  return {
    isSuperAdmin: false,
    partnerIds: downlinePartnerIds,
    partnerMatch: { _id: { $in: downlinePartnerIds } },
    installationMatch: {
      $or: [
        { partnerId: { $in: downlinePartnerIds } },
        { parentPartnerId: partner._id },
      ],
    },
    cardMatch: { currentOwnerId: { $in: downlinePartnerIds } },
    p2pSalesMatch: { sellerPartnerId: { $in: downlinePartnerIds } },
    p2pPurchaseMatch: { buyerPartnerId: { $in: downlinePartnerIds } },
    transactionMatch: {
      $or: [
        { sellerPartnerId: { $in: downlinePartnerIds } },
        { buyerPartnerId: { $in: downlinePartnerIds } },
      ],
    },
    historyMatch: {
      $or: [
        { fromOwnerId: { $in: downlinePartnerIds } },
        { toOwnerId: { $in: downlinePartnerIds } },
      ],
    },
    customerMatch: { createdByPartnerId: { $in: downlinePartnerIds } },
    stateMatch: { state: new RegExp(`^${partner.state?.trim()}$`, 'i') },
    districtMatch: {
      state: new RegExp(`^${partner.state?.trim()}$`, 'i'),
      district: new RegExp(`^${partner.district?.trim()}$`, 'i'),
    },
  };
};

/**
 * 1. Global Overview Analytics & Period Comparison (RBAC Scoped)
 */
export const getOverviewAnalytics = async ({ dateRange, startDate, endDate, user, partner }) => {
  const { current, previous } = parseDateRange(dateRange, startDate, endDate);
  const scope = await getPartnerScopeData(user, partner);

  // Time-filtered queries with RBAC scope
  const installTimeMatch = { ...scope.installationMatch, ...(current ? { createdAt: current } : {}) };
  const prevInstallTimeMatch = {
    ...scope.installationMatch,
    ...(previous ? { createdAt: previous } : {}),
  };
  const customerTimeMatch = { ...scope.customerMatch, ...(current ? { createdAt: current } : {}) };
  const prevCustomerTimeMatch = {
    ...scope.customerMatch,
    ...(previous ? { createdAt: previous } : {}),
  };

  // P2P Sales (Outward) vs P2P Purchases (Inward)
  const p2pSalesTimeMatch = { ...scope.p2pSalesMatch, ...(current ? { createdAt: current } : {}) };
  const prevP2pSalesTimeMatch = {
    ...scope.p2pSalesMatch,
    ...(previous ? { createdAt: previous } : {}),
  };

  const p2pPurchaseTimeMatch = {
    ...scope.p2pPurchaseMatch,
    ...(current ? { createdAt: current } : {}),
  };

  // Build Location Verification Match
  let locMatch = {};
  if (!scope.isSuperAdmin) {
    const scopedInstLocIds = await Installation.find(scope.installationMatch).distinct(
      'locationVerificationId'
    );
    locMatch = { _id: { $in: scopedInstLocIds.filter(Boolean) } };
  }

  // Parallel Aggregation
  const [
    partnerStats,
    cardInventoryStats,
    customerCurrentCount,
    customerPrevCount,
    installCurrentStats,
    installPrevStats,
    p2pCurrentSalesStats,
    p2pPrevSalesStats,
    p2pPurchasesStats,
    territoryComplianceStats,
    monthlyTrends,
  ] = await Promise.all([
    // 1. Partner counts (scoped)
    FranchisePartner.aggregate([
      ...(Object.keys(scope.partnerMatch).length > 0 ? [{ $match: scope.partnerMatch }] : []),
      {
        $group: {
          _id: null,
          totalPartners: { $sum: 1 },
          activePartners: {
            $sum: { $cond: [{ $eq: ['$accountStatus', ACCOUNT_STATUS.ACTIVE] }, 1, 0] },
          },
          stateFranchises: {
            $sum: { $cond: [{ $eq: ['$franchiseType', 'STATE_FRANCHISE'] }, 1, 0] },
          },
          districtFranchises: {
            $sum: { $cond: [{ $eq: ['$franchiseType', 'DISTRICT_FRANCHISE'] }, 1, 0] },
          },
          subFranchises: {
            $sum: { $cond: [{ $eq: ['$franchiseType', 'SUB_FRANCHISE'] }, 1, 0] },
          },
        },
      },
    ]),

    // 2. Card Model Current Inventory Distribution
    Card.aggregate([
      ...(Object.keys(scope.cardMatch).length > 0 ? [{ $match: scope.cardMatch }] : []),
      {
        $group: {
          _id: null,
          totalCards: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', CARD_STATUS.AVAILABLE] }, 1, 0] },
          },
          assigned: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', CARD_STATUS.ASSIGNED] },
                    { $eq: ['$previousOwnerId', null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          transferred: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', CARD_STATUS.TRANSFERRED] },
                    { $ne: ['$previousOwnerId', null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          installed: {
            $sum: { $cond: [{ $eq: ['$status', CARD_STATUS.INSTALLED] }, 1, 0] },
          },
          blocked: {
            $sum: { $cond: [{ $eq: ['$status', CARD_STATUS.BLOCKED] }, 1, 0] },
          },
          pendingTransfer: {
            $sum: { $cond: [{ $eq: ['$status', CARD_STATUS.PENDING_TRANSFER] }, 1, 0] },
          },
          cardsWithPartners: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$currentOwnerId', null] },
                    { $in: ['$status', [CARD_STATUS.ASSIGNED, CARD_STATUS.TRANSFERRED]] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // 3. Customer Growth
    Customer.countDocuments(customerTimeMatch),
    previous ? Customer.countDocuments(prevCustomerTimeMatch) : 0,

    // 4. Installation & Customer Revenue Growth
    Installation.aggregate([
      { $match: installTimeMatch },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          installedCards: { $sum: '$installedCardCount' },
          totalRevenue: { $sum: '$totalAmount' },
          verifiedCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$verificationStatus',
                    [
                      INSTALLATION_VERIFICATION_STATUS.VERIFIED,
                      INSTALLATION_VERIFICATION_STATUS.CONFIRMED,
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          pendingReviews: {
            $sum: {
              $cond: [
                { $eq: ['$verificationStatus', INSTALLATION_VERIFICATION_STATUS.PENDING] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    previous
      ? Installation.aggregate([
          { $match: prevInstallTimeMatch },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              installedCards: { $sum: '$installedCardCount' },
              totalRevenue: { $sum: '$totalAmount' },
            },
          },
        ])
      : [],

    // 5. P2P Sales Growth (Outward sales to other partners)
    Transaction.aggregate([
      { $match: p2pSalesTimeMatch },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          confirmedSales: {
            $sum: {
              $cond: [{ $eq: ['$status', TRANSACTION_STATUS.CONFIRMED] }, '$totalAmount', 0],
            },
          },
          pendingSales: {
            $sum: {
              $cond: [
                { $eq: ['$status', TRANSACTION_STATUS.PENDING_CONFIRMATION] },
                '$totalAmount',
                0,
              ],
            },
          },
          disputedSales: {
            $sum: {
              $cond: [{ $eq: ['$status', TRANSACTION_STATUS.DISPUTED] }, '$totalAmount', 0],
            },
          },
          cancelledSales: {
            $sum: {
              $cond: [{ $eq: ['$status', TRANSACTION_STATUS.CANCELLED] }, '$totalAmount', 0],
            },
          },
          totalCardsSold: { $sum: '$quantity' },
        },
      },
    ]),
    previous
      ? Transaction.aggregate([
          { $match: prevP2pSalesTimeMatch },
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$totalAmount' },
              confirmedSales: {
                $sum: {
                  $cond: [{ $eq: ['$status', TRANSACTION_STATUS.CONFIRMED] }, '$totalAmount', 0],
                },
              },
            },
          },
        ])
      : [],

    // 5b. P2P Purchases (Inward stock received from Admin / Parent)
    Transaction.aggregate([
      { $match: p2pPurchaseTimeMatch },
      {
        $group: {
          _id: null,
          totalPurchased: { $sum: '$totalAmount' },
          totalCardsPurchased: { $sum: '$quantity' },
          confirmedPurchased: {
            $sum: {
              $cond: [{ $eq: ['$status', TRANSACTION_STATUS.CONFIRMED] }, '$totalAmount', 0],
            },
          },
        },
      },
    ]),

    // 6. Territory & Location Verification Compliance
    LocationVerification.aggregate([
      ...(Object.keys(locMatch).length > 0 ? [{ $match: locMatch }] : []),
      {
        $group: {
          _id: null,
          totalAudited: { $sum: 1 },
          territoryMatched: { $sum: { $cond: ['$territoryMatch', 1, 0] } },
          territoryMismatch: { $sum: { $cond: ['$territoryMatch', 0, 1] } },
          lowAccuracy: {
            $sum: {
              $cond: [{ $eq: ['$accuracyStatus', GPS_ACCURACY_STATUS.POOR] }, 1, 0],
            },
          },
          reviewRequired: {
            $sum: {
              $cond: [
                { $eq: ['$verificationStatus', LOCATION_VERIFICATION_STATUS.REVIEW_REQUIRED] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // 7. Time-series Monthly Aggregation (Last 6 Months for Charts)
    Installation.aggregate([
      {
        $match: {
          ...scope.installationMatch,
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 5, 1)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          installations: { $sum: 1 },
          cardsInstalled: { $sum: '$installedCardCount' },
          revenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  const pStats = partnerStats[0] || {
    totalPartners: 0,
    activePartners: 0,
    stateFranchises: 0,
    districtFranchises: 0,
    subFranchises: 0,
  };

  const cardStats = cardInventoryStats[0] || {
    totalCards: 0,
    available: 0,
    assigned: 0,
    transferred: 0,
    installed: 0,
    blocked: 0,
    pendingTransfer: 0,
    cardsWithPartners: 0,
  };

  const instCurrent = installCurrentStats[0] || {
    count: 0,
    installedCards: 0,
    totalRevenue: 0,
    verifiedCount: 0,
    pendingReviews: 0,
  };

  const instPrev = installPrevStats[0] || {
    count: 0,
    installedCards: 0,
    totalRevenue: 0,
  };

  const p2pCurrent = p2pCurrentSalesStats[0] || {
    totalSales: 0,
    confirmedSales: 0,
    pendingSales: 0,
    disputedSales: 0,
    cancelledSales: 0,
    totalCardsSold: 0,
  };

  const p2pPrev = p2pPrevSalesStats[0] || {
    totalSales: 0,
    confirmedSales: 0,
  };

  const p2pPurchases = p2pPurchasesStats[0] || {
    totalPurchased: 0,
    totalCardsPurchased: 0,
    confirmedPurchased: 0,
  };

  const locStats = territoryComplianceStats[0] || {
    totalAudited: 0,
    territoryMatched: 0,
    territoryMismatch: 0,
    lowAccuracy: 0,
    reviewRequired: 0,
  };

  return {
    metrics: {
      partners: {
        total: pStats.totalPartners,
        active: pStats.activePartners,
        stateFranchises: pStats.stateFranchises,
        districtFranchises: pStats.districtFranchises,
        subFranchises: pStats.subFranchises,
      },
      cards: {
        totalCards: cardStats.totalCards,
        available: cardStats.available,
        assigned: cardStats.assigned,
        transferred: cardStats.transferred,
        installed: cardStats.installed,
        blocked: cardStats.blocked,
        pendingTransfer: cardStats.pendingTransfer,
        cardsWithPartners: cardStats.cardsWithPartners || (cardStats.assigned + cardStats.transferred),
      },
      customers: {
        total: customerCurrentCount,
        growth: calculatePercentageGrowth(customerCurrentCount, customerPrevCount),
      },
      installations: {
        total: instCurrent.count,
        installedCards: instCurrent.installedCards,
        verified: instCurrent.verifiedCount,
        pendingReviews: instCurrent.pendingReviews,
        growth: calculatePercentageGrowth(instCurrent.count, instPrev.count),
      },
      revenue: {
        customerRevenue: instCurrent.totalRevenue,
        customerRevenueGrowth: calculatePercentageGrowth(
          instCurrent.totalRevenue,
          instPrev.totalRevenue
        ),
        p2pSalesTotal: p2pCurrent.totalSales,
        p2pConfirmedSales: p2pCurrent.confirmedSales,
        p2pPendingSales: p2pCurrent.pendingSales,
        p2pDisputedSales: p2pCurrent.disputedSales,
        p2pCancelledSales: p2pCurrent.cancelledSales,
        p2pStockPurchasedTotal: p2pPurchases.totalPurchased,
        p2pStockPurchasedCards: p2pPurchases.totalCardsPurchased,
        p2pSalesGrowth: calculatePercentageGrowth(
          p2pCurrent.confirmedSales,
          p2pPrev.confirmedSales
        ),
      },
      territoryAudit: {
        totalAudited: locStats.totalAudited,
        territoryMatched: locStats.territoryMatched,
        territoryMismatch: locStats.territoryMismatch,
        lowAccuracy: locStats.lowAccuracy,
        reviewRequired: locStats.reviewRequired,
      },
    },
    charts: {
      monthlyTrends: monthlyTrends.map((t) => {
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        return {
          name: `${monthNames[t._id.month - 1]} ${t._id.year}`,
          installations: t.installations,
          cardsInstalled: t.cardsInstalled,
          revenue: t.revenue,
        };
      }),
      inventoryDistribution: [
        { name: 'In Hand (Available)', value: cardStats.assigned + cardStats.available, color: '#0284c7' },
        { name: 'Transferred to Sub-Franchise', value: cardStats.transferred, color: '#0ea5e9' },
        { name: 'Installed at Customer', value: cardStats.installed, color: '#10b981' },
        { name: 'Blocked / Inactive', value: cardStats.blocked, color: '#ef4444' },
        { name: 'Pending Transfer', value: cardStats.pendingTransfer, color: '#f59e0b' },
      ],
    },
  };
};

/**
 * 2. Revenue & Sales Intelligence (RBAC Scoped)
 */
export const getRevenueAnalytics = async ({ dateRange, startDate, endDate, user, partner }) => {
  const { current } = parseDateRange(dateRange, startDate, endDate);
  const scope = await getPartnerScopeData(user, partner);
  const timeMatch = current ? { createdAt: current } : {};

  const [p2pStats, customerSalesStats, monthlyRevenueTrends] = await Promise.all([
    // P2P Transactions Revenue Grouping (Outward Sales)
    Transaction.aggregate([
      { $match: { ...timeMatch, ...scope.p2pSalesMatch } },
      {
        $group: {
          _id: '$paymentStatus',
          totalAmount: { $sum: '$totalAmount' },
          transactionCount: { $sum: 1 },
          cardCount: { $sum: '$quantity' },
        },
      },
    ]),

    // Customer Installation Sales Grouping
    Installation.aggregate([
      { $match: { ...timeMatch, ...scope.installationMatch } },
      {
        $group: {
          _id: '$customerConfirmationStatus',
          totalAmount: { $sum: '$totalAmount' },
          installationCount: { $sum: 1 },
          cardCount: { $sum: '$installedCardCount' },
        },
      },
    ]),

    // Monthly Combined Timeseries
    Installation.aggregate([
      {
        $match: {
          ...scope.installationMatch,
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 5, 1)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          customerRevenue: { $sum: '$totalAmount' },
          installedCards: { $sum: '$installedCardCount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  // Aggregate P2P Status breakdown
  let p2pTotal = 0;
  let p2pVerified = 0;
  let p2pPending = 0;
  let p2pRejected = 0;

  p2pStats.forEach((p) => {
    p2pTotal += p.totalAmount;
    if (p._id === PAYMENT_STATUS.VERIFIED) p2pVerified += p.totalAmount;
    if (p._id === PAYMENT_STATUS.PENDING || p._id === PAYMENT_STATUS.SUBMITTED)
      p2pPending += p.totalAmount;
    if (p._id === PAYMENT_STATUS.REJECTED) p2pRejected += p.totalAmount;
  });

  // Aggregate Customer Sales breakdown
  let customerTotal = 0;
  let customerConfirmed = 0;
  let customerPending = 0;

  customerSalesStats.forEach((c) => {
    customerTotal += c.totalAmount;
    if (c._id === 'CONFIRMED') customerConfirmed += c.totalAmount;
    else customerPending += c.totalAmount;
  });

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return {
    partnerToPartner: {
      totalSalesValue: p2pTotal,
      verifiedPayments: p2pVerified,
      pendingPayments: p2pPending,
      rejectedPayments: p2pRejected,
      breakdown: p2pStats,
    },
    customerInstallations: {
      totalCustomerSales: customerTotal,
      confirmedSales: customerConfirmed,
      pendingConfirmationSales: customerPending,
      breakdown: customerSalesStats,
    },
    trends: monthlyRevenueTrends.map((t) => ({
      month: `${monthNames[t._id.month - 1]} ${t._id.year}`,
      customerRevenue: t.customerRevenue,
      installedCards: t.installedCards,
    })),
  };
};

/**
 * 3. Card Inventory & Lifecycle Activity Analytics (RBAC Scoped)
 */
export const getCardLifecycleAnalytics = async ({ dateRange, startDate, endDate, user, partner }) => {
  const { current } = parseDateRange(dateRange, startDate, endDate);
  const scope = await getPartnerScopeData(user, partner);
  const timeMatch = current ? { timestamp: current } : {};

  const [currentInventory, lifecycleActivity] = await Promise.all([
    // Current Inventory Status
    Card.aggregate([
      ...(Object.keys(scope.cardMatch).length > 0 ? [{ $match: scope.cardMatch }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),

    // Historical Lifecycle Activity in date range
    CardHistory.aggregate([
      { $match: { ...timeMatch, ...scope.historyMatch } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const activityMap = {};
  lifecycleActivity.forEach((act) => {
    activityMap[act._id] = act.count;
  });

  const inventoryMap = {};
  currentInventory.forEach((inv) => {
    inventoryMap[inv._id] = inv.count;
  });

  return {
    currentStatus: {
      totalCards: Object.values(inventoryMap).reduce((a, b) => a + b, 0),
      available: inventoryMap[CARD_STATUS.AVAILABLE] || 0,
      assigned: inventoryMap[CARD_STATUS.ASSIGNED] || 0,
      transferred: inventoryMap[CARD_STATUS.TRANSFERRED] || 0,
      installed: inventoryMap[CARD_STATUS.INSTALLED] || 0,
      blocked: inventoryMap[CARD_STATUS.BLOCKED] || 0,
      pendingTransfer: inventoryMap[CARD_STATUS.PENDING_TRANSFER] || 0,
    },
    lifecycleInPeriod: {
      cardsAdded: activityMap[CARD_ACTIONS.CREATED] || 0,
      cardsAssigned: activityMap[CARD_ACTIONS.ASSIGNED] || 0,
      cardsTransferred:
        (activityMap[CARD_ACTIONS.TRANSFERRED] || 0) +
        (activityMap[CARD_ACTIONS.TRANSFER_CONFIRMED] || 0),
      cardsInstalled: activityMap[CARD_ACTIONS.INSTALLED] || 0,
      cardsBlocked: activityMap[CARD_ACTIONS.BLOCKED] || 0,
    },
  };
};

/**
 * 4. Partner Performance & Leaderboard Rankings (RBAC Scoped)
 */
export const getPartnerPerformanceAnalytics = async ({
  sortBy = 'installations',
  limit = 50,
  user,
  partner,
}) => {
  const scope = await getPartnerScopeData(user, partner);

  const pipeline = [
    ...(scope.isSuperAdmin ? [] : [{ $match: scope.partnerMatch }]),
    {
      $lookup: {
        from: 'installations',
        localField: '_id',
        foreignField: 'partnerId',
        as: 'installations',
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: 'createdByPartnerId',
        as: 'customers',
      },
    },
    {
      $lookup: {
        from: 'cards',
        localField: '_id',
        foreignField: 'currentOwnerId',
        as: 'currentCards',
      },
    },
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'sellerPartnerId',
        as: 'sellerTransactions',
      },
    },
    {
      $project: {
        franchiseId: 1,
        fullName: 1,
        franchiseType: 1,
        state: 1,
        district: 1,
        mobileNumber: 1,
        accountStatus: 1,
        currentInventoryCount: {
          $size: {
            $filter: {
              input: '$currentCards',
              as: 'c',
              cond: { $in: ['$$c.status', [CARD_STATUS.ASSIGNED, CARD_STATUS.TRANSFERRED]] },
            },
          },
        },
        installedCardsCount: {
          $sum: '$installations.installedCardCount',
        },
        installationsCount: { $size: '$installations' },
        customersCount: { $size: '$customers' },
        installationRevenue: { $sum: '$installations.totalAmount' },
        cardsDistributed: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$sellerTransactions',
                  as: 'tx',
                  cond: { $eq: ['$$tx.status', TRANSACTION_STATUS.CONFIRMED] },
                },
              },
              as: 'stx',
              in: '$$stx.quantity',
            },
          },
        },
        partnerSalesValue: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$sellerTransactions',
                  as: 'tx',
                  cond: { $eq: ['$$tx.status', TRANSACTION_STATUS.CONFIRMED] },
                },
              },
              as: 'stx',
              in: '$$stx.totalAmount',
            },
          },
        },
      },
    },
  ];

  const partnerPerformance = await FranchisePartner.aggregate(pipeline);

  // Sort according to request
  partnerPerformance.sort((a, b) => {
    if (sortBy === 'sales' || sortBy === 'salesValue')
      return b.partnerSalesValue - a.partnerSalesValue;
    if (sortBy === 'revenue') return b.installationRevenue - a.installationRevenue;
    if (sortBy === 'customers') return b.customersCount - a.customersCount;
    if (sortBy === 'cardsDistributed') return b.cardsDistributed - a.cardsDistributed;
    return b.installationsCount - a.installationsCount; // default installations
  });

  const rankedPartners = partnerPerformance.slice(0, parseInt(limit, 10)).map((p, idx) => ({
    rank: idx + 1,
    ...p,
  }));

  // Top Rankings by categories
  const topByInstallations = [...partnerPerformance]
    .sort((a, b) => b.installationsCount - a.installationsCount)
    .slice(0, 5);

  const topByRevenue = [...partnerPerformance]
    .sort((a, b) => b.installationRevenue - a.installationRevenue)
    .slice(0, 5);

  const topByCustomers = [...partnerPerformance]
    .sort((a, b) => b.customersCount - a.customersCount)
    .slice(0, 5);

  const topByDistributed = [...partnerPerformance]
    .sort((a, b) => b.cardsDistributed - a.cardsDistributed)
    .slice(0, 5);

  return {
    partners: rankedPartners,
    leaderboards: {
      topInstallations: topByInstallations,
      topRevenue: topByRevenue,
      topCustomers: topByCustomers,
      topDistributed: topByDistributed,
    },
  };
};

/**
 * 5. State & District Territorial Analytics (RBAC Scoped)
 */
export const getStateAnalytics = async ({ user, partner } = {}) => {
  const scope = await getPartnerScopeData(user, partner);
  const matchFilter = scope.isSuperAdmin ? {} : scope.stateMatch;

  const stateStats = await FranchisePartner.aggregate([
    ...(Object.keys(matchFilter).length > 0 ? [{ $match: matchFilter }] : []),
    {
      $group: {
        _id: '$state',
        totalPartners: { $sum: 1 },
        activePartners: {
          $sum: { $cond: [{ $eq: ['$accountStatus', ACCOUNT_STATUS.ACTIVE] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'installations',
        let: { stateName: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$installationAddress.state', '$$stateName'] },
              ...(scope.isSuperAdmin ? {} : scope.installationMatch),
            },
          },
          {
            $group: {
              _id: null,
              installationsCount: { $sum: 1 },
              installedCards: { $sum: '$installedCardCount' },
              totalRevenue: { $sum: '$totalAmount' },
            },
          },
        ],
        as: 'installationsData',
      },
    },
    {
      $lookup: {
        from: 'customers',
        let: { stateName: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$address.state', '$$stateName'] },
              ...(scope.isSuperAdmin ? {} : scope.customerMatch),
            },
          },
          { $count: 'count' },
        ],
        as: 'customerData',
      },
    },
    {
      $project: {
        state: '$_id',
        totalPartners: 1,
        activePartners: 1,
        installations: {
          $ifNull: [{ $arrayElemAt: ['$installationsData.installationsCount', 0] }, 0],
        },
        installedCards: {
          $ifNull: [{ $arrayElemAt: ['$installationsData.installedCards', 0] }, 0],
        },
        revenue: {
          $ifNull: [{ $arrayElemAt: ['$installationsData.totalRevenue', 0] }, 0],
        },
        customers: {
          $ifNull: [{ $arrayElemAt: ['$customerData.count', 0] }, 0],
        },
      },
    },
    { $sort: { installations: -1, totalPartners: -1 } },
  ]);

  return stateStats;
};

export const getDistrictAnalytics = async ({ state, user, partner } = {}) => {
  const scope = await getPartnerScopeData(user, partner);
  const matchDistrict = scope.isSuperAdmin ? {} : { ...scope.districtMatch };

  if (state) {
    matchDistrict.state = new RegExp(`^${state.trim()}$`, 'i');
  }

  const districtStats = await FranchisePartner.aggregate([
    ...(Object.keys(matchDistrict).length > 0 ? [{ $match: matchDistrict }] : []),
    {
      $group: {
        _id: { state: '$state', district: '$district' },
        totalPartners: { $sum: 1 },
        activePartners: {
          $sum: { $cond: [{ $eq: ['$accountStatus', ACCOUNT_STATUS.ACTIVE] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'installations',
        let: { stateName: '$_id.state', districtName: '$_id.district' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$installationAddress.state', '$$stateName'] },
                  { $eq: ['$installationAddress.district', '$$districtName'] },
                ],
              },
              ...(scope.isSuperAdmin ? {} : scope.installationMatch),
            },
          },
          {
            $group: {
              _id: null,
              installationsCount: { $sum: 1 },
              installedCards: { $sum: '$installedCardCount' },
              totalRevenue: { $sum: '$totalAmount' },
              verifiedCount: {
                $sum: {
                  $cond: [
                    {
                      $in: [
                        '$verificationStatus',
                        [
                          INSTALLATION_VERIFICATION_STATUS.VERIFIED,
                          INSTALLATION_VERIFICATION_STATUS.CONFIRMED,
                        ],
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              mismatchCount: {
                $sum: { $cond: ['$territoryMatch', 0, 1] },
              },
            },
          },
        ],
        as: 'installationsData',
      },
    },
    {
      $lookup: {
        from: 'customers',
        let: { stateName: '$_id.state', districtName: '$_id.district' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$address.state', '$$stateName'] },
                  { $eq: ['$address.district', '$$districtName'] },
                ],
              },
              ...(scope.isSuperAdmin ? {} : scope.customerMatch),
            },
          },
          { $count: 'count' },
        ],
        as: 'customerData',
      },
    },
    {
      $project: {
        state: '$_id.state',
        district: '$_id.district',
        totalPartners: 1,
        activePartners: 1,
        installations: {
          $ifNull: [{ $arrayElemAt: ['$installationsData.installationsCount', 0] }, 0],
        },
        installedCards: {
          $ifNull: [{ $arrayElemAt: ['$installationsData.installedCards', 0] }, 0],
        },
        verifiedInstallations: {
          $ifNull: [{ $arrayElemAt: ['$installationsData.verifiedCount', 0] }, 0],
        },
        mismatchInstallations: {
          $ifNull: [{ $arrayElemAt: ['$installationsData.mismatchCount', 0] }, 0],
        },
        revenue: {
          $ifNull: [{ $arrayElemAt: ['$installationsData.totalRevenue', 0] }, 0],
        },
        customers: {
          $ifNull: [{ $arrayElemAt: ['$customerData.count', 0] }, 0],
        },
      },
    },
    { $sort: { installations: -1 } },
  ]);

  return districtStats;
};

/**
 * 6. GPS Quality & Territory Compliance Analytics (RBAC Scoped)
 */
export const getGPSQualityAnalytics = async ({ dateRange, startDate, endDate, user, partner }) => {
  const { current } = parseDateRange(dateRange, startDate, endDate);
  const scope = await getPartnerScopeData(user, partner);
  let timeMatch = current ? { createdAt: current } : {};

  if (!scope.isSuperAdmin) {
    const scopedInstLocIds = await Installation.find(scope.installationMatch).distinct(
      'locationVerificationId'
    );
    timeMatch = { ...timeMatch, _id: { $in: scopedInstLocIds.filter(Boolean) } };
  }

  const [gpsStats, accuracyMetrics] = await Promise.all([
    LocationVerification.aggregate([
      { $match: timeMatch },
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 },
        },
      },
    ]),

    LocationVerification.aggregate([
      { $match: timeMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgAccuracy: { $avg: '$accuracyMeters' },
          minAccuracy: { $min: '$accuracyMeters' },
          maxAccuracy: { $max: '$accuracyMeters' },
          excellentAccuracy: {
            $sum: { $cond: [{ $lte: ['$accuracyMeters', 50] }, 1, 0] },
          },
          acceptableAccuracy: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$accuracyMeters', 50] },
                    { $lte: ['$accuracyMeters', 100] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          poorAccuracy: {
            $sum: { $cond: [{ $gt: ['$accuracyMeters', 100] }, 1, 0] },
          },
          territoryMatched: {
            $sum: { $cond: ['$territoryMatch', 1, 0] },
          },
          territoryMismatch: {
            $sum: { $cond: ['$territoryMatch', 0, 1] },
          },
        },
      },
    ]),
  ]);

  const acc = accuracyMetrics[0] || {
    total: 0,
    avgAccuracy: 0,
    minAccuracy: 0,
    maxAccuracy: 0,
    excellentAccuracy: 0,
    acceptableAccuracy: 0,
    poorAccuracy: 0,
    territoryMatched: 0,
    territoryMismatch: 0,
  };

  const statusMap = {};
  gpsStats.forEach((s) => {
    statusMap[s._id] = s.count;
  });

  return {
    totalAudited: acc.total,
    accuracySummary: {
      averageMeters: Math.round((acc.avgAccuracy || 0) * 10) / 10,
      minimumMeters: acc.minAccuracy || 0,
      maximumMeters: acc.maxAccuracy || 0,
      excellentCount: acc.excellentAccuracy,
      acceptableCount: acc.acceptableAccuracy,
      poorCount: acc.poorAccuracy,
    },
    territoryCompliance: {
      matched: acc.territoryMatched,
      mismatch: acc.territoryMismatch,
      matchRatePercent: acc.total > 0 ? Math.round((acc.territoryMatched / acc.total) * 100) : 100,
    },
    verificationStatuses: {
      verified: statusMap[LOCATION_VERIFICATION_STATUS.VERIFIED] || 0,
      territoryMismatch: statusMap[LOCATION_VERIFICATION_STATUS.TERRITORY_MISMATCH] || 0,
      lowAccuracy: statusMap[LOCATION_VERIFICATION_STATUS.LOW_ACCURACY] || 0,
      reviewRequired: statusMap[LOCATION_VERIFICATION_STATUS.REVIEW_REQUIRED] || 0,
      rejected: statusMap[LOCATION_VERIFICATION_STATUS.REJECTED] || 0,
      adminOverridden: statusMap[LOCATION_VERIFICATION_STATUS.ADMIN_OVERRIDDEN] || 0,
    },
  };
};

/**
 * 7. Customer & Connected Load Intelligence (RBAC Scoped)
 */
export const getCustomerElectricityAnalytics = async ({ user, partner } = {}) => {
  const scope = await getPartnerScopeData(user, partner);
  const custMatch = scope.isSuperAdmin ? {} : scope.customerMatch;
  const instMatch = scope.isSuperAdmin ? {} : scope.installationMatch;

  const [customerTypes, loadStats, billStats] = await Promise.all([
    // Customer Type Distribution
    Customer.aggregate([
      ...(Object.keys(custMatch).length > 0 ? [{ $match: custMatch }] : []),
      {
        $group: {
          _id: '$customerType',
          count: { $sum: 1 },
          installedCards: { $sum: '$installedCardCount' },
        },
      },
    ]),

    // Connected Load Intelligence
    Installation.aggregate([
      ...(Object.keys(instMatch).length > 0 ? [{ $match: instMatch }] : []),
      {
        $group: {
          _id: '$customerType',
          totalConnectedLoadKw: { $sum: '$connectedLoadKw' },
          avgConnectedLoadKw: { $avg: '$connectedLoadKw' },
          recommendedCards: { $sum: '$recommendedCardCount' },
          installedCards: { $sum: '$installedCardCount' },
          installationCount: { $sum: 1 },
        },
      },
    ]),

    // Electricity Bill Intelligence
    Installation.aggregate([
      ...(Object.keys(instMatch).length > 0 ? [{ $match: instMatch }] : []),
      {
        $group: {
          _id: '$customerType',
          avgMonthlyBill: { $avg: '$monthlyElectricityBill' },
          avgHighestBill: { $avg: '$highestElectricityBill12Months' },
          maxReportedBill: { $max: '$highestElectricityBill12Months' },
        },
      },
    ]),
  ]);

  const customerTypeMap = {};
  let totalCust = 0;
  customerTypes.forEach((c) => {
    customerTypeMap[c._id] = c.count;
    totalCust += c.count;
  });

  const loadMap = {};
  let globalLoadKw = 0;
  let globalInstCount = 0;
  let globalRecommended = 0;
  let globalInstalled = 0;

  loadStats.forEach((l) => {
    loadMap[l._id] = {
      totalLoadKw: Math.round(l.totalConnectedLoadKw * 10) / 10,
      avgLoadKw: Math.round(l.avgConnectedLoadKw * 10) / 10,
      recommendedCards: l.recommendedCards,
      installedCards: l.installedCards,
      count: l.installationCount,
    };
    globalLoadKw += l.totalConnectedLoadKw;
    globalInstCount += l.installationCount;
    globalRecommended += l.recommendedCards;
    globalInstalled += l.installedCards;
  });

  const billMap = {};
  billStats.forEach((b) => {
    billMap[b._id] = {
      avgMonthlyBill: Math.round(b.avgMonthlyBill || 0),
      avgHighestBill: Math.round(b.avgHighestBill || 0),
      maxReportedBill: b.maxReportedBill || 0,
    };
  });

  return {
    customerDistribution: {
      total: totalCust,
      residential: customerTypeMap[CUSTOMER_TYPES.RESIDENTIAL] || 0,
      commercial: customerTypeMap[CUSTOMER_TYPES.COMMERCIAL] || 0,
      industrial: customerTypeMap[CUSTOMER_TYPES.INDUSTRIAL] || 0,
    },
    connectedLoad: {
      totalConnectedLoadKw: Math.round(globalLoadKw * 10) / 10,
      avgLoadPerInstallationKw:
        globalInstCount > 0 ? Math.round((globalLoadKw / globalInstCount) * 10) / 10 : 0,
      totalRecommendedCards: globalRecommended,
      totalInstalledCards: globalInstalled,
      varianceCards: globalInstalled - globalRecommended,
      breakdown: loadMap,
    },
    electricityBills: {
      disclaimer:
        'Note: Electricity bill values are customer-reported during installation onboarding.',
      breakdown: billMap,
    },
  };
};

/**
 * 8. Super Admin Audit & Watch: Partner to Sub-Franchise Card Distribution Tracking
 */
export const getSubFranchiseDistributionTracking = async ({
  parentPartnerId,
  state,
  district,
  search,
}) => {
  const query = {};
  if (parentPartnerId && mongoose.Types.ObjectId.isValid(parentPartnerId)) {
    query.sellerPartnerId = new mongoose.Types.ObjectId(parentPartnerId);
  }

  const distributions = await Transaction.find(query)
    .populate('sellerPartnerId', 'fullName franchiseId franchiseType state district mobileNumber')
    .populate(
      'buyerPartnerId',
      'fullName franchiseId franchiseType state district parentPartnerId mobileNumber'
    )
    .sort({ createdAt: -1 })
    .lean();

  // Filter only transactions where receiving partner is a SUB_FRANCHISE
  let subFranchiseTransfers = distributions.filter(
    (tx) => tx.buyerPartnerId && tx.buyerPartnerId.franchiseType === 'SUB_FRANCHISE'
  );

  if (state) {
    const sRegex = new RegExp(`^${state.trim()}$`, 'i');
    subFranchiseTransfers = subFranchiseTransfers.filter(
      (tx) => sRegex.test(tx.sellerPartnerId?.state) || sRegex.test(tx.buyerPartnerId?.state)
    );
  }

  if (district) {
    const dRegex = new RegExp(`^${district.trim()}$`, 'i');
    subFranchiseTransfers = subFranchiseTransfers.filter(
      (tx) => dRegex.test(tx.sellerPartnerId?.district) || dRegex.test(tx.buyerPartnerId?.district)
    );
  }

  if (search) {
    const q = search.trim().toLowerCase();
    subFranchiseTransfers = subFranchiseTransfers.filter(
      (tx) =>
        tx.sellerPartnerId?.fullName?.toLowerCase().includes(q) ||
        tx.sellerPartnerId?.franchiseId?.toLowerCase().includes(q) ||
        tx.buyerPartnerId?.fullName?.toLowerCase().includes(q) ||
        tx.buyerPartnerId?.franchiseId?.toLowerCase().includes(q) ||
        tx.transactionId?.toLowerCase().includes(q)
    );
  }

  // Group summary by Parent Franchise Partner
  const parentSummaryMap = {};
  subFranchiseTransfers.forEach((tx) => {
    const parentId = tx.sellerPartnerId?._id?.toString() || 'HQ';
    if (!parentSummaryMap[parentId]) {
      parentSummaryMap[parentId] = {
        partnerId: tx.sellerPartnerId?._id,
        fullName: tx.sellerPartnerId?.fullName || 'Super Admin / HQ',
        franchiseId: tx.sellerPartnerId?.franchiseId || 'HQ',
        franchiseType: tx.sellerPartnerId?.franchiseType || 'HEADQUARTERS',
        state: tx.sellerPartnerId?.state || '',
        district: tx.sellerPartnerId?.district || '',
        totalCardsGivenToSubFranchises: 0,
        totalTransactionsCount: 0,
        subFranchiseRecipients: new Set(),
      };
    }
    if (tx.status === 'CONFIRMED') {
      parentSummaryMap[parentId].totalCardsGivenToSubFranchises += tx.quantity || 0;
    }
    parentSummaryMap[parentId].totalTransactionsCount += 1;
    if (tx.buyerPartnerId?.fullName) {
      parentSummaryMap[parentId].subFranchiseRecipients.add(
        `${tx.buyerPartnerId.fullName} (${tx.buyerPartnerId.franchiseId})`
      );
    }
  });

  const parentSummaries = Object.values(parentSummaryMap).map((p) => ({
    ...p,
    subFranchiseRecipients: Array.from(p.subFranchiseRecipients),
    subFranchiseCount: p.subFranchiseRecipients.size,
  }));

  return {
    parentSummaries,
    records: subFranchiseTransfers,
    totalCardsDistributedToSubFranchises: subFranchiseTransfers
      .filter((t) => t.status === 'CONFIRMED')
      .reduce((acc, curr) => acc + (curr.quantity || 0), 0),
  };
};
