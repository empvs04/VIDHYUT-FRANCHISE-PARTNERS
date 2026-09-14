import mongoose from 'mongoose';
import { NOTIFICATION_TYPES, ENTITY_TYPES } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      enum: Object.values(ENTITY_TYPES),
      default: ENTITY_TYPES.SYSTEM,
    },
    entityId: {
      type: String,
      default: '',
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// High-speed compound indexes for in-app notification querying
notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientPartnerId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
