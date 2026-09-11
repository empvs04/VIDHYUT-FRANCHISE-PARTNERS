import express from 'express';
import {
  createPartner,
  getAllPartners,
  getPartnerById,
  getPartnerHierarchy,
  getEligibleParents,
  updatePartner,
  togglePartnerStatus,
  previewFranchiseId,
  verifyGovDocumentLive,
  scanUploadedDocument,
} from '../../controllers/partner.controller.js';
import {
  validateCreatePartner,
  validateUpdatePartner,
} from '../../validators/partner.validator.js';
import { protect } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { enforceTerritoryScope } from '../../middlewares/territory.middleware.js';
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

// All partner routes require valid JWT
router.use(protect);

// Utility & Pre-creation Validation endpoints
router.get(
  '/preview-id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE, USER_ROLES.DISTRICT_FRANCHISE),
  previewFranchiseId
);

router.post(
  '/verify-gov-id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE, USER_ROLES.DISTRICT_FRANCHISE),
  verifyGovDocumentLive
);

router.post(
  '/scan-document',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE, USER_ROLES.DISTRICT_FRANCHISE),
  scanUploadedDocument
);

router.get(
  '/eligible-parents',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE, USER_ROLES.DISTRICT_FRANCHISE),
  getEligibleParents
);

// Directory & CRUD endpoints
router.get(
  '/',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE, USER_ROLES.DISTRICT_FRANCHISE, USER_ROLES.FRANCHISE_PARTNER),
  getAllPartners
);

router.post(
  '/',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE, USER_ROLES.DISTRICT_FRANCHISE),
  enforceTerritoryScope,
  validateCreatePartner,
  createPartner
);

router.get('/:id', getPartnerById);
router.get('/:id/hierarchy', getPartnerHierarchy);

router.put(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.STATE_FRANCHISE, USER_ROLES.DISTRICT_FRANCHISE),
  validateUpdatePartner,
  updatePartner
);

router.patch(
  '/:id/status',
  authorize(USER_ROLES.SUPER_ADMIN),
  togglePartnerStatus
);

export default router;
