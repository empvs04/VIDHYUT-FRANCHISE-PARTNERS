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

/**
 * Broadcast Target Milestone / Reward Scheme Alert to Targeted Partners
 */
export const broadcastTargetNotification = async ({
  senderRole,
  senderName,
  target,
}) => {
  try {
    if (!target) return [];

    let targetPartners = [];

    if (target.scopeType === 'INDIVIDUAL' || target.scopeType === 'INDIVIDUAL_SUB_FRANCHISE') {
      if (target.partnerId) {
        targetPartners = await FranchisePartner.find({
          $or: [
            { _id: target.partnerId.length === 24 ? target.partnerId : null },
            { franchiseId: target.partnerFranchiseId || target.partnerId },
          ].filter(Boolean),
          status: { $ne: ACCOUNT_STATUS.SUSPENDED },
        }).select('_id userId fullName state district franchiseType');
      }
    } else if (target.targetAudience === 'SUB_FRANCHISE' || target.scopeType === 'MY_SUB_FRANCHISES') {
      const query = {
        franchiseType: { $in: ['SUB_FRANCHISE', 'FOFO'] },
        status: { $ne: ACCOUNT_STATUS.SUSPENDED },
      };

      if (target.creatorPartnerId && target.creatorPartnerId.length === 24) {
        query.$or = [
          { parentPartnerId: target.creatorPartnerId },
          ...(target.targetDistrict ? [{ district: new RegExp(`^${target.targetDistrict.trim()}$`, 'i') }] : []),
          ...(target.targetState ? [{ state: new RegExp(`^${target.targetState.trim()}$`, 'i') }] : []),
        ];
      } else if (target.targetDistrict) {
        query.district = new RegExp(`^${target.targetDistrict.trim()}$`, 'i');
      } else if (target.targetState) {
        query.state = new RegExp(`^${target.targetState.trim()}$`, 'i');
      }

      targetPartners = await FranchisePartner.find(query).select('_id userId fullName state district franchiseType');

      if (targetPartners.length === 0) {
        // Broaden to all sub-franchises
        targetPartners = await FranchisePartner.find({
          franchiseType: { $in: ['SUB_FRANCHISE', 'FOFO'] },
          status: { $ne: ACCOUNT_STATUS.SUSPENDED },
        }).select('_id userId fullName state district franchiseType');
      }
    } else if (target.scopeType === 'DISTRICT') {
      const query = {
        franchiseType: { $ne: 'SUB_FRANCHISE' },
        status: { $ne: ACCOUNT_STATUS.SUSPENDED },
      };
      if (target.targetDistrict) query.district = new RegExp(`^${target.targetDistrict.trim()}$`, 'i');
      if (target.targetState) query.state = new RegExp(`^${target.targetState.trim()}$`, 'i');
      targetPartners = await FranchisePartner.find(query).select('_id userId fullName state district franchiseType');
    } else if (target.scopeType === 'STATE') {
      const query = {
        franchiseType: { $ne: 'SUB_FRANCHISE' },
        status: { $ne: ACCOUNT_STATUS.SUSPENDED },
      };
      if (target.targetState) query.state = new RegExp(`^${target.targetState.trim()}$`, 'i');
      targetPartners = await FranchisePartner.find(query).select('_id userId fullName state district franchiseType');
    } else {
      // GLOBAL / ALL - Target all regular Franchise Partners (non-subs)
      targetPartners = await FranchisePartner.find({
        franchiseType: { $ne: 'SUB_FRANCHISE' },
        status: { $ne: ACCOUNT_STATUS.SUSPENDED },
      }).select('_id userId fullName state district franchiseType');
    }

    const isSubTarget = target.targetAudience === 'SUB_FRANCHISE' || target.scopeType === 'MY_SUB_FRANCHISES';
    const notifTitle = isSubTarget
      ? `🎁 New Reward Challenge: ${target.title || target.rewardName}`
      : `🎯 New Target Milestone: ${target.title || target.rewardName}`;

    const metricLabel = target.metricType === 'PURCHASED_CARDS' ? 'Cards Stock Purchase' : 'Cards Installation';
    const deadlineStr = target.deadline ? ` (Deadline: ${target.deadline})` : '';

    const notifMessage = isSubTarget
      ? `${senderName || 'Franchise Partner'} assigned a new reward goal: Complete ${target.targetValue} ${metricLabel} to win "${target.rewardName}"!${deadlineStr}`
      : `Company Admin has assigned a new milestone: Install/Purchase ${target.targetValue} ${metricLabel} to claim "${target.rewardName}"!${deadlineStr}`;

    const createdNotifications = [];
    for (const p of targetPartners) {
      if (p.userId) {
        const notif = await createNotification({
          recipientUserId: p.userId,
          recipientPartnerId: p._id,
          type: isSubTarget ? 'REWARD_SCHEME_CREATED' : 'TARGET_ASSIGNED',
          title: notifTitle,
          message: notifMessage,
          entityType: 'TARGET',
          entityId: String(target.id || ''),
          metadata: {
            targetId: target.id,
            targetValue: target.targetValue,
            rewardName: target.rewardName,
            deadline: target.deadline,
            senderRole,
          },
        });
        if (notif) createdNotifications.push(notif);
      }
    }

    return createdNotifications;
  } catch (err) {
    console.error('Failed to broadcast target notification:', err.message);
    return [];
  }
};
