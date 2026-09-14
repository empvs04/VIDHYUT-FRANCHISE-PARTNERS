import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { DEFAULT_PAGINATION, USER_ROLES, ACCOUNT_STATUS } from '../config/constants.js';

// Helper: Generate Unique Notification ID
const generateNotificationId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NOTIF-${timestamp}-${randomPart}`;
};

/**
 * Create a new notification
 */
export const createNotification = async ({
  recipientUserId,
  recipientPartnerId = null,
  type,
  title,
  message,
  entityType = 'SYSTEM',
  entityId = '',
  metadata = {},
}) => {
  try {
    const notificationId = generateNotificationId();
    const notification = await Notification.create({
      notificationId,
      recipientUserId,
      recipientPartnerId,
      type,
      title,
      message,
      entityType,
      entityId,
      metadata,
    });
    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
};

/**
 * Notify all Super Admins
 */
export const notifySuperAdmins = async ({
  type,
  title,
  message,
  entityType = 'SYSTEM',
  entityId = '',
  metadata = {},
}) => {
  try {
    const superAdmins = await User.find({
      role: USER_ROLES.SUPER_ADMIN,
      status: { $ne: ACCOUNT_STATUS.SUSPENDED },
    }).select('_id');

    const promises = superAdmins.map((admin) =>
      createNotification({
        recipientUserId: admin._id,
        type,
        title,
        message,
        entityType,
        entityId,
        metadata,
      })
    );
    return await Promise.all(promises);
  } catch (err) {
    console.error('Failed to notify super admins:', err.message);
  }
};

/**
 * Get User Notifications with pagination and unread counts
 */
export const getUserNotifications = async (userId, { page = 1, limit = 20, isRead }) => {
  const query = { recipientUserId: userId };
  if (isRead !== undefined && isRead !== '') {
    query.isRead = isRead === 'true' || isRead === true;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [total, unreadCount, notifications] = await Promise.all([
    Notification.countDocuments(query),
    Notification.countDocuments({ recipientUserId: userId, isRead: false }),
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { notificationId, recipientUserId: userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  return notification;
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipientUserId: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result;
};
