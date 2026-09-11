import mongoose from 'mongoose';
import { CARD_ACTIONS, CARD_OWNER_TYPES, CARD_STATUS } from '../config/constants.js';

const cardHistorySchema = new mongoose.Schema(
  {
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      required: [true, 'Card reference is required'],
      index: true,
    },
    serialNumber: {
      type: String,
      required: [true, 'Card serial number is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(CARD_ACTIONS),
      required: [true, 'Action type is required'],
      index: true,
    },
    fromOwnerType: {
      type: String,
      enum: [...Object.values(CARD_OWNER_TYPES), null],
      default: null,
    },
    fromOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
    },
    toOwnerType: {
      type: String,
      enum: [...Object.values(CARD_OWNER_TYPES), null],
      default: null,
    },
    toOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
    },
    previousStatus: {
      type: String,
      enum: [...Object.values(CARD_STATUS), null],
      default: null,
    },
    newStatus: {
      type: String,
      enum: Object.values(CARD_STATUS),
      required: [true, 'New status is required'],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who performed the action is required'],
    },
    performedByRole: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // Explicit immutable timestamps
  }
);

// Compound indexes for history timeline queries
cardHistorySchema.index({ cardId: 1, timestamp: -1 });
cardHistorySchema.index({ serialNumber: 1, timestamp: -1 });

const CardHistory = mongoose.model('CardHistory', cardHistorySchema);
export default CardHistory;
