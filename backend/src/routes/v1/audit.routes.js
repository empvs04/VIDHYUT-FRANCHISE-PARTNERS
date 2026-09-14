import express from 'express';
import {
  getAllAuditLogs,
  getEntityAuditHistory,
} from '../../controllers/audit.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

router.use(protect);

// Global audit logs are strictly Super Admin only
router.get('/', authorize(USER_ROLES.SUPER_ADMIN), getAllAuditLogs);
router.get('/entity/:entityType/:entityId', authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE), getEntityAuditHistory);

export default router;
