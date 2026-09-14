import { ApiResponse } from '../utils/apiResponse.js';
import {
  createDistributionTransaction,
  getTransactions,
  getTransactionById,
  confirmTransaction,
  disputeTransaction,
  cancelTransaction,
  submitPaymentProof,
  verifyPayment,
  rejectPayment,
  getTransactionStats,
  getPartnerAvailableStock,
} from '../services/transaction.service.js';

// 1. Create Distribution Transaction (Seller Partner or Super Admin)
export const createTransaction = async (req, res, next) => {
  try {
    const result = await createDistributionTransaction(req.validatedTransaction, req.user, req.partner);
    res.status(201).json(
      new ApiResponse(
        201,
        result,
        `Transaction ${result.transactionId} created successfully. ${result.quantity} cards reserved awaiting buyer confirmation.`
      )
    );
  } catch (err) {
    next(err);
  }
};

// 2. Get All Transactions (RBAC Scoped & Filtered)
export const getAllTransactions = async (req, res, next) => {
  try {
    const result = await getTransactions(req.query, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(200, result, 'Transactions retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 3. Get Single Transaction by ID
export const getSingleTransaction = async (req, res, next) => {
  try {
    const result = await getTransactionById(req.params.id, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(200, result, 'Transaction details retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 4. Confirm Transaction Receipt (Buyer Partner)
export const confirmTransfer = async (req, res, next) => {
  try {
    const result = await confirmTransaction(req.params.id, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(
        200,
        result,
        `Transaction ${result.transactionId} confirmed successfully! ${result.quantity} cards transferred into your inventory.`
      )
    );
  } catch (err) {
    next(err);
  }
};

// 5. Dispute Transaction (Buyer Partner)
export const disputeTransfer = async (req, res, next) => {
  try {
    const result = await disputeTransaction(req.params.id, req.validatedDispute, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(
        200,
        result,
        `Transaction ${result.transactionId} disputed. Cards have been unlocked and returned to seller inventory.`
      )
    );
  } catch (err) {
    next(err);
  }
};

// 6. Cancel Transaction (Seller Partner or Super Admin)
export const cancelTransfer = async (req, res, next) => {
  try {
    const result = await cancelTransaction(req.params.id, req.validatedCancel, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(
        200,
        result,
        `Transaction ${result.transactionId} cancelled. Cards unlocked back into seller inventory.`
      )
    );
  } catch (err) {
    next(err);
  }
};

// 7. Submit Payment Proof (Buyer or Seller)
export const submitProof = async (req, res, next) => {
  try {
    const result = await submitPaymentProof(req.params.id, req.validatedProof, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(200, result, 'Payment proof submitted successfully and awaiting admin verification.')
    );
  } catch (err) {
    next(err);
  }
};

// 8. Super Admin Payment Verification
export const verifyProof = async (req, res, next) => {
  try {
    const result = await verifyPayment(req.params.id, req.user);
    res.status(200).json(
      new ApiResponse(200, result, `Payment proof for transaction ${result.transactionId} verified successfully.`)
    );
  } catch (err) {
    next(err);
  }
};

// 9. Super Admin Payment Rejection
export const rejectProof = async (req, res, next) => {
  try {
    const result = await rejectPayment(req.params.id, req.validatedDecision, req.user);
    res.status(200).json(
      new ApiResponse(200, result, `Payment proof for transaction ${result.transactionId} rejected.`)
    );
  } catch (err) {
    next(err);
  }
};

// 10. Get Transaction Summary Statistics
export const getStats = async (req, res, next) => {
  try {
    const stats = await getTransactionStats(req.user, req.partner);
    res.status(200).json(
      new ApiResponse(200, stats, 'Transaction statistics retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 11. Helper: Fetch Available Cards Owned by Partner or HQ for Distribution
export const getMyAvailableStock = async (req, res, next) => {
  try {
    const targetPartnerId = req.partner ? req.partner._id : (req.query.partnerId || null);
    const cards = await getPartnerAvailableStock(targetPartnerId, req.query.search);
    res.status(200).json(
      new ApiResponse(200, { cards, count: cards.length }, 'Available cards for transfer retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};
