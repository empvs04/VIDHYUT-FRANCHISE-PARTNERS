import { ApiResponse } from '../utils/apiResponse.js';
import {
  verifyLocation,
  getLocationVerificationById,
  adminReviewLocation,
  getLocationVerificationStats,
  listLocationVerifications,
} from '../services/locationVerification.service.js';

export const verifyLocationHandler = async (req, res, next) => {
  try {
    const result = await verifyLocation(req.body, req.user, req.partner);
    return res.status(200).json(
      new ApiResponse(200, result, 'Location verified against authorized franchise territory.')
    );
  } catch (error) {
    next(error);
  }
};

export const getLocationStatsHandler = async (req, res, next) => {
  try {
    const stats = await getLocationVerificationStats(req.user);
    return res.status(200).json(
      new ApiResponse(200, stats, 'Location verification metrics retrieved successfully.')
    );
  } catch (error) {
    next(error);
  }
};

export const listLocationsHandler = async (req, res, next) => {
  try {
    const result = await listLocationVerifications(req.query, req.user);
    return res.status(200).json(
      new ApiResponse(200, result, 'Location verification records retrieved successfully.')
    );
  } catch (error) {
    next(error);
  }
};

export const getLocationByIdHandler = async (req, res, next) => {
  try {
    const record = await getLocationVerificationById(req.params.id, req.user);
    return res.status(200).json(
      new ApiResponse(200, record, 'Location verification details retrieved successfully.')
    );
  } catch (error) {
    next(error);
  }
};

export const adminReviewLocationHandler = async (req, res, next) => {
  try {
    const { action, reviewReason } = req.body;
    const record = await adminReviewLocation(req.params.id, action, reviewReason, req.user);
    return res.status(200).json(
      new ApiResponse(200, record, `Location verification ${action} completed with audit log.`)
    );
  } catch (error) {
    next(error);
  }
};
