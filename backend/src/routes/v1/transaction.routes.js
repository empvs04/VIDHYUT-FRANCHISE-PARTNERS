import express from 'express';
import {
  createTransaction,
  getAllTransactions,
  getSingleTransaction,
  confirmTransfer,
  disputeTransfer,
  cancelTransfer,
  submitProof,
  verifyProof,
  rejectProof,
  getStats,
  getMyAvailableStock,
} from '../../controllers/transaction.controller.js';
import {
  validateCreateTransaction,
  validateDisputeTransaction,
  validateCancelTransaction,
  validatePaymentProof,
  validatePaymentDecision,
} from '../../validators/transaction.validator.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

// All transaction routes require valid JWT authentication
router.use(protect);

// 1. Transaction Summary Statistics
router.get(
  ['/stats', '/stats/summary'],
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  getStats
);

// 2. Helper: Get Partner's Available Cards for Distribution
router.get(
  '/my-available-cards',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  getMyAvailableStock
);

// 3. Create Distribution Transaction
router.post(
  '/',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  validateCreateTransaction,
  createTransaction
);

// 4. Get Transactions List
router.get(
  '/',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  getAllTransactions
);

// 5. Get Single Transaction Detail
router.get(
  '/:id',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  getSingleTransaction
);

// 6. Confirm Transaction Receipt (Buyer Partner)
router.post(
  '/:id/confirm',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  confirmTransfer
);

// 7. Dispute Transaction (Buyer Partner)
router.post(
  '/:id/dispute',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  validateDisputeTransaction,
  disputeTransfer
);

// 8. Cancel Transaction (Seller or Super Admin)
router.post(
  '/:id/cancel',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  validateCancelTransaction,
  cancelTransfer
);

// 9. Submit Payment Reference & Proof
router.post(
  '/:id/payment-proof',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  validatePaymentProof,
  submitProof
);

// 10. Super Admin: Verify Payment Proof
router.patch(
  '/:id/verify-payment',
  authorize(USER_ROLES.SUPER_ADMIN),
  verifyProof
);

// 11. Super Admin: Reject Payment Proof
router.patch(
  '/:id/reject-payment',
  authorize(USER_ROLES.SUPER_ADMIN),
  validatePaymentDecision,
  rejectProof
);

export default router;
