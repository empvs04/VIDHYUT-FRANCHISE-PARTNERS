import { ApiResponse } from '../utils/apiResponse.js';
import * as auditService from '../services/audit.service.js';

export const getAllAuditLogs = async (req, res, next) => {
  try {
    const data = await auditService.getAuditLogs(req.query);
    res.status(200).json(new ApiResponse(200, data, 'Audit logs retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getEntityAuditHistory = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const data = await auditService.getEntityAuditHistory(entityType, entityId);
    res.status(200).json(new ApiResponse(200, data, 'Entity audit history retrieved'));
  } catch (err) {
    next(err);
  }
};
