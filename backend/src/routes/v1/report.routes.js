import express from 'express';
import {
  getCardMovements,
  getPartnerInventory,
  getInstallations,
  getP2PTransactions,
  getPayments,
  getDisputes,
  auditCardSerial,
  auditCustomerSearch,
  exportReport,
} from '../../controllers/report.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

router.use(protect);

// Tabular Reports Endpoints (RBAC Enforced)
router.get(
  '/card-movements',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getCardMovements
);

router.get(
  '/partner-inventory',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getPartnerInventory
);

router.get(
  '/installations',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getInstallations
);

router.get(
  '/p2p-transactions',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getP2PTransactions
);

router.get(
  '/payments',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getPayments
);
router.get(
  '/disputes',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getDisputes
);

// Audit & Deep Search Endpoints
router.get(
  '/audit/card/:serialNumber',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  auditCardSerial
);

router.get(
  '/audit/customer',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  auditCustomerSearch
);

// CSV Export Endpoint
router.get(
  '/export/:reportType',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  exportReport
);

export default router;
