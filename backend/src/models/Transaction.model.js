import mongoose from 'mongoose';
import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  PAYMENT_STATUS,
  DISPUTE_REASONS,
} from '../config/constants.js';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(TRANSACTION_TYPES),
      required: [true, 'Transaction type is required'],
      index: true,
    },
    sellerPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
      index: true,
    },
    buyerPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      required: [true, 'Buyer partner reference is required'],
      index: true,
    },
    cardIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        required: true,
      },
    ],
    cardSerialNumbers: {
      type: [String],
      required: [true, 'Card serial numbers list is required'],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        'At least one card serial number must be included',
      ],
    },
    quantity: {
      type: Number,
      required: [true, 'Card quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    pricePerCard: {
      type: Number,
      required: [true, 'Price per card is required'],
      min: [0, 'Price per card cannot be negative'],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.PENDING_CONFIRMATION,
      index: true,
    },
    // Payment Evidence & Manual Verification
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: '',
    },
    paymentProofUrl: {
      type: String,
      trim: true,
      default: '',
    },
    paymentProofNotes: {
      type: String,
      trim: true,
      default: '',
    },
    paymentSubmittedAt: {
      type: Date,
      default: null,
    },
    paymentVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    paymentVerifiedAt: {
      type: Date,
      default: null,
    },
    paymentRejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    // Audit & Lifecycle Actors
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    disputedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    disputedAt: {
      type: Date,
      default: null,
    },
    disputeReason: {
      type: String,
      enum: [...Object.values(DISPUTE_REASONS), null, ''],
      default: null,
    },
    disputeComments: {
      type: String,
      trim: true,
      default: '',
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// High Performance Compound Indexes for fast queries
transactionSchema.index({ sellerPartnerId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ buyerPartnerId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ cardIds: 1 });
transactionSchema.index({ paymentStatus: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
