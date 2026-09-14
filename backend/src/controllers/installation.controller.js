import {
  getInstallationEligibleCards,
  createInstallation as executeInstallation,
  getInstallations as fetchInstallations,
  getInstallationById as fetchInstallationById,
} from '../services/installation.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getEligibleCards = async (req, res, next) => {
  try {
    const cards = await getInstallationEligibleCards(req.user, req.partner);
    return res
      .status(200)
      .json(new ApiResponse(200, cards, 'Eligible cards for installation retrieved.'));
  } catch (error) {
    next(error);
  }
};

export const createInstallation = async (req, res, next) => {
  try {
    const result = await executeInstallation(req.body, req.user, req.partner);
    return res
      .status(201)
      .json(new ApiResponse(201, result, 'Card installation recorded and customer registered successfully.'));
  } catch (error) {
    next(error);
  }
};

export const getInstallations = async (req, res, next) => {
  try {
    const result = await fetchInstallations(req.query, req.user, req.partner);
    return res
      .status(200)
      .json(new ApiResponse(200, result, 'Installations retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

export const getInstallationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const installation = await fetchInstallationById(id, req.user, req.partner);
    return res
      .status(200)
      .json(new ApiResponse(200, installation, 'Installation record retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};
