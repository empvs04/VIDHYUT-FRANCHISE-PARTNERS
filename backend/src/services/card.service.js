import mongoose from 'mongoose';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import Transaction from '../models/Transaction.model.js';
import Installation from '../models/Installation.model.js';
import Customer from '../models/Customer.model.js';
import { ApiError } from '../utils/apiError.js';
import {
  CARD_STATUS,
  CARD_OWNER_TYPES,
  CARD_ACTIONS,
  USER_ROLES,
  NOTIFICATION_TYPES,
  ENTITY_TYPES,
  CONFIRMATION_STATUS,
} from '../config/constants.js';
import { createNotification } from './notification.service.js';

// Helper to format number with zero-padding (e.g. 1 -> "000001")
const padSerial = (num, length = 6) => {
  return String(num).padStart(length, '0');
};

// 0. Auto-calculate next conflict-free serial range
export const getNextAvailableSerialRange = async (prefix = 'VS', paddingLength = 6, count = 100) => {
  const safeCount = Math.max(1, Math.min(10000, parseInt(count, 10) || 100));
  const safePad = Math.max(1, Math.min(10, parseInt(paddingLength, 10) || 6));
  const safePrefix = (prefix || 'VS').trim().toUpperCase();

  const cards = await Card.find({
    serialNumber: new RegExp(`^${safePrefix}\\d+`, 'i'),
  })
    .select('serialNumber')
    .lean();

  let maxNum = 0;
  cards.forEach((c) => {
    const numPart = c.serialNumber.replace(new RegExp(`^${safePrefix}`, 'i'), '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  });

  const nextStartNumber = maxNum + 1;
  const nextEndNumber = nextStartNumber + safeCount - 1;

  return {
    prefix: safePrefix,
    paddingLength: safePad,
    highestExistingNumber: maxNum,
    totalExistingCardsWithPrefix: cards.length,
    nextStartNumber,
    nextEndNumber,
    count: safeCount,
    firstSerial: `${safePrefix}${padSerial(nextStartNumber, safePad)}`,
    lastSerial: `${safePrefix}${padSerial(nextEndNumber, safePad)}`,
  };
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
      { duplicateCount: dups.length, duplicates: dups.slice(0, 20) }
    );
  }

  const batchId = `MANUAL-${new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14)}-${Math.floor(100 + Math.random() * 900)}`;

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
    reason: `Manual serial creation batch ${batchId}`,
    metadata: { batchId, notes },
    timestamp: new Date(),
  }));

  await CardHistory.insertMany(historyDocs, { ordered: false });

  return {
    batchId,
    totalCreated: createdCards.length,
    status: CARD_STATUS.AVAILABLE,
  };
};

// 3.5 Delete Single Card (Super Admin only - for wrong stock removal)
export const deleteSingleCard = async (cardId, user, reason = 'Mistake / Wrong Stock Entry') => {
  const card = await Card.findById(cardId);
  if (!card) {
    throw new ApiError(404, 'Card not found in database.');
  }

  if (card.status !== CARD_STATUS.AVAILABLE || card.currentOwnerType !== CARD_OWNER_TYPES.HEADQUARTERS) {
    throw new ApiError(
      400,
      `Cannot delete card ${card.serialNumber}: Only unassigned AVAILABLE cards at HQ can be deleted. For distributed/installed cards, update status to BLOCKED or initiate a transfer back to HQ.`
    );
  }

  await Card.findByIdAndDelete(cardId);
  await CardHistory.deleteMany({ cardId: card._id });

  return {
    deletedCardId: card._id,
    serialNumber: card.serialNumber,
    message: `Card ${card.serialNumber} successfully deleted from stock.`,
  };
};

// 3.6 Batch Delete Cards by Serial Range or Batch ID or All HQ Stock (Super Admin only)
export const deleteBatchRange = async ({ mode, prefix, startNumber, endNumber, paddingLength, batchId, reason, purgeAllAvailableHQ }, user) => {
  let query = {};

  if (mode === 'ALL_HQ' || purgeAllAvailableHQ) {
    query = {
      status: CARD_STATUS.AVAILABLE,
      currentOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
    };
  } else if (batchId) {
    query.batchId = batchId.trim();
  } else if (prefix && startNumber && endNumber) {
    const padLen = paddingLength || 6;
    const serials = [];
    for (let i = parseInt(startNumber, 10); i <= parseInt(endNumber, 10); i++) {
      serials.push(`${prefix.toUpperCase()}${padSerial(i, padLen)}`);
    }
    query.serialNumber = { $in: serials };
  } else {
    throw new ApiError(400, 'Please provide either a batchId, serial range, or select all HQ stock.');
  }

  const existingCards = await Card.find(query);
  if (existingCards.length === 0) {
    throw new ApiError(404, 'No matching cards found in database for the given range/batch.');
  }

  const assignedCards = existingCards.filter(
    (c) => c.status !== CARD_STATUS.AVAILABLE || c.currentOwnerType !== CARD_OWNER_TYPES.HEADQUARTERS
  );

  if (assignedCards.length > 0) {
    throw new ApiError(
      400,
      `Cannot delete batch: ${assignedCards.length} cards in this selection are already assigned to partners or installed! Only unassigned AVAILABLE HQ stock can be deleted.`
    );
  }

  const cardIds = existingCards.map((c) => c._id);
  const deleteResult = await Card.deleteMany({ _id: { $in: cardIds } });
  await CardHistory.deleteMany({ cardId: { $in: cardIds } });

  return {
    deletedCount: deleteResult.deletedCount,
    firstSerial: existingCards[0]?.serialNumber,
    lastSerial: existingCards[existingCards.length - 1]?.serialNumber,
    message: `Successfully purged ${deleteResult.deletedCount} cards from stock.`,
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
    partnerOnly = '',
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
    if (queryParams.scope === 'SUB_FRANCHISE' || queryParams.ownerScope === 'SUB_FRANCHISE') {
      const subPartners = await FranchisePartner.find({ parentPartnerId: authPartner._id }).select('_id').lean();
      const subPartnerIds = subPartners.map((p) => p._id);
      filter.currentOwnerId = { $in: subPartnerIds };
    } else {
      // Franchise Partner can only view cards in their custody
      filter.currentOwnerId = authPartner._id;
    }
  } else {
    // Super Admin explicit owner filter
    if (ownerId) {
      if (ownerId === 'HQ' || ownerId === 'HEADQUARTERS') {
        filter.currentOwnerType = CARD_OWNER_TYPES.HEADQUARTERS;
      } else if (ownerId === 'PARTNERS' || ownerId === 'PARTNER') {
        filter.currentOwnerId = { $ne: null };
      } else if (mongoose.Types.ObjectId.isValid(ownerId)) {
        filter.currentOwnerId = new mongoose.Types.ObjectId(ownerId);
      }
    }
    if (partnerOnly === 'true' || partnerOnly === true) {
      filter.currentOwnerId = { $ne: null };
    }
  }

  // Status Filter
  if (status && Object.values(CARD_STATUS).includes(status.toUpperCase())) {
    if (status.toUpperCase() === 'TRANSFERRED') {
      filter.$or = [
        { status: CARD_STATUS.TRANSFERRED },
        { previousOwnerId: { $ne: null } },
      ];
    } else {
      filter.status = status.toUpperCase();
    }
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

    const isSpecificOwner =
      filter.currentOwnerId &&
      !(typeof filter.currentOwnerId === 'object' && ('$ne' in filter.currentOwnerId || '$in' in filter.currentOwnerId));

    if (isSpecificOwner) {
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

// 4.5. Get Grouped Card Ranges (Summary of serial number ranges per partner / territory / status)
export const getCardRanges = async (queryParams, currentUser, authPartner) => {
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
    partnerOnly = '',
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 25));

  const filter = {};

  if (currentUser.role !== USER_ROLES.SUPER_ADMIN) {
    if (!authPartner) {
      throw new ApiError(403, 'Partner profile required to access inventory.');
    }
    filter.currentOwnerId = authPartner._id;
  } else {
    if (ownerId) {
      if (ownerId === 'HQ' || ownerId === 'HEADQUARTERS') {
        filter.currentOwnerType = CARD_OWNER_TYPES.HEADQUARTERS;
      } else if (ownerId === 'PARTNERS' || ownerId === 'PARTNER') {
        filter.currentOwnerId = { $ne: null };
      } else if (mongoose.Types.ObjectId.isValid(ownerId)) {
        filter.currentOwnerId = new mongoose.Types.ObjectId(ownerId);
      }
    }
    if (partnerOnly === 'true' || partnerOnly === true) {
      filter.currentOwnerId = { $ne: null };
    }
  }

  // Status Filter
  if (status && Object.values(CARD_STATUS).includes(status.toUpperCase())) {
    if (status.toUpperCase() === 'TRANSFERRED') {
      filter.$or = [
        { status: CARD_STATUS.TRANSFERRED },
        { previousOwnerId: { $ne: null } },
      ];
    } else {
      filter.status = status.toUpperCase();
    }
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

    const isSpecificOwner =
      filter.currentOwnerId &&
      !(typeof filter.currentOwnerId === 'object' && ('$ne' in filter.currentOwnerId || '$in' in filter.currentOwnerId));

    if (isSpecificOwner) {
      if (!partnerIds.some((id) => id.equals(filter.currentOwnerId))) {
        return { ranges: [], pagination: { total: 0, totalCards: 0, page: pageNum, limit: limitNum, totalPages: 0 } };
      }
    } else {
      filter.currentOwnerId = { $in: partnerIds };
    }
  }

  // Search by Serial Number, Partner Name, or Franchise ID
  if (search && search.trim()) {
    const cleanSearch = search.trim();
    const searchRegex = new RegExp(cleanSearch, 'i');

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

  // Fetch all matching cards to group contiguous ranges
  const cards = await Card.find(filter)
    .populate({
      path: 'currentOwnerId',
      select: 'franchiseId fullName franchiseType state district city mobileNumber email accountStatus',
    })
    .populate({
      path: 'assignedBy',
      select: 'fullName email role',
    })
    .lean();

  if (!cards || cards.length === 0) {
    return {
      ranges: [],
      pagination: {
        total: 0,
        totalCards: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0,
      },
    };
  }

  // Helper to parse serial number
  const parseSerial = (serial) => {
    const match = String(serial || '').match(/^([A-Za-z_-]*?)(\d+)$/);
    if (match) {
      return {
        prefix: match[1].toUpperCase(),
        num: parseInt(match[2], 10),
        padLength: match[2].length,
        isNumeric: true,
      };
    }
    return {
      prefix: serial || '',
      num: 0,
      padLength: 0,
      isNumeric: false,
    };
  };

  // Sort cards systematically by Owner -> Status -> Assigned Date -> Prefix -> Number
  cards.sort((a, b) => {
    const ownerA = a.currentOwnerId?._id?.toString() || (a.currentOwnerType === 'HEADQUARTERS' ? 'HQ' : 'NONE');
    const ownerB = b.currentOwnerId?._id?.toString() || (b.currentOwnerType === 'HEADQUARTERS' ? 'HQ' : 'NONE');
    if (ownerA !== ownerB) return ownerA.localeCompare(ownerB);

    if (a.status !== b.status) return a.status.localeCompare(b.status);

    const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    if (dateA !== dateB) return dateB - dateA;

    const parsedA = parseSerial(a.serialNumber);
    const parsedB = parseSerial(b.serialNumber);

    if (parsedA.prefix !== parsedB.prefix) return parsedA.prefix.localeCompare(parsedB.prefix);
    if (parsedA.isNumeric && parsedB.isNumeric) return parsedA.num - parsedB.num;

    return a.serialNumber.localeCompare(b.serialNumber);
  });

  // Group into contiguous serial number ranges
  const allRanges = [];
  let currentRange = null;

  for (const card of cards) {
    const parsed = parseSerial(card.serialNumber);
    const ownerIdStr = card.currentOwnerId?._id?.toString() || (card.currentOwnerType === 'HEADQUARTERS' ? 'HQ' : 'NONE');
    const assignedDateStr = card.assignedAt ? new Date(card.assignedAt).toISOString().split('T')[0] : 'NONE';

    const canExtend =
      currentRange &&
      currentRange.ownerKey === ownerIdStr &&
      currentRange.status === card.status &&
      currentRange.assignedDateKey === assignedDateStr &&
      parsed.isNumeric &&
      currentRange.isNumeric &&
      parsed.prefix === currentRange.prefix &&
      parsed.num === currentRange.lastNum + 1;

    if (canExtend) {
      currentRange.endSerial = card.serialNumber;
      currentRange.lastNum = parsed.num;
      currentRange.totalCards += 1;
      currentRange.cardIds.push(card._id);
      currentRange.serials.push(card.serialNumber);
    } else {
      if (currentRange) {
        allRanges.push(currentRange);
      }

      currentRange = {
        rangeId: `${card.serialNumber}-${card._id}`,
        startSerial: card.serialNumber,
        endSerial: card.serialNumber,
        prefix: parsed.prefix,
        startNum: parsed.num,
        lastNum: parsed.num,
        isNumeric: parsed.isNumeric,
        totalCards: 1,
        status: card.status,
        ownerKey: ownerIdStr,
        assignedDateKey: assignedDateStr,
        currentOwnerType: card.currentOwnerType,
        currentOwner: card.currentOwnerId || null,
        assignedAt: card.assignedAt || card.createdAt,
        assignedBy: card.assignedBy || null,
        batchId: card.batchId || null,
        notes: card.notes || '',
        cardIds: [card._id],
        serials: [card.serialNumber],
        firstCardId: card._id,
      };
    }
  }

  if (currentRange) {
    allRanges.push(currentRange);
  }

  // Consolidate ranges per partner:
  // Show only the LATEST stock assigned by admin on the main table per partner,
  // and preserve the full historical breakdown in `history` for viewing via "View".
  const consolidatedRanges = [];
  const partnerRangesMap = new Map();

  for (const rng of allRanges) {
    const isHQ = rng.currentOwnerType === 'HEADQUARTERS' || !rng.currentOwner;
    if (isHQ) {
      // HQ warehouse stock ranges remain individual contiguous ranges
      consolidatedRanges.push(rng);
    } else {
      const ownerId = rng.ownerKey;
      if (!partnerRangesMap.has(ownerId)) {
        partnerRangesMap.set(ownerId, []);
      }
      partnerRangesMap.get(ownerId).push(rng);
    }
  }

  for (const [ownerId, ownerRanges] of partnerRangesMap.entries()) {
    // Sort this partner's ranges by assigned date descending, then serial numbers descending
    ownerRanges.sort((a, b) => {
      const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
      if (dateA !== dateB) return dateB - dateA;
      return (b.lastNum || 0) - (a.lastNum || 0);
    });

    const latestRange = ownerRanges[0];
    const totalPartnerCards = ownerRanges.reduce((sum, r) => sum + r.totalCards, 0);
    const allCardIds = ownerRanges.flatMap((r) => r.cardIds || []);
    const allSerials = ownerRanges.flatMap((r) => r.serials || []);

    consolidatedRanges.push({
      ...latestRange,
      rangeId: `partner-${ownerId}-${latestRange.rangeId}`,
      isConsolidatedPartner: true,
      partnerTotalCards: totalPartnerCards,
      totalAllotments: ownerRanges.length,
      history: ownerRanges, // Complete history of all batches given to this partner
      allCardIds,
      allSerials,
    });
  }

  // Sort consolidated ranges descending by assigned date
  consolidatedRanges.sort((a, b) => {
    const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
    const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
    return dateB - dateA;
  });

  const totalRanges = consolidatedRanges.length;
  const skip = (pageNum - 1) * limitNum;
  const paginatedRanges = consolidatedRanges.slice(skip, skip + limitNum);

  return {
    ranges: paginatedRanges,
    pagination: {
      total: totalRanges,
      totalCards: cards.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalRanges / limitNum) || 1,
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
    const subFranchisePartners = await FranchisePartner.find({ franchiseType: 'SUB_FRANCHISE' }).distinct('_id');
    const [
      totalCards,
      availableCards,
      assignedCards,
      transferredCards,
      installedCards,
      blockedCards,
      mainFranchiseCards,
      subFranchiseCards,
      franchiseToSubTransactions,
      subFranchiseCustomerInstallations,
    ] = await Promise.all([
      Card.countDocuments(),
      Card.countDocuments({ status: CARD_STATUS.AVAILABLE }),
      Card.countDocuments({ status: CARD_STATUS.ASSIGNED, previousOwnerId: null }),
      Card.countDocuments({
        $or: [
          { status: CARD_STATUS.TRANSFERRED },
          { previousOwnerId: { $ne: null } },
        ],
      }),
      Card.countDocuments({ status: CARD_STATUS.INSTALLED }),
      Card.countDocuments({ status: CARD_STATUS.BLOCKED }),
      Card.countDocuments({ currentOwnerId: { $ne: null, $nin: subFranchisePartners } }),
      Card.countDocuments({ currentOwnerId: { $in: subFranchisePartners } }),
      Transaction.find({
        sellerPartnerId: { $ne: null },
        buyerPartnerId: { $in: subFranchisePartners },
        status: { $in: ['CONFIRMED', 'PENDING_CONFIRMATION'] },
      }).select('totalAmount pricePerCard quantity paidQuantity').sort({ createdAt: -1 }),
      Installation.find({
        partnerId: { $in: subFranchisePartners },
        customerConfirmationStatus: CONFIRMATION_STATUS.CONFIRMED,
      }).select('totalAmount pricePerCard installedCardCount cardSerialNumbers').lean(),
    ]);

    // 1. Calculate Franchise -> Sub-Franchise quotation values (4th Card)
    const subFranchiseAllotmentValue = franchiseToSubTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );
    const quotationRate = franchiseToSubTransactions[0]?.pricePerCard || 2400;
    const franchiseCardsNetValue = (mainFranchiseCards || 0) * quotationRate;
    const totalNetworkQuotationValue = ((mainFranchiseCards || 0) + (subFranchiseCards || 0)) * quotationRate;

    // 2. Calculate Sub-Franchise -> Customer installation quotation values (5th Card)
    const subFranchiseInstallations = subFranchiseCustomerInstallations || [];
    const subFranchiseCustomerNetValue = subFranchiseInstallations.reduce(
      (sum, inst) => sum + (inst.totalAmount || 0),
      0
    );
    const subFranchiseInstalledCardsCount = subFranchiseInstallations.reduce(
      (sum, inst) => sum + (inst.installedCardCount || inst.cardSerialNumbers?.length || 0),
      0
    );
    const customerQuotationRate = subFranchiseInstallations[0]?.pricePerCard || 3000;

    return {
      total: totalCards,
      available: availableCards,
      assigned: assignedCards,
      transferred: transferredCards,
      installed: installedCards,
      blocked: blockedCards,
      franchiseCards: mainFranchiseCards,
      subFranchiseCards: subFranchiseCards || 0,
      netValue: subFranchiseAllotmentValue || ((subFranchiseCards || 0) * quotationRate),
      quotationRate,
      subFranchiseCustomerNetValue,
      subFranchiseInstalledCardsCount,
      customerQuotationRate,
      franchiseCardsNetValue,
      totalNetworkQuotationValue,
    };
  } else {
    // Partner-specific counts
    if (!authPartner) {
      throw new ApiError(403, 'Partner profile required.');
    }

    // Sub-franchises under this partner
    const subPartners = await FranchisePartner.find({ parentPartnerId: authPartner._id }).select('_id').lean();
    const subPartnerIds = subPartners.map((s) => s._id);

    const [
      inPossessionTotal,
      availableCards,
      transferredCards,
      installedCards,
      blockedCards,
      partnerTransactions,
      firstCard,
      lastCard,
      subFranchiseCardsCount,
      subFranchiseInstalledCount,
      partnerCustomersCount,
      subCustomersCount,
      subTransactions,
    ] = await Promise.all([
      Card.countDocuments({ currentOwnerId: authPartner._id }),
      Card.countDocuments({ currentOwnerId: authPartner._id, status: { $in: [CARD_STATUS.ASSIGNED, CARD_STATUS.AVAILABLE] } }),
      Card.countDocuments({ previousOwnerId: authPartner._id }),
      Card.countDocuments({ currentOwnerId: authPartner._id, status: CARD_STATUS.INSTALLED }),
      Card.countDocuments({ currentOwnerId: authPartner._id, status: CARD_STATUS.BLOCKED }),
      Transaction.find({
        $or: [
          { sellerPartnerId: authPartner._id },
          { buyerPartnerId: authPartner._id },
        ],
        status: { $in: ['CONFIRMED', 'PENDING_CONFIRMATION'] },
      }).select('totalAmount pricePerCard quantity paidQuantity').sort({ createdAt: -1 }),
      Card.findOne({ currentOwnerId: authPartner._id }).sort({ serialNumber: 1 }).select('serialNumber').lean(),
      Card.findOne({ currentOwnerId: authPartner._id }).sort({ serialNumber: -1 }).select('serialNumber').lean(),
      subPartnerIds.length > 0
        ? Card.countDocuments({ currentOwnerId: { $in: subPartnerIds } })
        : Promise.resolve(0),
      subPartnerIds.length > 0
        ? Card.countDocuments({ currentOwnerId: { $in: subPartnerIds }, status: CARD_STATUS.INSTALLED })
        : Promise.resolve(0),
      Customer.countDocuments({ createdByPartnerId: authPartner._id }),
      subPartnerIds.length > 0
        ? Customer.countDocuments({ createdByPartnerId: { $in: subPartnerIds } })
        : Promise.resolve(0),
      subPartnerIds.length > 0
        ? Transaction.find({
            sellerPartnerId: authPartner._id,
            buyerPartnerId: { $in: subPartnerIds },
            status: { $in: ['CONFIRMED', 'PENDING_CONFIRMATION'] },
          }).select('totalAmount pricePerCard quantity paidQuantity').sort({ createdAt: -1 })
        : Promise.resolve([]),
    ]);

    const effectiveTransferred = transferredCards || subFranchiseCardsCount || 0;
    const partnerQuotationTotal = partnerTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0
    );
    const partnerQuotationRate = partnerTransactions[0]?.pricePerCard || 1200;
    const partnerNetValue = partnerQuotationTotal || (inPossessionTotal * partnerQuotationRate);

    // Sub-Franchise calculations
    const subAvailableStock = Math.max(0, subFranchiseCardsCount - subFranchiseInstalledCount);
    const subQuotationTotal = (subTransactions || []).reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const subQuotationRate = subTransactions[0]?.pricePerCard || 2400;
    const subNetValue = subQuotationTotal || (subFranchiseCardsCount * subQuotationRate);

    const totalCustomers = partnerCustomersCount + subCustomersCount;
    const totalAllottedStock = inPossessionTotal + effectiveTransferred + installedCards;
    const myAvailableStock = Math.max(0, inPossessionTotal - installedCards);

    return {
      total: totalAllottedStock,
      totalAllotted: totalAllottedStock,
      totalReceived: totalAllottedStock,
      available: availableCards,
      assigned: inPossessionTotal,
      transferred: effectiveTransferred,
      transferredToSubs: effectiveTransferred,
      subFranchisesCount: subPartnerIds.length,
      installed: installedCards,
      pending: myAvailableStock,
      myAvailableStock: myAvailableStock,
      subFranchiseAvailableStock: subAvailableStock,
      subFranchiseTotalCards: subFranchiseCardsCount,
      subFranchiseInstalledCards: subFranchiseInstalledCount,
      customers: totalCustomers,
      partnerCustomers: partnerCustomersCount,
      subCustomers: subCustomersCount,
      myNetValue: partnerNetValue,
      subFranchiseNetValue: subNetValue,
      subQuotationRate,
      blocked: blockedCards,
      franchiseCards: inPossessionTotal,
      subFranchiseCards: subFranchiseCardsCount,
      netValue: partnerNetValue,
      quotationRate: partnerQuotationRate,
      franchiseCardsNetValue: inPossessionTotal * partnerQuotationRate,
      totalNetworkQuotationValue: (inPossessionTotal + subFranchiseCardsCount) * partnerQuotationRate,
      startSerial: firstCard?.serialNumber || '',
      endSerial: lastCard?.serialNumber || '',
      batchCount: partnerTransactions.length || 1,
    };
  }
};

// 9. Preview Card Allocation before Assigning to Partner
export const previewAssignCards = async (allocationParams) => {
  const { partnerId, prefix = 'VS', startNumber, endNumber, paddingLength = 6, serialNumbers = [] } = allocationParams;

  if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
    throw new ApiError(400, 'A valid Franchise Partner ID is required.');
  }

  const partner = await FranchisePartner.findById(partnerId);
  if (!partner) {
    throw new ApiError(404, 'Franchise Partner not found.');
  }

  if (partner.accountStatus !== 'ACTIVE') {
    throw new ApiError(400, `Cannot assign cards to ${partner.fullName}: Account status is ${partner.accountStatus}.`);
  }

  // Hierarchy Rule: Super Admin distributes cards only to Franchise Partners (State/District). Sub-Franchises receive cards from their parent Franchise Partner.
  if (partner.franchiseType === 'SUB_FRANCHISE' || partner.parentPartnerId) {
    throw new ApiError(
      400,
      `Cannot assign stock directly to Sub-Franchise (${partner.fullName}). Sub-Franchise partners must receive card stock distributed by their parent Franchise Partner.`
    );
  }


  // Resolve target serial numbers
  let targetSerials = [];
  if (serialNumbers && Array.isArray(serialNumbers) && serialNumbers.length > 0) {
    targetSerials = serialNumbers.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
  } else if (startNumber !== undefined && endNumber !== undefined) {
    const start = parseInt(startNumber, 10);
    const end = parseInt(endNumber, 10);
    if (isNaN(start) || isNaN(end) || start <= 0 || start > end) {
      throw new ApiError(400, 'Invalid start and end serial range.');
    }
    for (let i = start; i <= end; i++) {
      targetSerials.push(`${prefix.trim().toUpperCase()}${padSerial(i, paddingLength)}`);
    }
  } else {
    throw new ApiError(400, 'Specify either a serial number range or a list of serial numbers.');
  }

  if (targetSerials.length === 0) {
    throw new ApiError(400, 'No valid serial numbers provided for allocation.');
  }

  // Query database for requested cards
  const existingCards = await Card.find({
    serialNumber: { $in: targetSerials },
  }).select('serialNumber status currentOwnerType currentOwnerId');

  const foundMap = new Map();
  existingCards.forEach((c) => foundMap.set(c.serialNumber, c));

  const availableSerials = [];
  const unavailableSerials = [];
  const missingSerials = [];

  for (let s of targetSerials) {
    const card = foundMap.get(s);
    if (!card) {
      missingSerials.push(s);
      unavailableSerials.push({ serialNumber: s, reason: 'Card does not exist in inventory' });
    } else if (card.status !== CARD_STATUS.AVAILABLE) {
      unavailableSerials.push({ serialNumber: s, reason: `Status is currently ${card.status}` });
    } else {
      availableSerials.push(s);
    }
  }

  return {
    partner: {
      _id: partner._id,
      fullName: partner.fullName,
      franchiseId: partner.franchiseId,
      franchiseType: partner.franchiseType,
      state: partner.state,
      district: partner.district,
      mobileNumber: partner.mobileNumber,
    },
    requestedCount: targetSerials.length,
    availableCount: availableSerials.length,
    unavailableCount: unavailableSerials.length,
    availableSerials: availableSerials.slice(0, 10),
    unavailableSerials,
    firstSerial: targetSerials[0],
    lastSerial: targetSerials[targetSerials.length - 1],
    isValid: unavailableSerials.length === 0 && availableSerials.length > 0,
  };
};

// 10. Assign Cards Stock to Franchise Partner (Super Admin)
export const assignCardsToPartner = async (allocationParams, modifierUser) => {
  const { partnerId, prefix = 'VS', startNumber, endNumber, paddingLength = 6, serialNumbers = [], notes = '' } = allocationParams;

  if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
    throw new ApiError(400, 'A valid Franchise Partner ID is required.');
  }

  const partner = await FranchisePartner.findById(partnerId);
  if (!partner) {
    throw new ApiError(404, 'Franchise Partner not found.');
  }

  if (partner.accountStatus !== 'ACTIVE') {
    throw new ApiError(400, `Cannot assign cards to partner because status is ${partner.accountStatus}.`);
  }

  // Hierarchy Rule: Super Admin distributes cards only to Franchise Partners (State/District). Sub-Franchises receive cards from their parent Franchise Partner.
  if (partner.franchiseType === 'SUB_FRANCHISE' || partner.parentPartnerId) {
    throw new ApiError(
      400,
      `Cannot assign stock directly to Sub-Franchise (${partner.fullName}). Sub-Franchise partners must receive card stock distributed by their parent Franchise Partner.`
    );
  }


  // Resolve target serial numbers
  let targetSerials = [];
  if (serialNumbers && Array.isArray(serialNumbers) && serialNumbers.length > 0) {
    targetSerials = serialNumbers.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
  } else if (startNumber !== undefined && endNumber !== undefined) {
    const start = parseInt(startNumber, 10);
    const end = parseInt(endNumber, 10);
    if (isNaN(start) || isNaN(end) || start <= 0 || start > end) {
      throw new ApiError(400, 'Invalid start and end serial range.');
    }
    for (let i = start; i <= end; i++) {
      targetSerials.push(`${prefix.trim().toUpperCase()}${padSerial(i, paddingLength)}`);
    }
  } else {
    throw new ApiError(400, 'Specify either a serial number range or a list of serial numbers.');
  }

  // Fetch all matching cards
  const cards = await Card.find({
    serialNumber: { $in: targetSerials },
  });

  if (cards.length !== targetSerials.length) {
    const foundSet = new Set(cards.map((c) => c.serialNumber));
    const missing = targetSerials.filter((s) => !foundSet.has(s));
    throw new ApiError(
      400,
      `Cannot assign: ${missing.length} cards do not exist in the inventory (${missing.slice(0, 5).join(', ')}).`
    );
  }

  // Check that ALL cards are in AVAILABLE status
  const nonAvailable = cards.filter((c) => c.status !== CARD_STATUS.AVAILABLE);
  if (nonAvailable.length > 0) {
    const details = nonAvailable.map((c) => `${c.serialNumber} (${c.status})`).slice(0, 10);
    throw new ApiError(
      400,
      `Cannot assign: ${nonAvailable.length} cards are not in AVAILABLE status (${details.join(', ')}).`
    );
  }

  const assignmentDate = new Date();

  // Bulk update all cards
  await Card.updateMany(
    { _id: { $in: cards.map((c) => c._id) } },
    {
      $set: {
        status: CARD_STATUS.ASSIGNED,
        currentOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
        currentOwnerId: partner._id,
        assignedBy: modifierUser._id,
        assignedAt: assignmentDate,
        previousOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
        previousOwnerId: null,
        notes: notes ? notes.trim() : `Allocated to ${partner.fullName} (${partner.franchiseId})`,
      },
    }
  );

  // Bulk create immutable audit trail records
  const historyDocs = cards.map((card) => ({
    cardId: card._id,
    serialNumber: card.serialNumber,
    action: CARD_ACTIONS.ASSIGNED,
    fromOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
    fromOwnerId: null,
    toOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
    toOwnerId: partner._id,
    previousStatus: CARD_STATUS.AVAILABLE,
    newStatus: CARD_STATUS.ASSIGNED,
    performedBy: modifierUser._id,
    performedByRole: modifierUser.role,
    reason: notes ? notes.trim() : `Allocated stock to ${partner.fullName} (${partner.franchiseId} - ${partner.district}, ${partner.state})`,
    timestamp: assignmentDate,
  }));

  await CardHistory.insertMany(historyDocs, { ordered: false });

  // Dispatch celebratory in-app notification for the partner
  if (partner.userId) {
    try {
      await createNotification({
        recipientUserId: partner.userId,
        recipientPartnerId: partner._id,
        type: NOTIFICATION_TYPES.CARD_RECEIVED,
        title: '🎉 Stock Allotted: New Cards Added!',
        message: `Admin has successfully allotted ${cards.length} smart energy cards (${targetSerials[0]} - ${targetSerials[targetSerials.length - 1]}) to your inventory!`,
        entityType: ENTITY_TYPES.CARD,
        entityId: partner.franchiseId,
        metadata: {
          assignedCount: cards.length,
          firstSerial: targetSerials[0],
          lastSerial: targetSerials[targetSerials.length - 1],
          assignedAt: assignmentDate,
          assignedBy: modifierUser.name || 'Central HQ Admin',
          district: partner.district,
          state: partner.state,
        },
      });
    } catch (notifErr) {
      console.error('Failed to create card allotment notification:', notifErr?.message || notifErr);
    }
  }

  return {
    assignedCount: cards.length,
    partner: {
      _id: partner._id,
      fullName: partner.fullName,
      franchiseId: partner.franchiseId,
      franchiseType: partner.franchiseType,
      district: partner.district,
      state: partner.state,
    },
    firstSerial: targetSerials[0],
    lastSerial: targetSerials[targetSerials.length - 1],
  };
};

// 11. Partner-Wise Card Distribution Breakdown (Who has how many cards & how many remain)
export const getPartnerDistributionBreakdown = async (queryParams) => {
  const { state = '', district = '', search = '', franchiseType = '' } = queryParams;

  // 1. Overall System Stock Overview
  const [totalCards, availableAtHQ, totalAssigned, totalTransferred, totalInstalled, totalBlocked] =
    await Promise.all([
      Card.countDocuments(),
      Card.countDocuments({ status: CARD_STATUS.AVAILABLE, currentOwnerType: CARD_OWNER_TYPES.HEADQUARTERS }),
      Card.countDocuments({ status: CARD_STATUS.ASSIGNED, previousOwnerId: null }),
      Card.countDocuments({
        $or: [
          { status: CARD_STATUS.TRANSFERRED },
          { previousOwnerId: { $ne: null } },
        ],
      }),
      Card.countDocuments({ status: CARD_STATUS.INSTALLED }),
      Card.countDocuments({ status: CARD_STATUS.BLOCKED }),
    ]);

  // 2. Fetch partners
  const partnerFilter = { accountStatus: 'ACTIVE' };
  if (state) partnerFilter.state = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
  if (franchiseType && franchiseType.trim()) {
    const trimmed = franchiseType.trim();
    if (trimmed === 'MAIN_FRANCHISE' || trimmed === 'FRANCHISE_PARTNER') {
      partnerFilter.franchiseType = { $ne: 'SUB_FRANCHISE' };
    } else if (trimmed === 'DISTRICT_FRANCHISE') {
      partnerFilter.franchiseType = {
        $in: [
          'DISTRICT_FRANCHISE',
          'PREMIUM_EXCLUSIVE_DISTRICT',
          'STANDARD_EXCLUSIVE_DISTRICT',
          'NON_EXCLUSIVE_DISTRICT',
        ],
      };
    } else {
      partnerFilter.franchiseType = trimmed;
    }
  }

  if (search && search.trim()) {
    const reg = new RegExp(search.trim(), 'i');
    partnerFilter.$or = [{ fullName: reg }, { franchiseId: reg }, { mobileNumber: reg }];
  }

  const partners = await FranchisePartner.find(partnerFilter)
    .select('fullName franchiseId franchiseType state district mobileNumber email parentPartnerId')
    .populate('parentPartnerId', 'fullName franchiseId mobileNumber')
    .sort({ state: 1, district: 1 });

  // 3. Fetch ONLY Franchise Partner -> Sub-Franchise Partner Quotation Transactions
  const subFranchisePartnerIds = await FranchisePartner.find({ franchiseType: 'SUB_FRANCHISE' }).distinct('_id');
  const franchiseToSubTxns = await Transaction.find({
    sellerPartnerId: { $ne: null },
    buyerPartnerId: { $in: subFranchisePartnerIds },
    status: { $in: ['CONFIRMED', 'PENDING_CONFIRMATION'] },
  })
    .populate('sellerPartnerId', 'fullName franchiseId mobileNumber district state franchiseType')
    .populate('buyerPartnerId', 'fullName franchiseId mobileNumber district state franchiseType')
    .sort({ createdAt: -1 })
    .select('transactionId buyerPartnerId sellerPartnerId pricePerCard totalAmount quantity paidQuantity createdAt');

  // 4. Aggregate cards and quotation values per partner
  const partnerDistribution = await Promise.all(
    partners.map(async (p) => {
      const [assignedCount, installedCount, blockedCount, sampleCards] = await Promise.all([
        Card.countDocuments({ currentOwnerId: p._id, status: { $in: [CARD_STATUS.ASSIGNED, CARD_STATUS.TRANSFERRED] } }),
        Card.countDocuments({ currentOwnerId: p._id, status: CARD_STATUS.INSTALLED }),
        Card.countDocuments({ currentOwnerId: p._id, status: CARD_STATUS.BLOCKED }),
        Card.find({ currentOwnerId: p._id }).sort({ createdAt: 1 }).limit(5).select('serialNumber status'),
      ]);

      const totalOwned = assignedCount + installedCount + blockedCount;

      // Check for Franchise -> Sub-Franchise quotation data
      const isSub = p.franchiseType === 'SUB_FRANCHISE';
      let quotationRate = 0;
      let quotationTotal = 0;
      let quotationTxnId = null;
      let quotationDate = null;
      let hasSubFranchiseQuotation = false;
      let relatedPartner = null;
      let subCardsAssigned = 0;

      if (isSub) {
        // Find transaction where this sub-franchise received cards from Franchise Partner
        const matchingTxns = franchiseToSubTxns.filter((t) => {
          const bId = t.buyerPartnerId?._id ? t.buyerPartnerId._id.toString() : t.buyerPartnerId?.toString();
          return bId === p._id.toString();
        });
        if (matchingTxns.length > 0) {
          hasSubFranchiseQuotation = true;
          quotationRate = matchingTxns[0].pricePerCard || 0;
          quotationTotal = matchingTxns.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
          subCardsAssigned = matchingTxns.reduce((sum, t) => sum + (t.quantity || 0), 0);
          quotationTxnId = matchingTxns[0].transactionId;
          quotationDate = matchingTxns[0].createdAt;
          if (matchingTxns[0].sellerPartnerId) {
            relatedPartner = {
              fullName: matchingTxns[0].sellerPartnerId.fullName,
              franchiseId: matchingTxns[0].sellerPartnerId.franchiseId,
              mobileNumber: matchingTxns[0].sellerPartnerId.mobileNumber,
              district: matchingTxns[0].sellerPartnerId.district,
              state: matchingTxns[0].sellerPartnerId.state,
              relationship: 'Assigned By Franchise Partner',
            };
          }
        }
      } else {
        // Partner is a Franchise Partner: find transactions where he assigned cards to Sub-Franchises
        const matchingTxns = franchiseToSubTxns.filter((t) => {
          const sId = t.sellerPartnerId?._id ? t.sellerPartnerId._id.toString() : t.sellerPartnerId?.toString();
          return sId === p._id.toString();
        });
        if (matchingTxns.length > 0) {
          hasSubFranchiseQuotation = true;
          quotationRate = matchingTxns[0].pricePerCard || 0;
          quotationTotal = matchingTxns.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
          subCardsAssigned = matchingTxns.reduce((sum, t) => sum + (t.quantity || 0), 0);
          quotationTxnId = matchingTxns[0].transactionId;
          quotationDate = matchingTxns[0].createdAt;
          if (matchingTxns[0].buyerPartnerId) {
            relatedPartner = {
              fullName: matchingTxns[0].buyerPartnerId.fullName,
              franchiseId: matchingTxns[0].buyerPartnerId.franchiseId,
              mobileNumber: matchingTxns[0].buyerPartnerId.mobileNumber,
              district: matchingTxns[0].buyerPartnerId.district,
              state: matchingTxns[0].buyerPartnerId.state,
              relationship: 'Assigned To Sub-Franchise',
            };
          }
        }
      }

      return {
        partnerId: p._id,
        fullName: p.fullName,
        franchiseId: p.franchiseId,
        franchiseType: p.franchiseType,
        parentPartner: p.parentPartnerId ? {
          fullName: p.parentPartnerId.fullName,
          franchiseId: p.parentPartnerId.franchiseId,
          mobileNumber: p.parentPartnerId.mobileNumber,
        } : null,
        state: p.state,
        district: p.district,
        mobileNumber: p.mobileNumber,
        email: p.email,
        totalCardsPossessed: totalOwned,
        activeStockCount: assignedCount,
        installedCount,
        blockedCount,
        sampleSerials: sampleCards.map((c) => c.serialNumber),
        quotationRate,
        quotationTotal,
        quotationTxnId,
        quotationDate,
        hasSubFranchiseQuotation,
        subCardsAssigned,
        relatedPartner,
      };
    })
  );

  const totalSubFranchiseQuotationValue = franchiseToSubTxns.reduce(
    (sum, t) => sum + (t.totalAmount || 0),
    0
  );
  const latestQuotationRate = franchiseToSubTxns[0]?.pricePerCard || 2400;
  const totalSubFranchiseCardsAssigned = franchiseToSubTxns.reduce(
    (sum, t) => sum + (t.quantity || 0),
    0
  );

  const subFranchiseQuotations = franchiseToSubTxns.map((t) => ({
    _id: t._id,
    transactionId: t.transactionId,
    franchisePartner: t.sellerPartnerId
      ? {
          _id: t.sellerPartnerId._id,
          fullName: t.sellerPartnerId.fullName,
          franchiseId: t.sellerPartnerId.franchiseId,
          franchiseType: t.sellerPartnerId.franchiseType,
          district: t.sellerPartnerId.district,
          state: t.sellerPartnerId.state,
          mobileNumber: t.sellerPartnerId.mobileNumber,
        }
      : null,
    subFranchisePartner: t.buyerPartnerId
      ? {
          _id: t.buyerPartnerId._id,
          fullName: t.buyerPartnerId.fullName,
          franchiseId: t.buyerPartnerId.franchiseId,
          franchiseType: t.buyerPartnerId.franchiseType,
          district: t.buyerPartnerId.district,
          state: t.buyerPartnerId.state,
          mobileNumber: t.buyerPartnerId.mobileNumber,
        }
      : null,
    cardsAssigned: t.quantity || 0,
    quotationRate: t.pricePerCard || 0,
    totalAmount: t.totalAmount || 0,
    status: t.status,
    createdAt: t.createdAt,
  }));

  // 5. Fetch Sub-Franchise -> Customer Quotation Installations (Cards given to customers after quotation)
  const customerInstallations = await Installation.find({
    partnerId: { $in: subFranchisePartnerIds },
    customerConfirmationStatus: CONFIRMATION_STATUS.CONFIRMED,
  })
    .populate('partnerId', 'fullName franchiseId mobileNumber district state franchiseType parentPartnerId')
    .populate('customerId', 'fullName mobileNumber email customerType address')
    .sort({ createdAt: -1 })
    .lean();

  const subFranchiseCustomerQuotations = customerInstallations.map((inst) => ({
    _id: inst._id,
    installationId: inst.installationId,
    subFranchisePartner: inst.partnerId
      ? {
          _id: inst.partnerId._id,
          fullName: inst.partnerId.fullName,
          franchiseId: inst.partnerId.franchiseId,
          mobileNumber: inst.partnerId.mobileNumber,
          district: inst.partnerId.district,
          state: inst.partnerId.state,
        }
      : null,
    customer: {
      _id: inst.customerId?._id,
      fullName: inst.customerId?.fullName || 'Customer',
      mobileNumber: inst.customerId?.mobileNumber || '',
      customerType: inst.customerType || inst.customerId?.customerType || 'RESIDENTIAL',
      address: inst.installationAddress || inst.customerId?.address || {},
    },
    cardsInstalled: inst.installedCardCount || inst.cardSerialNumbers?.length || 0,
    cardSerialNumbers: inst.cardSerialNumbers || [],
    pricePerCard: inst.pricePerCard || 0,
    totalAmount: inst.totalAmount || 0,
    installationDateTime: inst.installationDateTime || inst.createdAt,
    verificationStatus: inst.verificationStatus || 'CONFIRMED',
    customerConfirmationStatus: inst.customerConfirmationStatus || 'CONFIRMED',
  }));

  const subFranchiseCustomerNetValue = subFranchiseCustomerQuotations.reduce(
    (sum, inst) => sum + (inst.totalAmount || 0),
    0
  );
  const subFranchiseCustomerCardsCount = subFranchiseCustomerQuotations.reduce(
    (sum, inst) => sum + (inst.cardsInstalled || 0),
    0
  );
  const latestCustomerRate = subFranchiseCustomerQuotations[0]?.pricePerCard || 3000;

  return {
    overview: {
      totalCards,
      warehouseAvailable: availableAtHQ,
      distributedToPartners: totalAssigned + totalTransferred,
      installedCustomers: totalInstalled,
      blockedQC: totalBlocked,
      subFranchiseQuotationValue: totalSubFranchiseQuotationValue,
      quotationRate: latestQuotationRate,
      totalSubFranchiseCardsAssigned,
      subFranchiseCustomerNetValue,
      subFranchiseCustomerCardsCount,
      customerQuotationRate: latestCustomerRate,
    },
    partners: partnerDistribution,
    subFranchiseQuotations,
    subFranchiseCustomerQuotations,
  };
};


