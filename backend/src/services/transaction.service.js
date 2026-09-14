import mongoose from 'mongoose';
import Transaction from '../models/Transaction.model.js';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiError } from '../utils/apiError.js';
import { generateTransactionId } from '../utils/idGenerator.js';
import {
  USER_ROLES,
  FRANCHISE_TYPES,
  ACCOUNT_STATUS,
  CARD_STATUS,
  CARD_ACTIONS,
  CARD_OWNER_TYPES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  PAYMENT_STATUS,
  DEFAULT_PAGINATION,
} from '../config/constants.js';

// 1. Create Card Distribution / Transfer Transaction
export const createDistributionTransaction = async (data, user, partner) => {
  const {
    buyerPartnerId,
    transactionType = TRANSACTION_TYPES.SALE,
    cardSerialNumbers = [],
    cardIds = [],
    pricePerCard = 0,
    notes = '',
  } = data;

  // 1. Resolve Seller Partner
  let sellerPartner = null;
  let sellerPartnerId = null;

  if (user.role === USER_ROLES.SUPER_ADMIN) {
    if (data.sellerPartnerId && mongoose.Types.ObjectId.isValid(data.sellerPartnerId)) {
      sellerPartner = await FranchisePartner.findById(data.sellerPartnerId);
      if (!sellerPartner) throw new ApiError(404, 'Specified seller partner not found.');
      sellerPartnerId = sellerPartner._id;
    } else {
      // Super Admin distributing on behalf of an active partner or HQ
      if (partner) {
        sellerPartner = partner;
        sellerPartnerId = partner._id;
      }
    }
  } else {
    // Logged in as Franchise Partner
    if (!partner) {
      throw new ApiError(403, 'Franchise Partner profile required to initiate card distribution.');
    }
    sellerPartner = partner;
    sellerPartnerId = partner._id;
  }

  if (sellerPartner && sellerPartner.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    throw new ApiError(
      400,
      `Cannot initiate distribution: Seller partner status is ${sellerPartner.accountStatus}.`
    );
  }

  // 2. Resolve Buyer Partner
  const buyerPartner = await FranchisePartner.findById(buyerPartnerId);
  if (!buyerPartner) {
    throw new ApiError(404, 'Receiving / Buyer Franchise Partner not found.');
  }

  if (buyerPartner.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    throw new ApiError(
      400,
      `Cannot transfer cards to ${buyerPartner.fullName}: Account status is ${buyerPartner.accountStatus}.`
    );
  }

  if (sellerPartner && String(sellerPartner._id) === String(buyerPartner._id)) {
    throw new ApiError(400, 'Seller and Buyer cannot be the same franchise partner.');
  }

  // 3. Territory & Hierarchy Authorization Check
  if (sellerPartner && user.role !== USER_ROLES.SUPER_ADMIN) {
    if (sellerPartner.franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE) {
      // District Franchise can only distribute to Sub-Franchises in their district/state or direct children
      const isDirectChild =
        buyerPartner.parentPartnerId &&
        String(buyerPartner.parentPartnerId) === String(sellerPartner._id);
      const isSameTerritory =
        buyerPartner.state.toLowerCase() === sellerPartner.state.toLowerCase() &&
        buyerPartner.district.toLowerCase() === sellerPartner.district.toLowerCase() &&
        buyerPartner.franchiseType === FRANCHISE_TYPES.SUB_FRANCHISE;

      if (!isDirectChild && !isSameTerritory) {
        throw new ApiError(
          403,
          `Territory Restriction: As District Franchise for ${sellerPartner.district}, you cannot transfer cards to ${buyerPartner.fullName} (${buyerPartner.district}, ${buyerPartner.state}).`
        );
      }
    } else if (sellerPartner.franchiseType === FRANCHISE_TYPES.STATE_FRANCHISE) {
      // State Franchise can only distribute within the authorized state
      if (buyerPartner.state.toLowerCase() !== sellerPartner.state.toLowerCase()) {
        throw new ApiError(
          403,
          `Territory Restriction: State Franchise for ${sellerPartner.state} cannot transfer cards outside state to ${buyerPartner.state}.`
        );
      }
    }
  }

  // 4. Resolve Target Cards & Verify Ownership
  const cardQuery = {};
  if (cardSerialNumbers && cardSerialNumbers.length > 0) {
    cardQuery.serialNumber = { $in: cardSerialNumbers };
  } else if (cardIds && cardIds.length > 0) {
    cardQuery._id = { $in: cardIds };
  } else {
    throw new ApiError(400, 'No valid cards selected for transfer.');
  }

  const cards = await Card.find(cardQuery);
  const targetCount = cardSerialNumbers.length > 0 ? cardSerialNumbers.length : cardIds.length;

  if (cards.length !== targetCount) {
    throw new ApiError(
      400,
      `Card selection mismatch: Found ${cards.length} cards in inventory for ${targetCount} requested.`
    );
  }

  // 5. Strict Card Security & Double-Allocation Verification
  for (const card of cards) {
    // Ownership check
    if (sellerPartnerId) {
      if (!card.currentOwnerId || String(card.currentOwnerId) !== String(sellerPartnerId)) {
        throw new ApiError(
          403,
          `Ownership conflict: Card "${card.serialNumber}" does not belong to ${sellerPartner.fullName}.`
        );
      }
    } else {
      if (card.currentOwnerType !== CARD_OWNER_TYPES.HEADQUARTERS) {
        throw new ApiError(
          400,
          `Card "${card.serialNumber}" is not currently in Central HQ Stock.`
        );
      }
    }

    // Status check
    if (card.status === CARD_STATUS.PENDING_TRANSFER) {
      throw new ApiError(
        400,
        `Double-Allocation blocked: Card "${card.serialNumber}" is already reserved in another pending transaction.`
      );
    }

    if (card.status === CARD_STATUS.INSTALLED) {
      throw new ApiError(
        400,
        `Card "${card.serialNumber}" cannot be transferred because it is already INSTALLED with a customer.`
      );
    }

    if (card.status === CARD_STATUS.BLOCKED) {
      throw new ApiError(
        400,
        `Card "${card.serialNumber}" is currently BLOCKED / on QC Hold and cannot be distributed.`
      );
    }
  }

  // 6. Recalculate Total on Backend
  const quantity = cards.length;
  const verifiedPricePerCard =
    transactionType === TRANSACTION_TYPES.SALE ? Math.max(0, parseFloat(pricePerCard) || 0) : 0;
  const totalAmount = quantity * verifiedPricePerCard;

  // 7. Generate Unique Transaction ID
  let transactionId;
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 10) {
    transactionId = generateTransactionId(transactionType);
    const existing = await Transaction.findOne({ transactionId });
    if (!existing) isUnique = true;
    attempts++;
  }

  const transactionDate = new Date();

  // 8. Create Transaction Record (Direct & Instant Card Allocation)
  const newTransaction = await Transaction.create({
    transactionId,
    transactionType,
    sellerPartnerId: sellerPartner ? sellerPartner._id : (data.sellerPartnerId || null),
    buyerPartnerId: buyerPartner._id,
    cardIds: cards.map((c) => c._id),
    cardSerialNumbers: cards.map((c) => c.serialNumber),
    quantity,
    pricePerCard: verifiedPricePerCard,
    totalAmount,
    currency: 'INR',
    status: TRANSACTION_STATUS.CONFIRMED,
    confirmedAt: transactionDate,
    confirmedBy: user._id,
    paymentStatus: PAYMENT_STATUS.PAID,
    createdBy: user._id,
    notes,
  });

  // 9. Immediately Transfer Ownership into Recipient Partner Inventory
  const finalCardStatus = sellerPartner ? CARD_STATUS.TRANSFERRED : CARD_STATUS.ASSIGNED;

  await Card.updateMany(
    { _id: { $in: cards.map((c) => c._id) } },
    {
      $set: {
        status: finalCardStatus,
        currentOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
        currentOwnerId: buyerPartner._id,
        assignedBy: user._id,
        assignedAt: transactionDate,
        previousOwnerId: sellerPartner ? sellerPartner._id : null,
        previousOwnerType: sellerPartner ? CARD_OWNER_TYPES.FRANCHISE_PARTNER : CARD_OWNER_TYPES.HEADQUARTERS,
        notes: `Allocated directly to ${buyerPartner.fullName} (${buyerPartner.franchiseId}) @ ₹${verifiedPricePerCard}/card via Txn ${transactionId}`,
      },
    }
  );

  // 10. Write Immutable Audit Trail Records
  const historyRecords = cards.map((card) => ({
    cardId: card._id,
    serialNumber: card.serialNumber,
    action: sellerPartner ? CARD_ACTIONS.TRANSFERRED : CARD_ACTIONS.ASSIGNED_TO_PARTNER,
    fromOwnerType: sellerPartner ? CARD_OWNER_TYPES.FRANCHISE_PARTNER : CARD_OWNER_TYPES.HEADQUARTERS,
    fromOwnerId: sellerPartner ? sellerPartner._id : null,
    toOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
    toOwnerId: buyerPartner._id,
    previousStatus: card.status,
    newStatus: finalCardStatus,
    performedBy: user._id,
    performedByRole: user.role,
    reason: `Direct card allocation to ${buyerPartner.fullName} (${buyerPartner.franchiseId}) by ${user.fullName} (${quantity} cards @ ₹${verifiedPricePerCard}/card, Total ₹${totalAmount}). Serial: ${card.serialNumber}. Txn: ${transactionId}`,
    metadata: {
      transactionId,
      transactionType,
      pricePerCard: verifiedPricePerCard,
      totalAmount,
      serialNumber: card.serialNumber,
    },
    timestamp: transactionDate,
  }));

  await CardHistory.insertMany(historyRecords, { ordered: false });

  return newTransaction;
};

// 2. Get All Transactions with Filters, Pagination & RBAC Scope
export const getTransactions = async (queryParams, user, partner) => {
  const {
    page = DEFAULT_PAGINATION.PAGE,
    limit = DEFAULT_PAGINATION.LIMIT,
    search = '',
    status = '',
    transactionType = '',
    paymentStatus = '',
    direction = '', // 'incoming', 'outgoing', or ''
    startDate = '',
    endDate = '',
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const query = {};

  // RBAC Scope
  if (user.role !== USER_ROLES.SUPER_ADMIN) {
    if (!partner) {
      throw new ApiError(403, 'Partner context missing.');
    }
    if (direction === 'incoming') {
      query.buyerPartnerId = partner._id;
    } else if (direction === 'outgoing') {
      query.sellerPartnerId = partner._id;
    } else {
      query.$or = [{ sellerPartnerId: partner._id }, { buyerPartnerId: partner._id }];
    }
  } else {
    if (direction === 'incoming' && queryParams.partnerId) {
      query.buyerPartnerId = queryParams.partnerId;
    } else if (direction === 'outgoing' && queryParams.partnerId) {
      query.sellerPartnerId = queryParams.partnerId;
    }
  }

  // Territory & Partner Level Filters
  const { state = '', district = '', franchiseType = '' } = queryParams;
  if (state || district || franchiseType) {
    const partnerFilter = {};
    if (state) partnerFilter.state = new RegExp(`^${state.trim()}$`, 'i');
    if (district) partnerFilter.district = new RegExp(`^${district.trim()}$`, 'i');
    if (franchiseType) partnerFilter.franchiseType = franchiseType;

    const matchingPartners = await FranchisePartner.find(partnerFilter).select('_id');
    const matchingPartnerIds = matchingPartners.map((p) => p._id);

    const territoryCondition = [
      { buyerPartnerId: { $in: matchingPartnerIds } },
      { sellerPartnerId: { $in: matchingPartnerIds } },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: territoryCondition }];
      delete query.$or;
    } else {
      query.$or = territoryCondition;
    }
  }

  // Filters
  if (status) query.status = status;
  if (transactionType) query.transactionType = transactionType;
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

  if (search && search.trim()) {
    const reg = new RegExp(search.trim(), 'i');
    const searchConditions = [
      { transactionId: reg },
      { cardSerialNumbers: { $elemMatch: { $regex: reg } } },
      { paymentReference: reg },
      { notes: reg },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchConditions }];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  const [total, transactions] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.find(query)
      .populate('sellerPartnerId', 'fullName franchiseId franchiseType state district mobileNumber email')
      .populate('buyerPartnerId', 'fullName franchiseId franchiseType state district mobileNumber email')
      .populate('createdBy', 'fullName email role')
      .populate('confirmedBy', 'fullName email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
  ]);

  return {
    transactions,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasNextPage: pageNum * limitNum < total,
      hasPrevPage: pageNum > 1,
    },
  };
};

// 3. Get Single Transaction Details with Audit Trail & Card Serials
export const getTransactionById = async (transactionId, user, partner) => {
  let transaction;
  if (mongoose.Types.ObjectId.isValid(transactionId)) {
    transaction = await Transaction.findById(transactionId);
  }
  if (!transaction) {
    transaction = await Transaction.findOne({ transactionId: transactionId.toUpperCase().trim() });
  }

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found.');
  }

  // RBAC Permission check
  if (user.role !== USER_ROLES.SUPER_ADMIN) {
    if (!partner) throw new ApiError(403, 'Permission denied.');
    const isSeller = String(transaction.sellerPartnerId) === String(partner._id);
    const isBuyer = String(transaction.buyerPartnerId) === String(partner._id);
    if (!isSeller && !isBuyer) {
      throw new ApiError(403, 'You are not authorized to view this transaction.');
    }
  }

  await transaction.populate([
    { path: 'sellerPartnerId', select: 'fullName franchiseId franchiseType state district mobileNumber email city addressLine1' },
    { path: 'buyerPartnerId', select: 'fullName franchiseId franchiseType state district mobileNumber email city addressLine1' },
    { path: 'createdBy', select: 'fullName email role' },
    { path: 'confirmedBy', select: 'fullName email role' },
    { path: 'disputedBy', select: 'fullName email role' },
    { path: 'cancelledBy', select: 'fullName email role' },
    { path: 'paymentVerifiedBy', select: 'fullName email role' },
  ]);

  // Fetch card details
  const cards = await Card.find({ _id: { $in: transaction.cardIds } }).select(
    'serialNumber status currentOwnerId assignedAt'
  );

  return {
    transaction,
    cards,
  };
};

// 4. Confirm Transaction (Buyer Partner / Receiver Confirmation)
export const confirmTransaction = async (transactionId, user, partner) => {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found.');
  }

  if (transaction.status !== TRANSACTION_STATUS.PENDING_CONFIRMATION) {
    throw new ApiError(
      400,
      `Cannot confirm transaction: Current status is already ${transaction.status}.`
    );
  }

  // Only Buyer partner (or Super Admin) can confirm
  if (user.role !== USER_ROLES.SUPER_ADMIN) {
    if (!partner || String(transaction.buyerPartnerId) !== String(partner._id)) {
      throw new ApiError(403, 'Only the receiving / buyer partner can confirm receipt of this stock.');
    }
  }

  const buyer = await FranchisePartner.findById(transaction.buyerPartnerId);
  const seller = await FranchisePartner.findById(transaction.sellerPartnerId);

  // Fetch and verify cards
  const cards = await Card.find({ _id: { $in: transaction.cardIds } });
  if (cards.length !== transaction.cardIds.length) {
    throw new ApiError(400, 'Cards belonging to this transaction could not be located in database.');
  }

  const nonPending = cards.filter((c) => c.status !== CARD_STATUS.PENDING_TRANSFER);
  if (nonPending.length > 0) {
    throw new ApiError(
      400,
      `Cannot confirm: ${nonPending.length} card(s) are no longer reserved in pending transfer state.`
    );
  }

  const confirmDate = new Date();

  // 1. Atomic Update: Transfer Card Ownership to Buyer
  await Card.updateMany(
    { _id: { $in: transaction.cardIds } },
    {
      $set: {
        status: CARD_STATUS.TRANSFERRED,
        currentOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
        currentOwnerId: buyer._id,
        previousOwnerId: seller ? seller._id : null,
        previousOwnerType: seller ? CARD_OWNER_TYPES.FRANCHISE_PARTNER : CARD_OWNER_TYPES.HEADQUARTERS,
        assignedBy: user._id,
        assignedAt: confirmDate,
        notes: `Stock confirmed & received from ${seller ? seller.fullName : 'HQ'} via Txn ${transaction.transactionId}`,
      },
    }
  );

  // 2. Update Transaction Status
  transaction.status = TRANSACTION_STATUS.CONFIRMED;
  transaction.confirmedBy = user._id;
  transaction.confirmedAt = confirmDate;
  await transaction.save();

  // 3. Create Immutable Audit Records in CardHistory
  const historyRecords = cards.map((card) => ({
    cardId: card._id,
    serialNumber: card.serialNumber,
    action: CARD_ACTIONS.TRANSFER_CONFIRMED,
    fromOwnerType: seller ? CARD_OWNER_TYPES.FRANCHISE_PARTNER : CARD_OWNER_TYPES.HEADQUARTERS,
    fromOwnerId: seller ? seller._id : null,
    toOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
    toOwnerId: buyer._id,
    previousStatus: CARD_STATUS.PENDING_TRANSFER,
    newStatus: CARD_STATUS.TRANSFERRED,
    performedBy: user._id,
    performedByRole: user.role,
    reason: `Receipt confirmed by ${user.fullName} (${buyer.fullName} - ${buyer.franchiseId}). Ownership transferred. Txn: ${transaction.transactionId}`,
    metadata: {
      transactionId: transaction.transactionId,
      totalAmount: transaction.totalAmount,
      pricePerCard: transaction.pricePerCard,
    },
    timestamp: confirmDate,
  }));

  await CardHistory.insertMany(historyRecords, { ordered: false });

  return transaction;
};

// 5. Dispute Transaction (Buyer disputes receipt with reason)
export const disputeTransaction = async (transactionId, disputeData, user, partner) => {
  const { disputeReason, disputeComments } = disputeData;

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw new ApiError(404, 'Transaction not found.');

  if (transaction.status !== TRANSACTION_STATUS.PENDING_CONFIRMATION) {
    throw new ApiError(
      400,
      `Cannot dispute transaction: Current status is already ${transaction.status}.`
    );
  }

  // Only Buyer partner (or Super Admin) can dispute
  if (user.role !== USER_ROLES.SUPER_ADMIN) {
    if (!partner || String(transaction.buyerPartnerId) !== String(partner._id)) {
      throw new ApiError(403, 'Only the receiving partner can dispute this transaction.');
    }
  }

  const disputeDate = new Date();
  const seller = await FranchisePartner.findById(transaction.sellerPartnerId);
  const cards = await Card.find({ _id: { $in: transaction.cardIds } });

  // 1. Unlock cards and revert status back to Seller's active stock
  await Card.updateMany(
    { _id: { $in: transaction.cardIds } },
    {
      $set: {
        status: seller ? CARD_STATUS.ASSIGNED : CARD_STATUS.AVAILABLE,
        notes: `Transfer disputed by buyer. Reason: ${disputeReason}. Txn: ${transaction.transactionId}`,
      },
    }
  );

  // 2. Update Transaction
  transaction.status = TRANSACTION_STATUS.DISPUTED;
  transaction.disputeReason = disputeReason;
  transaction.disputeComments = disputeComments || '';
  transaction.disputedBy = user._id;
  transaction.disputedAt = disputeDate;
  await transaction.save();

  // 3. Write CardHistory Audit Trail
  const historyRecords = cards.map((card) => ({
    cardId: card._id,
    serialNumber: card.serialNumber,
    action: CARD_ACTIONS.TRANSFER_DISPUTED,
    fromOwnerType: seller ? CARD_OWNER_TYPES.FRANCHISE_PARTNER : CARD_OWNER_TYPES.HEADQUARTERS,
    fromOwnerId: seller ? seller._id : null,
    toOwnerType: seller ? CARD_OWNER_TYPES.FRANCHISE_PARTNER : CARD_OWNER_TYPES.HEADQUARTERS,
    toOwnerId: seller ? seller._id : null,
    previousStatus: CARD_STATUS.PENDING_TRANSFER,
    newStatus: seller ? CARD_STATUS.ASSIGNED : CARD_STATUS.AVAILABLE,
    performedBy: user._id,
    performedByRole: user.role,
    reason: `Transfer disputed by ${user.fullName}. Reason: ${disputeReason}${disputeComments ? ` (${disputeComments})` : ''}. Cards unlocked back to seller. Txn: ${transaction.transactionId}`,
    metadata: {
      transactionId: transaction.transactionId,
      disputeReason,
    },
    timestamp: disputeDate,
  }));

  await CardHistory.insertMany(historyRecords, { ordered: false });

  return transaction;
};

// 6. Cancel Transaction (Seller or Super Admin cancels pending transaction)
export const cancelTransaction = async (transactionId, cancelData, user, partner) => {
  const { cancelReason } = cancelData;

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw new ApiError(404, 'Transaction not found.');

  if (transaction.status !== TRANSACTION_STATUS.PENDING_CONFIRMATION) {
    throw new ApiError(
      400,
      `Cannot cancel transaction: Current status is already ${transaction.status}.`
    );
  }

  // Only Seller partner (or Super Admin) can cancel
  if (user.role !== USER_ROLES.SUPER_ADMIN) {
    if (!partner || String(transaction.sellerPartnerId) !== String(partner._id)) {
      throw new ApiError(403, 'Only the initiating seller partner or Super Admin can cancel this transaction.');
    }
  }

  const cancelDate = new Date();
  const seller = await FranchisePartner.findById(transaction.sellerPartnerId);
  const cards = await Card.find({ _id: { $in: transaction.cardIds } });

  // 1. Unlock cards back to Seller
  await Card.updateMany(
    { _id: { $in: transaction.cardIds } },
    {
      $set: {
        status: seller ? CARD_STATUS.ASSIGNED : CARD_STATUS.AVAILABLE,
        notes: `Transfer cancelled. Reason: ${cancelReason}. Txn: ${transaction.transactionId}`,
      },
    }
  );

  // 2. Update Transaction
  transaction.status = TRANSACTION_STATUS.CANCELLED;
  transaction.cancelReason = cancelReason || 'Cancelled by initiator';
  transaction.cancelledBy = user._id;
  transaction.cancelledAt = cancelDate;
  await transaction.save();

  // 3. Write Audit History
  const historyRecords = cards.map((card) => ({
    cardId: card._id,
    serialNumber: card.serialNumber,
    action: CARD_ACTIONS.TRANSFER_CANCELLED,
    fromOwnerType: seller ? CARD_OWNER_TYPES.FRANCHISE_PARTNER : CARD_OWNER_TYPES.HEADQUARTERS,
    fromOwnerId: seller ? seller._id : null,
    toOwnerType: seller ? CARD_OWNER_TYPES.FRANCHISE_PARTNER : CARD_OWNER_TYPES.HEADQUARTERS,
    toOwnerId: seller ? seller._id : null,
    previousStatus: CARD_STATUS.PENDING_TRANSFER,
    newStatus: seller ? CARD_STATUS.ASSIGNED : CARD_STATUS.AVAILABLE,
    performedBy: user._id,
    performedByRole: user.role,
    reason: `Transfer cancelled by ${user.fullName}. Reason: ${cancelReason}. Cards unlocked back to seller. Txn: ${transaction.transactionId}`,
    metadata: {
      transactionId: transaction.transactionId,
      cancelReason,
    },
    timestamp: cancelDate,
  }));

  await CardHistory.insertMany(historyRecords, { ordered: false });

  return transaction;
};

// 7. Submit Payment Proof (Buyer or Seller submits payment evidence)
export const submitPaymentProof = async (transactionId, proofData, user, partner) => {
  const { paymentReference, paymentProofUrl, paymentProofNotes } = proofData;

  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw new ApiError(404, 'Transaction not found.');

  // Permission check: Must be buyer, seller, or super admin
  if (user.role !== USER_ROLES.SUPER_ADMIN) {
    if (!partner) throw new ApiError(403, 'Permission denied.');
    const isSeller = String(transaction.sellerPartnerId) === String(partner._id);
    const isBuyer = String(transaction.buyerPartnerId) === String(partner._id);
    if (!isSeller && !isBuyer) throw new ApiError(403, 'You are not a participant in this transaction.');
  }

  transaction.paymentReference = paymentReference;
  transaction.paymentProofUrl = paymentProofUrl || '';
  transaction.paymentProofNotes = paymentProofNotes || '';
  transaction.paymentStatus = PAYMENT_STATUS.SUBMITTED;
  transaction.paymentSubmittedAt = new Date();

  await transaction.save();
  return transaction;
};

// 8. Super Admin Payment Verification
export const verifyPayment = async (transactionId, adminUser) => {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw new ApiError(404, 'Transaction not found.');

  transaction.paymentStatus = PAYMENT_STATUS.VERIFIED;
  transaction.paymentVerifiedBy = adminUser._id;
  transaction.paymentVerifiedAt = new Date();
  transaction.paymentRejectionReason = '';

  await transaction.save();
  return transaction;
};

// 9. Super Admin Payment Rejection
export const rejectPayment = async (transactionId, rejectionData, adminUser) => {
  const { rejectionReason = '' } = rejectionData;
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw new ApiError(404, 'Transaction not found.');

  transaction.paymentStatus = PAYMENT_STATUS.REJECTED;
  transaction.paymentRejectionReason = rejectionReason || 'Payment proof rejected by Admin.';
  transaction.paymentVerifiedBy = adminUser._id;
  transaction.paymentVerifiedAt = new Date();

  await transaction.save();
  return transaction;
};

// 10. Get Aggregated Transaction Statistics
export const getTransactionStats = async (user, partner) => {
  const query = {};

  if (user.role !== USER_ROLES.SUPER_ADMIN && partner) {
    query.$or = [{ sellerPartnerId: partner._id }, { buyerPartnerId: partner._id }];
  }

  const [total, pending, confirmed, disputed, cancelled, salesAggregation] = await Promise.all([
    Transaction.countDocuments(query),
    Transaction.countDocuments({ ...query, status: TRANSACTION_STATUS.PENDING_CONFIRMATION }),
    Transaction.countDocuments({ ...query, status: TRANSACTION_STATUS.CONFIRMED }),
    Transaction.countDocuments({ ...query, status: TRANSACTION_STATUS.DISPUTED }),
    Transaction.countDocuments({ ...query, status: TRANSACTION_STATUS.CANCELLED }),
    Transaction.aggregate([
      { $match: { ...query, status: TRANSACTION_STATUS.CONFIRMED, transactionType: TRANSACTION_TYPES.SALE } },
      { $group: { _id: null, totalSalesAmount: { $sum: '$totalAmount' }, totalCardsSold: { $sum: '$quantity' } } },
    ]),
  ]);

  const salesTotal = salesAggregation[0] ? salesAggregation[0].totalSalesAmount : 0;
  const cardsSoldTotal = salesAggregation[0] ? salesAggregation[0].totalCardsSold : 0;

  let incomingPending = 0;
  let outgoingPending = 0;

  if (partner) {
    [incomingPending, outgoingPending] = await Promise.all([
      Transaction.countDocuments({ buyerPartnerId: partner._id, status: TRANSACTION_STATUS.PENDING_CONFIRMATION }),
      Transaction.countDocuments({ sellerPartnerId: partner._id, status: TRANSACTION_STATUS.PENDING_CONFIRMATION }),
    ]);
  }

  return {
    total,
    pending,
    confirmed,
    disputed,
    cancelled,
    totalSalesAmount: salesTotal,
    totalCardsSold: cardsSoldTotal,
    incomingPending,
    outgoingPending,
  };
};

// 11. Helper: Fetch Available Cards for Distribution (HQ Central Stock or Partner Stock)
export const getPartnerAvailableStock = async (partnerId, search = '') => {
  let query = {};

  if (partnerId) {
    query = {
      currentOwnerId: partnerId,
      status: { $in: [CARD_STATUS.ASSIGNED, CARD_STATUS.TRANSFERRED] },
    };
  } else {
    // Super Admin / HQ Central Stock
    query = {
      status: CARD_STATUS.AVAILABLE,
    };
  }

  if (search && search.trim()) {
    query.serialNumber = new RegExp(search.trim(), 'i');
  }

  const cards = await Card.find(query)
    .sort({ serialNumber: 1 })
    .select('_id serialNumber status cardBatchId batchId createdAt assignedAt');
  return cards;
};
