import express from 'express';
import {
  createPartner,
  getAllPartners,
  getPartnerById,
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
import { USER_ROLES } from '../../config/constants.js';

const router = express.Router();

// All partner routes require valid JWT
router.use(protect);

// Admin-only Partner Management Routes
router.get('/preview-id', authorize(USER_ROLES.SUPER_ADMIN), previewFranchiseId);
router.post('/verify-gov-id', authorize(USER_ROLES.SUPER_ADMIN), verifyGovDocumentLive);
router.post('/scan-document', authorize(USER_ROLES.SUPER_ADMIN), scanUploadedDocument);
router.get('/', authorize(USER_ROLES.SUPER_ADMIN), getAllPartners);
router.post('/', authorize(USER_ROLES.SUPER_ADMIN), validateCreatePartner, createPartner);
router.get('/:id', getPartnerById); // Admin or Partner viewing profile
router.put('/:id', authorize(USER_ROLES.SUPER_ADMIN), validateUpdatePartner, updatePartner);
router.patch('/:id/status', authorize(USER_ROLES.SUPER_ADMIN), togglePartnerStatus);

export default router;
