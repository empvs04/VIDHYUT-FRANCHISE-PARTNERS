import express from 'express';
import { getAdminMetrics, getPartnerSummary } from '../../controllers/dashboard.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

router.use(protect);

router.get('/admin-metrics', authorize(USER_ROLES.SUPER_ADMIN), getAdminMetrics);
router.get('/partner-summary', authorize(USER_ROLES.FRANCHISE_PARTNER), getPartnerSummary);

export default router;
