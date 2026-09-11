import mongoose from 'mongoose';
import { CARD_STATUS, CARD_OWNER_TYPES } from '../config/constants.js';

const cardSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: String,
      required: [true, 'Card serial number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      match: [/^[A-Z0-9_-]{4,20}$/, 'Serial number must be 4 to 20 alphanumeric characters'],
    },
    status: {
      type: String,
      enum: Object.values(CARD_STATUS),
      default: CARD_STATUS.AVAILABLE,
      index: true,
    },
    currentOwnerType: {
      type: String,
      enum: Object.values(CARD_OWNER_TYPES),
      default: CARD_OWNER_TYPES.HEADQUARTERS,
      index: true,
    },
    currentOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    previousOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
    },
    previousOwnerType: {
      type: String,
      enum: [...Object.values(CARD_OWNER_TYPES), null],
      default: null,
    },
    batchId: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    blockedReason: {
      type: String,
      trim: true,
      default: '',
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Extensible placeholders for future Phase 4/5 customer installation
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    installationId: {
      type: String,
      default: null,
    },
    installationDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast filtering and statistics lookups
cardSchema.index({ status: 1, currentOwnerType: 1, currentOwnerId: 1 });
cardSchema.index({ currentOwnerId: 1, status: 1 });

const Card = mongoose.model('Card', cardSchema);
export default Card;
