import express from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import partnerRoutes from './partner.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import territoryRoutes from './territory.routes.js';
import cardRoutes from './card.routes.js';
import transactionRoutes from './transaction.routes.js';
import customerRoutes from './customer.routes.js';
import installationRoutes from './installation.routes.js';
import locationVerificationRoutes from './locationVerification.routes.js';
import mediaRoutes from './media.routes.js';
import analyticsRoutes from './analytics.routes.js';
import reportRoutes from './report.routes.js';
import notificationRoutes from './notification.routes.js';
import auditRoutes from './audit.routes.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/partners', partnerRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/territories', territoryRoutes);
router.use('/cards', cardRoutes);
router.use('/transactions', transactionRoutes);
router.use('/customers', customerRoutes);
router.use('/installations', installationRoutes);
router.use('/location-verifications', locationVerificationRoutes);
router.use('/media', mediaRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit', auditRoutes);

export default router;





