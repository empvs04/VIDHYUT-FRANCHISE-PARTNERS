import express from 'express';
import {
  getNextSerial,
  previewBatch,
  createBatch,
  createManual,
  deleteCard,
  deleteBatchStock,
  getAllCards,
  getRanges,
  getSingleCard,
  getSingleCardHistory,
  changeCardStatus,
  getStats,
  previewAssign,
  assignStock,
  getPartnerDistribution,
} from '../../controllers/card.controller.js';

import {
  validateBatchCards,
  validateManualCards,
  validateUpdateCardStatus,
} from '../../validators/card.validator.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

// All card routes require valid authentication
router.use(protect);

// 0. Next Serial Suggestion (Super Admin only)
router.get(
  '/next-serial',
  authorize(USER_ROLES.SUPER_ADMIN),
  getNextSerial
);

// 1. Statistics
router.get(
  '/stats',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  getStats
);

// 2. Batch Creation & Preview (Super Admin only)
router.post(
  '/preview-batch',
  authorize(USER_ROLES.SUPER_ADMIN),
  validateBatchCards,
  previewBatch
);


router.post(
  '/batch',
  authorize(USER_ROLES.SUPER_ADMIN),
  validateBatchCards,
  createBatch
);

// 3. Manual List Creation (Super Admin only)
router.post(
  '/manual',
  authorize(USER_ROLES.SUPER_ADMIN),
  validateManualCards,
  createManual
);

// 3.5 Delete Single Card (Super Admin only)
router.delete(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN),
  deleteCard
);

// 3.6 Batch Delete Cards by Range / Batch ID (Super Admin only)
router.delete(
  '/batch/purge',
  authorize(USER_ROLES.SUPER_ADMIN),
  deleteBatchStock
);


// 4. Partner Stock Distribution Breakdown (Super Admin)
router.get(
  '/partner-distribution',
  authorize(USER_ROLES.SUPER_ADMIN),
  getPartnerDistribution
);

// 5. Partner Allocation & Preview (Super Admin only)
router.post(
  '/preview-assign',
  authorize(USER_ROLES.SUPER_ADMIN),
  previewAssign
);

router.post(
  '/assign',
  authorize(USER_ROLES.SUPER_ADMIN),
  assignStock
);

// 5.5 Grouped Card Ranges (Summary of serial number batches per partner/territory)
router.get(
  '/ranges',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  getRanges
);

// 6. Directory & Search
router.get(
  '/',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  getAllCards
);

// 5. Single Card Details
router.get(
  '/:id',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  getSingleCard
);

// 6. Card History / Immutable Audit Trail
router.get(
  '/:id/history',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE,
    USER_ROLES.FRANCHISE_PARTNER
  ),
  getSingleCardHistory
);

// 7. Status Management (Super Admin only)
router.patch(
  '/:id/status',
  authorize(USER_ROLES.SUPER_ADMIN),
  validateUpdateCardStatus,
  changeCardStatus
);

export default router;
