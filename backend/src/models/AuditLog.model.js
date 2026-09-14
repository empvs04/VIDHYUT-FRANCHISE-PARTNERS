import mongoose from 'mongoose';
import { AUDIT_ACTIONS, ENTITY_TYPES, USER_ROLES } from '../config/constants.js';

const auditLogSchema = new mongoose.Schema(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
      index: true,
    },
    actorPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: Object.values(ENTITY_TYPES),
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable: No updates allowed
  }
);

// High-speed compound indexes for audit log filtering and reporting
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
