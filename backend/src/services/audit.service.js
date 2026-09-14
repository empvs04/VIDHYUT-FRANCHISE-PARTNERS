import AuditLog from '../models/AuditLog.model.js';
import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { DEFAULT_PAGINATION } from '../config/constants.js';

// Helper: Generate Unique Audit ID
const generateAuditId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AUDIT-${timestamp}-${randomPart}`;
};

/**
 * Log an immutable audit event
 */
export const logAuditEvent = async ({
  actorUserId,
  actorRole,
  actorPartnerId = null,
  action,
  entityType,
  entityId,
  description,
  ipAddress = '127.0.0.1',
  userAgent = '',
  metadata = {},
}) => {
  try {
    const auditId = generateAuditId();
    const auditLog = await AuditLog.create({
      auditId,
      actorUserId,
      actorRole,
      actorPartnerId,
      action,
      entityType,
      entityId,
      description,
      ipAddress,
      userAgent,
      metadata,
    });
    return auditLog;
  } catch (err) {
    console.error('Failed to log audit event:', err.message);
    return null;
  }
};

/**
 * Get paginated audit logs with search and multi-attribute filters
 */
export const getAuditLogs = async ({
  page = DEFAULT_PAGINATION.PAGE,
  limit = DEFAULT_PAGINATION.LIMIT,
  action = '',
  entityType = '',
  actorRole = '',
  search = '',
  startDate = '',
  endDate = '',
}) => {
  const query = {};

  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  if (actorRole) query.actorRole = actorRole;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (search) {
    const sRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { auditId: sRegex },
      { entityId: sRegex },
      { description: sRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('actorUserId', 'name email role')
      .populate('actorPartnerId', 'fullName franchiseId franchiseType state district')
      .lean(),
  ]);

  return {
    logs,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Get Entity Audit History (Timeline)
 */
export const getEntityAuditHistory = async (entityType, entityId) => {
  const logs = await AuditLog.find({ entityType, entityId })
    .sort({ createdAt: -1 })
    .populate('actorUserId', 'name email role')
    .populate('actorPartnerId', 'fullName franchiseId')
    .lean();
  return logs;
};
