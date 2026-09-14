import mongoose from 'mongoose';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import Transaction from '../models/Transaction.model.js';
import Installation from '../models/Installation.model.js';
import Customer from '../models/Customer.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import LocationVerification from '../models/LocationVerification.model.js';
import User from '../models/User.model.js';

import {
  CARD_STATUS,
  TRANSACTION_STATUS,
  PAYMENT_STATUS,
  INSTALLATION_VERIFICATION_STATUS,
  CUSTOMER_TYPES,
  USER_ROLES,
  DEFAULT_PAGINATION,
} from '../config/constants.js';

// Helper: Build Partner Scope for Reports
export const getPartnerScopeData = async (user, partner) => {
  if (!user || user.role === USER_ROLES.SUPER_ADMIN || !partner) {
    return {
      isSuperAdmin: true,
      partnerIds: null,
      partnerMatch: {},
      installationMatch: {},
      cardMatch: {},
      transactionMatch: {},
      historyMatch: {},
      customerMatch: {},
    };
  }

  const partnerObjectId = new mongoose.Types.ObjectId(partner._id);

  // Query only direct sub-partners created under this partner
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
  };
};

/**
 * 1. Card Movement Report (RBAC Scoped)
 */
export const getCardMovementsReport = async ({
  page = DEFAULT_PAGINATION.PAGE,
  limit = DEFAULT_PAGINATION.LIMIT,
  serialNumber = '',
  partnerId = '',
  action = '',
  startDate = '',
  endDate = '',
  user,
  partner,
}) => {
  const scope = await getPartnerScopeData(user, partner);
  const query = {};

  if (!scope.isSuperAdmin) {
    query.$or = [
      { fromOwnerId: { $in: scope.partnerIds } },
      { toOwnerId: { $in: scope.partnerIds } },
    ];
  }

  if (serialNumber) {
    query.serialNumber = new RegExp(serialNumber.trim(), 'i');
  }

  if (partnerId) {
    if (scope.isSuperAdmin) {
      query.$or = [{ fromOwnerId: partnerId }, { toOwnerId: partnerId }];
    }
  }

  if (action) {
    query.action = action;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.timestamp.$lte = end;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [total, records] = await Promise.all([
    CardHistory.countDocuments(query),
    CardHistory.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('fromOwnerId', 'fullName franchiseId franchiseType state district')
      .populate('toOwnerId', 'fullName franchiseId franchiseType state district')
      .populate('performedBy', 'name email role')
      .lean(),
  ]);

  return {
    records,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * 2. Partner Inventory Report (RBAC Scoped)
 */
export const getPartnerInventoryReport = async ({
  page = DEFAULT_PAGINATION.PAGE,
  limit = DEFAULT_PAGINATION.LIMIT,
  state = '',
  district = '',
  search = '',
  franchiseType = '',
  user,
  partner,
}) => {
  const scope = await getPartnerScopeData(user, partner);
  const matchPartner = scope.isSuperAdmin ? {} : { ...scope.partnerMatch };

  if (state) matchPartner.state = new RegExp(`^${state.trim()}$`, 'i');
  if (district) matchPartner.district = new RegExp(`^${district.trim()}$`, 'i');
  if (franchiseType) matchPartner.franchiseType = franchiseType;
  if (search) {
    const sRegex = new RegExp(search.trim(), 'i');
    const searchMatch = [
      { fullName: sRegex },
      { franchiseId: sRegex },
      { mobileNumber: sRegex },
      { email: sRegex },
    ];
    if (matchPartner.$or) {
      matchPartner.$and = [{ $or: matchPartner.$or }, { $or: searchMatch }];
      delete matchPartner.$or;
    } else {
      matchPartner.$or = searchMatch;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [totalResult, partners] = await Promise.all([
    FranchisePartner.countDocuments(matchPartner),
    FranchisePartner.aggregate([
      { $match: matchPartner },
      {
        $lookup: {
          from: 'cards',
          localField: '_id',
          foreignField: 'currentOwnerId',
          as: 'cards',
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
          totalCards: { $size: '$cards' },
          availableInHand: {
            $size: {
              $filter: {
                input: '$cards',
                as: 'c',
                cond: { $in: ['$$c.status', [CARD_STATUS.ASSIGNED, CARD_STATUS.TRANSFERRED]] },
              },
            },
          },
          pendingTransfer: {
            $size: {
              $filter: {
                input: '$cards',
                as: 'c',
                cond: { $eq: ['$$c.status', CARD_STATUS.PENDING_TRANSFER] },
              },
            },
          },
          installed: {
            $size: {
              $filter: {
                input: '$cards',
                as: 'c',
                cond: { $eq: ['$$c.status', CARD_STATUS.INSTALLED] },
              },
            },
          },
          blocked: {
            $size: {
              $filter: {
                input: '$cards',
                as: 'c',
                cond: { $eq: ['$$c.status', CARD_STATUS.BLOCKED] },
              },
            },
          },
        },
      },
      { $sort: { availableInHand: -1, totalCards: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]),
  ]);

  return {
    records: partners,
    pagination: {
      total: totalResult,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalResult / limitNum) || 1,
    },
  };
};

/**
 * 3. Installation Report (RBAC Scoped)
 */
export const getInstallationsReport = async ({
  page = DEFAULT_PAGINATION.PAGE,
  limit = DEFAULT_PAGINATION.LIMIT,
  state = '',
  district = '',
  partnerId = '',
  customerType = '',
  verificationStatus = '',
  startDate = '',
  endDate = '',
  search = '',
  user,
  partner,
}) => {
  const scope = await getPartnerScopeData(user, partner);
  const query = scope.isSuperAdmin ? {} : { ...scope.installationMatch };

  if (state) query['installationAddress.state'] = new RegExp(`^${state.trim()}$`, 'i');
  if (district) query['installationAddress.district'] = new RegExp(`^${district.trim()}$`, 'i');
  if (partnerId && scope.isSuperAdmin) query.partnerId = partnerId;
  if (customerType) query.customerType = customerType;
  if (verificationStatus) query.verificationStatus = verificationStatus;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    const sRegex = new RegExp(search.trim(), 'i');
    const searchMatch = [
      { installationId: sRegex },
      { cardSerialNumbers: sRegex },
      { 'installationAddress.city': sRegex },
    ];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchMatch }];
      delete query.$or;
    } else {
      query.$or = searchMatch;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [total, records] = await Promise.all([
    Installation.countDocuments(query),
    Installation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('customerId', 'fullName customerId mobileNumber customerType')
      .populate('partnerId', 'fullName franchiseId franchiseType state district mobileNumber')
      .populate('locationVerificationId')
      .lean(),
  ]);

  return {
    records,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * 4. P2P Sales & Transactions Report (RBAC Scoped)
 */
export const getP2PTransactionsReport = async ({
  page = DEFAULT_PAGINATION.PAGE,
  limit = DEFAULT_PAGINATION.LIMIT,
  sellerPartnerId = '',
  buyerPartnerId = '',
  status = '',
  paymentStatus = '',
  startDate = '',
  endDate = '',
  search = '',
  user,
  partner,
}) => {
  const scope = await getPartnerScopeData(user, partner);
  const query = scope.isSuperAdmin ? {} : { ...scope.transactionMatch };

  if (sellerPartnerId && scope.isSuperAdmin) query.sellerPartnerId = sellerPartnerId;
  if (buyerPartnerId && scope.isSuperAdmin) query.buyerPartnerId = buyerPartnerId;
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    const sRegex = new RegExp(search.trim(), 'i');
    const searchMatch = [{ transactionId: sRegex }, { cardSerialNumbers: sRegex }];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchMatch }];
      delete query.$or;
    } else {
      query.$or = searchMatch;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [total, records] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('sellerPartnerId', 'fullName franchiseId franchiseType state district mobileNumber')
      .populate('buyerPartnerId', 'fullName franchiseId franchiseType state district mobileNumber')
      .populate('confirmedBy', 'name email')
      .populate('disputedBy', 'name email')
      .lean(),
  ]);

  return {
    records,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * 5. Payment & Verification Report (RBAC Scoped)
 */
export const getPaymentsReport = async ({
  page = DEFAULT_PAGINATION.PAGE,
  limit = DEFAULT_PAGINATION.LIMIT,
  paymentStatus = '',
  startDate = '',
  endDate = '',
  search = '',
  user,
  partner,
}) => {
  const scope = await getPartnerScopeData(user, partner);
  const query = scope.isSuperAdmin ? {} : { ...scope.transactionMatch };

  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    const sRegex = new RegExp(search.trim(), 'i');
    const searchMatch = [{ transactionId: sRegex }, { paymentReference: sRegex }];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchMatch }];
      delete query.$or;
    } else {
      query.$or = searchMatch;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [total, records] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select(
        'transactionId totalAmount currency paymentStatus paymentReference paymentProofUrl paymentSubmittedAt paymentVerifiedAt paymentRejectionReason sellerPartnerId buyerPartnerId createdAt'
      )
      .populate('sellerPartnerId', 'fullName franchiseId mobileNumber')
      .populate('buyerPartnerId', 'fullName franchiseId mobileNumber')
      .lean(),
  ]);

  return {
    records,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * 6. Disputes Report (RBAC Scoped)
 */
export const getDisputesReport = async ({
  page = DEFAULT_PAGINATION.PAGE,
  limit = DEFAULT_PAGINATION.LIMIT,
  disputeReason = '',
  user,
  partner,
}) => {
  const scope = await getPartnerScopeData(user, partner);
  const query = {
    status: TRANSACTION_STATUS.DISPUTED,
    ...(scope.isSuperAdmin ? {} : scope.transactionMatch),
  };

  if (disputeReason) {
    query.disputeReason = disputeReason;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [total, records] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.find(query)
      .sort({ disputedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('sellerPartnerId', 'fullName franchiseId mobileNumber')
      .populate('buyerPartnerId', 'fullName franchiseId mobileNumber')
      .populate('disputedBy', 'name email role')
      .lean(),
  ]);

  return {
    records,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * 7. Single Card Serial Comprehensive Audit Tracer (RBAC Scoped)
 */
export const getCardSerialAuditTracer = async (serialNumber, user, partner) => {
  const scope = await getPartnerScopeData(user, partner);
  const cleanSerial = serialNumber?.trim().toUpperCase();
  if (!cleanSerial) {
    return null;
  }

  // 1. Current Card Object
  const card = await Card.findOne({ serialNumber: cleanSerial })
    .populate(
      'currentOwnerId',
      'fullName franchiseId franchiseType state district mobileNumber email'
    )
    .populate(
      'previousOwnerId',
      'fullName franchiseId franchiseType state district mobileNumber email'
    )
    .populate('assignedBy', 'name email role')
    .populate('blockedBy', 'name email role')
    .lean();

  if (!card) {
    return null;
  }

  // Partner Scope Verification
  if (!scope.isSuperAdmin) {
    const isCurrentOwner =
      card.currentOwnerId &&
      scope.partnerIds.some((pid) => pid.toString() === card.currentOwnerId._id.toString());
    const isPrevOwner =
      card.previousOwnerId &&
      scope.partnerIds.some((pid) => pid.toString() === card.previousOwnerId._id.toString());

    const hasTx = await Transaction.exists({
      cardSerialNumbers: cleanSerial,
      ...scope.transactionMatch,
    });

    const hasInst = await Installation.exists({
      cardSerialNumbers: cleanSerial,
      ...scope.installationMatch,
    });

    if (!isCurrentOwner && !isPrevOwner && !hasTx && !hasInst) {
      return null; // Restricted
    }
  }

  // 2. Lifecycle History Timeline
  const historyQuery = {
    serialNumber: cleanSerial,
    ...(scope.isSuperAdmin ? {} : scope.historyMatch),
  };

  const history = await CardHistory.find(historyQuery)
    .sort({ timestamp: -1 })
    .populate('fromOwnerId', 'fullName franchiseId franchiseType state district')
    .populate('toOwnerId', 'fullName franchiseId franchiseType state district')
    .populate('performedBy', 'name email role')
    .lean();

  // 3. Transactions involving this card
  const txQuery = {
    cardSerialNumbers: cleanSerial,
    ...(scope.isSuperAdmin ? {} : scope.transactionMatch),
  };

  const transactions = await Transaction.find(txQuery)
    .sort({ createdAt: -1 })
    .populate('sellerPartnerId', 'fullName franchiseId franchiseType')
    .populate('buyerPartnerId', 'fullName franchiseId franchiseType')
    .lean();

  // 4. Installation & Customer Details if installed
  let installation = null;
  let locationVerification = null;
  let customer = null;

  if (card.installationId || card.status === CARD_STATUS.INSTALLED) {
    const instQuery = {
      cardSerialNumbers: cleanSerial,
      ...(scope.isSuperAdmin ? {} : scope.installationMatch),
    };

    installation = await Installation.findOne(instQuery)
      .populate('customerId')
      .populate('partnerId', 'fullName franchiseId franchiseType state district')
      .lean();

    if (installation) {
      customer = installation.customerId;
      if (installation.locationVerificationId) {
        locationVerification = await LocationVerification.findById(
          installation.locationVerificationId
        ).lean();
      }
    }
  }

  return {
    card,
    history,
    transactions,
    installation,
    customer,
    locationVerification,
  };
};

/**
 * 8. Customer Deep Lineage Search (RBAC Scoped)
 */
export const getCustomerDeepAudit = async (searchTerm, user, partner) => {
  const scope = await getPartnerScopeData(user, partner);
  const cleanTerm = searchTerm?.trim();
  if (!cleanTerm) return [];

  const sRegex = new RegExp(cleanTerm, 'i');

  const customerQuery = {
    $or: [{ customerId: sRegex }, { mobileNumber: sRegex }, { fullName: sRegex }],
    ...(scope.isSuperAdmin ? {} : scope.customerMatch),
  };

  const customers = await Customer.find(customerQuery)
    .populate('createdByPartnerId', 'fullName franchiseId franchiseType state district mobileNumber')
    .limit(10)
    .lean();

  // Attach installations and cards for each customer
  const enrichedCustomers = await Promise.all(
    customers.map(async (c) => {
      const installations = await Installation.find({
        customerId: c._id,
        ...(scope.isSuperAdmin ? {} : scope.installationMatch),
      })
        .sort({ createdAt: -1 })
        .populate('partnerId', 'fullName franchiseId state district')
        .populate('locationVerificationId')
        .lean();

      return {
        customer: c,
        installations,
      };
    })
  );

  return enrichedCustomers;
};

/**
 * 9. CSV Data Exporter (RFC 4180 compliant, RBAC Scoped)
 */
export const exportReportToCSV = async (reportType, queryParams) => {
  let headers = [];
  let rows = [];

  switch (reportType) {
    case 'card-movements': {
      const data = await getCardMovementsReport({ ...queryParams, limit: 10000 });
      headers = [
        'Timestamp',
        'Serial Number',
        'Action',
        'From Owner',
        'To Owner',
        'New Status',
        'Performed By',
        'Reason',
      ];
      rows = data.records.map((r) => [
        new Date(r.timestamp).toLocaleString('en-IN'),
        r.serialNumber || '',
        r.action || '',
        r.fromOwnerId?.fullName
          ? `${r.fromOwnerId.fullName} (${r.fromOwnerId.franchiseId})`
          : r.fromOwnerType || 'HQ',
        r.toOwnerId?.fullName
          ? `${r.toOwnerId.fullName} (${r.toOwnerId.franchiseId})`
          : r.toOwnerType || 'HQ',
        r.newStatus || '',
        r.performedBy?.name || '',
        r.reason || '',
      ]);
      break;
    }
    case 'partner-inventory': {
      const data = await getPartnerInventoryReport({ ...queryParams, limit: 10000 });
      headers = [
        'Franchise ID',
        'Partner Name',
        'Type',
        'State',
        'District',
        'Mobile',
        'In Hand Available',
        'Pending Transfer',
        'Installed',
        'Blocked',
        'Total Cards',
      ];
      rows = data.records.map((r) => [
        r.franchiseId || '',
        r.fullName || '',
        r.franchiseType || '',
        r.state || '',
        r.district || '',
        r.mobileNumber || '',
        r.availableInHand || 0,
        r.pendingTransfer || 0,
        r.installed || 0,
        r.blocked || 0,
        r.totalCards || 0,
      ]);
      break;
    }
    case 'installations': {
      const data = await getInstallationsReport({ ...queryParams, limit: 10000 });
      headers = [
        'Installation ID',
        'Date',
        'Customer Name',
        'Customer Type',
        'Partner',
        'State',
        'District',
        'Cards Installed',
        'Connected Load (kW)',
        'Price/Card (INR)',
        'Total Amount (INR)',
        'GPS Status',
        'Verification Status',
      ];
      rows = data.records.map((r) => [
        r.installationId || '',
        new Date(r.createdAt).toLocaleDateString('en-IN'),
        r.customerId?.fullName || '',
        r.customerType || '',
        r.partnerId?.fullName ? `${r.partnerId.fullName} (${r.partnerId.franchiseId})` : '',
        r.installationAddress?.state || '',
        r.installationAddress?.district || '',
        r.installedCardCount || 0,
        r.connectedLoadKw || 0,
        r.pricePerCard || 0,
        r.totalAmount || 0,
        r.locationVerificationId
          ? r.locationVerificationId.territoryMatch
            ? 'MATCH'
            : 'MISMATCH'
          : 'N/A',
        r.verificationStatus || '',
      ]);
      break;
    }
    case 'p2p-transactions': {
      const data = await getP2PTransactionsReport({ ...queryParams, limit: 10000 });
      headers = [
        'Transaction ID',
        'Date',
        'Seller Partner',
        'Buyer Partner',
        'Quantity',
        'Price/Card (INR)',
        'Total Amount (INR)',
        'Transaction Status',
        'Payment Status',
      ];
      rows = data.records.map((r) => [
        r.transactionId || '',
        new Date(r.createdAt).toLocaleDateString('en-IN'),
        r.sellerPartnerId?.fullName
          ? `${r.sellerPartnerId.fullName} (${r.sellerPartnerId.franchiseId})`
          : '',
        r.buyerPartnerId?.fullName
          ? `${r.buyerPartnerId.fullName} (${r.buyerPartnerId.franchiseId})`
          : '',
        r.quantity || 0,
        r.pricePerCard || 0,
        r.totalAmount || 0,
        r.status || '',
        r.paymentStatus || '',
      ]);
      break;
    }
    case 'payments': {
      const data = await getPaymentsReport({ ...queryParams, limit: 10000 });
      headers = [
        'Transaction ID',
        'Date',
        'Total Amount (INR)',
        'Payment Status',
        'Payment Reference',
        'Seller Partner',
        'Buyer Partner',
      ];
      rows = data.records.map((r) => [
        r.transactionId || '',
        new Date(r.createdAt).toLocaleDateString('en-IN'),
        r.totalAmount || 0,
        r.paymentStatus || '',
        r.paymentReference || '',
        r.sellerPartnerId?.fullName
          ? `${r.sellerPartnerId.fullName} (${r.sellerPartnerId.franchiseId})`
          : '',
        r.buyerPartnerId?.fullName
          ? `${r.buyerPartnerId.fullName} (${r.buyerPartnerId.franchiseId})`
          : '',
      ]);
      break;
    }
    case 'disputes': {
      const data = await getDisputesReport({ ...queryParams, limit: 10000 });
      headers = [
        'Transaction ID',
        'Disputed Date',
        'Disputed By',
        'Dispute Reason',
        'Seller Partner',
        'Buyer Partner',
        'Amount (INR)',
      ];
      rows = data.records.map((r) => [
        r.transactionId || '',
        r.disputedAt ? new Date(r.disputedAt).toLocaleDateString('en-IN') : '',
        r.disputedBy?.name || '',
        r.disputeReason || '',
        r.sellerPartnerId?.fullName
          ? `${r.sellerPartnerId.fullName} (${r.sellerPartnerId.franchiseId})`
          : '',
        r.buyerPartnerId?.fullName
          ? `${r.buyerPartnerId.fullName} (${r.buyerPartnerId.franchiseId})`
          : '',
        r.totalAmount || 0,
      ]);
      break;
    }
    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }

  // Format into CSV
  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\r\n');

  return csvContent;
};
