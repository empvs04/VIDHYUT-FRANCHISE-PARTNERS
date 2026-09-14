import mongoose from 'mongoose';
import { ApiError } from '../utils/apiError.js';
import {
  TRANSACTION_TYPES,
  DISPUTE_REASONS,
} from '../config/constants.js';

export const validateCreateTransaction = (req, res, next) => {
  const {
    buyerPartnerId,
    toPartnerId,
    partnerId,
    transactionType = TRANSACTION_TYPES.SALE,
    cardSerialNumbers = [],
    cardIds = [],
    pricePerCard = 0,
    notes = '',
  } = req.body;

  const targetPartnerId = buyerPartnerId || toPartnerId || partnerId;

  if (!targetPartnerId || !mongoose.Types.ObjectId.isValid(targetPartnerId)) {
    return next(new ApiError(400, 'A valid Receiving / Buyer Partner ID is required.'));
  }

  if (!Object.values(TRANSACTION_TYPES).includes(transactionType)) {
    return next(
      new ApiError(
        400,
        `Invalid transaction type. Supported types: ${Object.values(TRANSACTION_TYPES).join(', ')}`
      )
    );
  }

  const serials = Array.isArray(cardSerialNumbers)
    ? cardSerialNumbers.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
    : [];

  const ids = Array.isArray(cardIds)
    ? cardIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
    : [];

  if (serials.length === 0 && ids.length === 0) {
    return next(
      new ApiError(400, 'Please select at least one card serial number or ID for distribution.')
    );
  }

  const parsedPrice = parseFloat(pricePerCard);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    return next(new ApiError(400, 'Price per card must be a valid positive number or zero.'));
  }

  const parsedFreeQuantity = Math.max(0, parseInt(req.body.freeQuantity, 10) || 0);

  if (transactionType === TRANSACTION_TYPES.SALE && parsedPrice <= 0 && parsedFreeQuantity === 0) {
    return next(
      new ApiError(400, 'For a SALE transaction, a valid Price Per Card (greater than ₹0) is required.')
    );
  }

  req.validatedTransaction = {
    buyerPartnerId: targetPartnerId,
    transactionType,
    cardSerialNumbers: serials,
    cardIds: ids,
    pricePerCard: transactionType === TRANSACTION_TYPES.SALE ? parsedPrice : 0,
    freeQuantity: parsedFreeQuantity,
    notes: notes ? String(notes).trim() : '',
  };

  next();
};

export const validateDisputeTransaction = (req, res, next) => {
  const { disputeReason, disputeComments = '' } = req.body;

  if (!disputeReason || !String(disputeReason).trim()) {
    return next(
      new ApiError(
        400,
        `A dispute reason is required. Available reasons: ${Object.values(DISPUTE_REASONS).join(', ')}`
      )
    );
  }

  req.validatedDispute = {
    disputeReason: String(disputeReason).trim(),
    disputeComments: disputeComments ? String(disputeComments).trim() : '',
  };

  next();
};

export const validateCancelTransaction = (req, res, next) => {
  const { cancelReason = '' } = req.body;

  req.validatedCancel = {
    cancelReason: cancelReason ? String(cancelReason).trim() : 'Cancelled by user',
  };

  next();
};

export const validatePaymentProof = (req, res, next) => {
  const { paymentReference, paymentProofUrl = '', paymentProofNotes = '' } = req.body;

  if (!paymentReference || !String(paymentReference).trim()) {
    return next(
      new ApiError(
        400,
        'Payment Reference number (e.g. UTR Number, Bank Reference, or Cheque Number) is required.'
      )
    );
  }

  req.validatedProof = {
    paymentReference: String(paymentReference).trim().toUpperCase(),
    paymentProofUrl: paymentProofUrl ? String(paymentProofUrl).trim() : '',
    paymentProofNotes: paymentProofNotes ? String(paymentProofNotes).trim() : '',
  };

  next();
};

export const validatePaymentDecision = (req, res, next) => {
  const { rejectionReason = '' } = req.body;

  req.validatedDecision = {
    rejectionReason: rejectionReason ? String(rejectionReason).trim() : '',
  };

  next();
};
