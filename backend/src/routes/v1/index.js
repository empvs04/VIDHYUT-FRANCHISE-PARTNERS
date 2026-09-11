import express from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import partnerRoutes from './partner.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import territoryRoutes from './territory.routes.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/partners', partnerRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/territories', territoryRoutes);

export default router;
