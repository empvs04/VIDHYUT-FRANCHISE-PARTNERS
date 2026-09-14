import express from 'express';
import {
  getOverview,
  getRevenue,
  getCardLifecycle,
  getPartnersPerformance,
  getStates,
  getDistricts,
  getGPSQuality,
  getCustomerElectricity,
  getSubFranchiseDistribution,
} from '../../controllers/analytics.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

router.use(protect);

// Analytics endpoints
router.get(
  '/overview',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getOverview
);

router.get(
  '/revenue',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE, USER_ROLES.DISTRICT_FRANCHISE),
  getRevenue
);

router.get(
  '/cards',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getCardLifecycle
);

router.get(
  '/partners',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE, USER_ROLES.DISTRICT_FRANCHISE),
  getPartnersPerformance
);

router.get(
  '/territories/states',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getStates
);

router.get(
  '/territories/districts',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getDistricts
);

router.get(
  '/gps',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getGPSQuality
);

router.get(
  '/customers',
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.STATE_FRANCHISE,
    USER_ROLES.DISTRICT_FRANCHISE,
    USER_ROLES.SUB_FRANCHISE
  ),
  getCustomerElectricity
);

router.get('/sub-franchise-distribution', authorize(USER_ROLES.SUPER_ADMIN), getSubFranchiseDistribution);

export default router;

