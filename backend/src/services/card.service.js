import mongoose from 'mongoose';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiError } from '../utils/apiError.js';
import {
  CARD_STATUS,
  CARD_OWNER_TYPES,
  CARD_ACTIONS,
  USER_ROLES,
} from '../config/constants.js';

// Helper to format number with zero-padding (e.g. 1 -> "000001")
const padSerial = (num, length = 6) => {
  return String(num).padStart(length, '0');
};

// 1. Preview Card Batch before creation (Collision pre-check)
export const previewCardBatch = async (batchParams) => {
  const { prefix, startNumber, endNumber, paddingLength, count } = batchParams;

  const generatedSerials = [];
  for (let i = startNumber; i <= endNumber; i++) {
    generatedSerials.push(`${prefix}${padSerial(i, paddingLength)}`);
  }

  // Find duplicates in database
  const existingCards = await Card.find({
    serialNumber: { $in: generatedSerials },
  }).select('serialNumber status currentOwnerType');

  const duplicateSerials = existingCards.map((c) => c.serialNumber);

  return {
    totalCount: count,
    firstSerial: generatedSerials[0],
    lastSerial: generatedSerials[generatedSerials.length - 1],
    samplePreview: generatedSerials.slice(0, 8),
    duplicateCount: duplicateSerials.length,
    duplicates: duplicateSerials,
    isValid: duplicateSerials.length === 0,
  };
};

// 2. Batch Creation of Cards (Super Admin)
export const createBatchCards = async (batchParams, creatorUser) => {
  const { prefix, startNumber, endNumber, paddingLength, count, notes } = batchParams;

  const generatedSerials = [];
  for (let i = startNumber; i <= endNumber; i++) {
    generatedSerials.push(`${prefix}${padSerial(i, paddingLength)}`);
  }

  // Check for duplicate collisions in database
  const existingCards = await Card.find({
    serialNumber: { $in: generatedSerials },
  }).select('serialNumber');

  if (existingCards.length > 0) {
    const dups = existingCards.map((c) => c.serialNumber);
    throw new ApiError(
      409,
      `Cannot create batch: ${dups.length} duplicate serial numbers already exist in the database.`,
      { duplicateCount: dups.length, duplicates: dups.slice(0, 20) }
    );
  }

  const batchId = `BATCH-${new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14)}-${Math.floor(100 + Math.random() * 900)}`;

  const cardDocs = generatedSerials.map((serial) => ({
    serialNumber: serial,
    status: CARD_STATUS.AVAILABLE,
    currentOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
    currentOwnerId: null,
    batchId,
    notes,
  }));

  // Perform bulk insertion
  const createdCards = await Card.insertMany(cardDocs, { ordered: true });

  // Create corresponding immutable audit trail entries
  const historyDocs = createdCards.map((card) => ({
    cardId: card._id,
    serialNumber: card.serialNumber,
    action: CARD_ACTIONS.CREATED,
    fromOwnerType: null,
    fromOwnerId: null,
    toOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
    toOwnerId: null,
    previousStatus: null,
    newStatus: CARD_STATUS.AVAILABLE,
    performedBy: creatorUser._id,
    performedByRole: creatorUser.role,
    reason: `Initial stock generation via Batch ${batchId}`,
    metadata: { batchId, notes },
    timestamp: new Date(),
  }));

  await CardHistory.insertMany(historyDocs, { ordered: false });

  return {
    batchId,
    totalCreated: createdCards.length,
    firstSerial: createdCards[0].serialNumber,
    lastSerial: createdCards[createdCards.length - 1].serialNumber,
    status: CARD_STATUS.AVAILABLE,
  };
};

// 3. Manual List Creation of Cards (Super Admin)
export const createManualCards = async (serialNumbers, notes, creatorUser) => {
  // Check for duplicate collisions in database
  const existingCards = await Card.find({
    serialNumber: { $in: serialNumbers },
  }).select('serialNumber');

  if (existingCards.length > 0) {
    const dups = existingCards.map((c) => c.serialNumber);
    throw new ApiError(
      409,
      `Cannot create cards: ${dups.length} serial numbers already exist in the database.`,
      { duplicateCount: dups.length, duplicates: dups }
    );
  }

  const batchId = `MANUAL-${new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14)}`;

  const cardDocs = serialNumbers.map((serial) => ({
    serialNumber: serial,
    status: CARD_STATUS.AVAILABLE,
    currentOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
    currentOwnerId: null,
    batchId,
    notes,
  }));

  const createdCards = await Card.insertMany(cardDocs, { ordered: true });

  const historyDocs = createdCards.map((card) => ({
    cardId: card._id,
    serialNumber: card.serialNumber,
    action: CARD_ACTIONS.CREATED,
    fromOwnerType: null,
    fromOwnerId: null,
    toOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
    toOwnerId: null,
    previousStatus: null,
    newStatus: CARD_STATUS.AVAILABLE,
    performedBy: creatorUser._id,
    performedByRole: creatorUser.role,
    reason: 'Manual individual stock entry',
    metadata: { batchId, notes },
    timestamp: new Date(),
  }));

  await CardHistory.insertMany(historyDocs, { ordered: false });

  return {
    totalCreated: createdCards.length,
    batchId,
    cards: createdCards,
  };
};

// 4. Get Cards with Server-side Search, Filtering, Pagination & Territory Scope
export const getCards = async (queryParams, currentUser, authPartner) => {
  const {
    page = 1,
    limit = 25,
    search = '',
    status = '',
    franchiseType = '',
    state = '',
    district = '',
    ownerId = '',
    batchId = '',
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  // Enforce Role & Territory Scope
  if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
    if (!authPartner) {
      throw new ApiError(403, 'Partner profile required to access inventory.');
    }
    // Franchise Partner can only view cards in their custody
    filter.currentOwnerId = authPartner._id;
  } else {
    // Super Admin explicit owner filter
    if (ownerId) {
      if (ownerId === 'HQ' || ownerId === 'HEADQUARTERS') {
        filter.currentOwnerType = CARD_OWNER_TYPES.HEADQUARTERS;
      } else if (mongoose.Types.ObjectId.isValid(ownerId)) {
        filter.currentOwnerId = new mongoose.Types.ObjectId(ownerId);
      }
    }
  }

  // Status Filter
  if (status && Object.values(CARD_STATUS).includes(status.toUpperCase())) {
    filter.status = status.toUpperCase();
  }

  // Batch Filter
  if (batchId) {
    filter.batchId = batchId.trim().toUpperCase();
  }

  // Partner / Territory specific filtering for Super Admin
  if (currentUser.role === USER_ROLES.SUPER_ADMIN && (franchiseType || state || district)) {
    const partnerFilter = {};
    if (franchiseType) partnerFilter.franchiseType = franchiseType;
    if (state) partnerFilter.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
    if (district) partnerFilter.district = { $regex: new RegExp(`^${district.trim()}$`, 'i') };

    const matchingPartners = await FranchisePartner.find(partnerFilter).select('_id');
    const partnerIds = matchingPartners.map((p) => p._id);

    if (filter.currentOwnerId) {
      // If already filtered by specific owner, ensure it matches territory filter
      if (!partnerIds.some((id) => id.equals(filter.currentOwnerId))) {
        return { cards: [], pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 0 } };
      }
    } else {
      filter.currentOwnerId = { $in: partnerIds };
    }
  }

  // Search by Serial Number, Partner Name, or Franchise ID
  if (search && search.trim()) {
    const cleanSearch = search.trim();
    const searchRegex = new RegExp(cleanSearch, 'i');

    // Find any matching partners
    const matchedPartners = await FranchisePartner.find({
      $or: [
        { fullName: searchRegex },
        { franchiseId: searchRegex },
        { mobileNumber: searchRegex },
      ],
    }).select('_id');

    const matchedPartnerIds = matchedPartners.map((p) => p._id);

    if (matchedPartnerIds.length > 0) {
      filter.$or = [
        { serialNumber: searchRegex },
        { currentOwnerId: { $in: matchedPartnerIds } },
      ];
    } else {
      filter.serialNumber = searchRegex;
    }
  }

  const [total, cards] = await Promise.all([
    Card.countDocuments(filter),
    Card.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: 'currentOwnerId',
        select: 'franchiseId fullName franchiseType state district city mobileNumber email accountStatus',
      })
      .populate({
        path: 'previousOwnerId',
        select: 'franchiseId fullName franchiseType state district',
      })
      .populate({
        path: 'assignedBy',
        select: 'fullName email role',
      }),
  ]);

  return {
    cards,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

// 5. Get Single Card by ID with Security Verification
export const getCardById = async (cardId, currentUser, authPartner) => {
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    throw new ApiError(400, 'Invalid Card ID format.');
  }

  const card = await Card.findById(cardId)
    .populate({
      path: 'currentOwnerId',
      select: 'franchiseId fullName franchiseType state district city mobileNumber email accountStatus parentPartnerId',
      populate: {
        path: 'parentPartnerId',
        select: 'franchiseId fullName franchiseType state district',
      },
    })
    .populate({
      path: 'previousOwnerId',
      select: 'franchiseId fullName franchiseType state district',
    })
    .populate({
      path: 'assignedBy',
      select: 'fullName email role',
    })
    .populate({
      path: 'blockedBy',
      select: 'fullName email role',
    });

  if (!card) {
    throw new ApiError(404, 'Card not found.');
  }

  // Security check: Partner can only view cards in their custody
  if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
    if (!authPartner || !card.currentOwnerId || !card.currentOwnerId._id.equals(authPartner._id)) {
      throw new ApiError(403, 'Access Denied: You do not have permission to view this card.');
    }
  }

  return card;
};

// 6. Get Immutable History / Audit Trail of a Card
export const getCardHistory = async (cardId, currentUser, authPartner) => {
  // Verify access first
  const card = await getCardById(cardId, currentUser, authPartner);

  const history = await CardHistory.find({ cardId: card._id })
    .sort({ timestamp: -1 })
    .populate({
      path: 'fromOwnerId',
      select: 'franchiseId fullName franchiseType state district',
    })
    .populate({
      path: 'toOwnerId',
      select: 'franchiseId fullName franchiseType state district',
    })
    .populate({
      path: 'performedBy',
      select: 'fullName email role',
    });

  return {
    card: {
      _id: card._id,
      serialNumber: card.serialNumber,
      status: card.status,
      currentOwner: card.currentOwnerId,
    },
    history,
  };
};

// 7. Update Card Status (Super Admin Status Management with Lifecycle Rules)
export const updateCardStatus = async (cardId, newStatus, reason, modifierUser) => {
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    throw new ApiError(400, 'Invalid Card ID format.');
  }

  const card = await Card.findById(cardId);
  if (!card) {
    throw new ApiError(404, 'Card not found.');
  }

  const prevStatus = card.status;

  if (prevStatus === newStatus) {
    return card;
  }

  // Lifecycle Rules:
  // 1. INSTALLED cards are permanently locked
  if (prevStatus === CARD_STATUS.INSTALLED) {
    throw new ApiError(400, 'Installed cards are permanently locked. Status cannot be modified.');
  }

  // 2. BLOCKED cards can only be unblocked to AVAILABLE or ASSIGNED by Super Admin
  if (prevStatus === CARD_STATUS.BLOCKED && newStatus !== CARD_STATUS.AVAILABLE && newStatus !== CARD_STATUS.ASSIGNED) {
    throw new ApiError(
      400,
      `Blocked cards can only be transitioned to AVAILABLE or ASSIGNED.`
    );
  }

  let action = CARD_ACTIONS.STATUS_CHANGED;
  if (newStatus === CARD_STATUS.BLOCKED) {
    action = CARD_ACTIONS.BLOCKED;
    card.blockedReason = reason || 'Blocked by Super Admin';
    card.blockedAt = new Date();
    card.blockedBy = modifierUser._id;
  } else if (prevStatus === CARD_STATUS.BLOCKED) {
    action = CARD_ACTIONS.UNBLOCKED;
    card.blockedReason = '';
    card.blockedAt = null;
    card.blockedBy = null;
  }

  card.status = newStatus;
  await card.save();

  // Create immutable history entry
  await CardHistory.create({
    cardId: card._id,
    serialNumber: card.serialNumber,
    action,
    fromOwnerType: card.currentOwnerType,
    fromOwnerId: card.currentOwnerId,
    toOwnerType: card.currentOwnerType,
    toOwnerId: card.currentOwnerId,
    previousStatus: prevStatus,
    newStatus,
    performedBy: modifierUser._id,
    performedByRole: modifierUser.role,
    reason: reason || `Status changed from ${prevStatus} to ${newStatus}`,
    timestamp: new Date(),
  });

  return card;
};

// 8. Aggregated Real-Time Card Statistics from MongoDB
export const getCardStats = async (currentUser, authPartner) => {
  if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
    const [
      totalCards,
      availableCards,
      assignedCards,
      transferredCards,
      installedCards,
      blockedCards,
    ] = await Promise.all([
      Card.countDocuments(),
      Card.countDocuments({ status: CARD_STATUS.AVAILABLE }),
      Card.countDocuments({ status: CARD_STATUS.ASSIGNED }),
      Card.countDocuments({ status: CARD_STATUS.TRANSFERRED }),
      Card.countDocuments({ status: CARD_STATUS.INSTALLED }),
      Card.countDocuments({ status: CARD_STATUS.BLOCKED }),
    ]);

    return {
      total: totalCards,
      available: availableCards,
      assigned: assignedCards,
      transferred: transferredCards,
      installed: installedCards,
      blocked: blockedCards,
    };
  } else {
    // Partner-specific counts
    if (!authPartner) {
      throw new ApiError(403, 'Partner profile required.');
    }

    const [
      inPossessionTotal,
      availableCards,
      transferredCards,
      installedCards,
      blockedCards,
    ] = await Promise.all([
      Card.countDocuments({ currentOwnerId: authPartner._id }),
      Card.countDocuments({ currentOwnerId: authPartner._id, status: CARD_STATUS.ASSIGNED }),
      Card.countDocuments({ currentOwnerId: authPartner._id, status: CARD_STATUS.TRANSFERRED }),
      Card.countDocuments({ currentOwnerId: authPartner._id, status: CARD_STATUS.INSTALLED }),
      Card.countDocuments({ currentOwnerId: authPartner._id, status: CARD_STATUS.BLOCKED }),
    ]);

    return {
      total: inPossessionTotal,
      available: availableCards,
      assigned: inPossessionTotal,
      transferred: transferredCards,
      installed: installedCards,
      blocked: blockedCards,
    };
  }
};
