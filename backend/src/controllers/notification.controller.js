import { ApiResponse } from '../utils/apiResponse.js';
import * as notificationService from '../services/notification.service.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const data = await notificationService.getUserNotifications(req.user._id, req.query);
    res.status(200).json(new ApiResponse(200, data, 'Notifications retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const notification = await notificationService.markNotificationAsRead(
      req.user._id,
      notificationId
    );
    if (!notification) {
      return res.status(404).json(new ApiResponse(404, null, 'Notification not found or unauthorized'));
    }
    res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllNotificationsAsRead(req.user._id);
    res.status(200).json(new ApiResponse(200, null, 'All notifications marked as read'));
  } catch (err) {
    next(err);
  }
};
