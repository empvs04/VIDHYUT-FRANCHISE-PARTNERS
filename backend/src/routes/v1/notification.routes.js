import express from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  broadcastTargetNotificationController,
} from '../../controllers/notification.controller.js';
import { protect } from '../../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications);
router.post('/target-alert', broadcastTargetNotificationController);
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:notificationId/read', markAsRead);

export default router;
