import express from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import {
  getEligibleCards,
  createInstallation,
  getInstallations,
  getInstallationById,
} from '../../controllers/installation.controller.js';
import {
  verifyLocationHandler,
  getLocationStatsHandler,
  listLocationsHandler,
  getLocationByIdHandler,
  adminReviewLocationHandler,
} from '../../controllers/locationVerification.controller.js';

const router = express.Router();

router.use(protect);

// Location Verification Endpoints
router.post('/location/verify', verifyLocationHandler);
router.get('/location/stats', getLocationStatsHandler);
router.get('/location/records', listLocationsHandler);
router.get('/location/:id', getLocationByIdHandler);
router.post('/location/:id/review', adminReviewLocationHandler);

// Installation Lifecycle Endpoints
router.get('/eligible-cards', getEligibleCards);
router.post('/', createInstallation);
router.get('/', getInstallations);
router.get('/:id', getInstallationById);

export default router;
