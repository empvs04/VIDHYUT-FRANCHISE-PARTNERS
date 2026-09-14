import express from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import {
  verifyLocationHandler,
  getLocationStatsHandler,
  listLocationsHandler,
  getLocationByIdHandler,
  adminReviewLocationHandler,
} from '../../controllers/locationVerification.controller.js';

const router = express.Router();

router.use(protect);

router.post('/verify', verifyLocationHandler);
router.get('/stats', getLocationStatsHandler);
router.get('/', listLocationsHandler);
router.get('/:id', getLocationByIdHandler);
router.post('/:id/review', adminReviewLocationHandler);

export default router;
