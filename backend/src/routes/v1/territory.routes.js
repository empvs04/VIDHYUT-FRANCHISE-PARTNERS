import express from 'express';
import {
  getStates,
  getDistrictsByState,
  getTerritoryCoverage,
} from '../../controllers/territory.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/states', getStates);
router.get('/districts', getDistrictsByState);
router.get('/coverage', getTerritoryCoverage);

export default router;
