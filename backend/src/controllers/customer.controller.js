import {
  getCustomers as fetchCustomers,
  getCustomerById as fetchCustomerById,
  sendCustomerConfirmationOTP,
  verifyCustomerConfirmationOTP,
} from '../services/customer.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getCustomers = async (req, res, next) => {
  try {
    const result = await fetchCustomers(req.query, req.user, req.partner);
    return res
      .status(200)
      .json(new ApiResponse(200, result, 'Customers retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await fetchCustomerById(id, req.user, req.partner);
    return res
      .status(200)
      .json(new ApiResponse(200, result, 'Customer details retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

export const sendOTP = async (req, res, next) => {
  try {
    const { mobileNumber } = req.body;
    const result = await sendCustomerConfirmationOTP(mobileNumber);
    return res
      .status(200)
      .json(new ApiResponse(200, result, 'Confirmation OTP dispatched to customer.'));
  } catch (error) {
    next(error);
  }
};

export const verifyOTP = async (req, res, next) => {
  try {
    const { mobileNumber, otp } = req.body;
    await verifyCustomerConfirmationOTP(mobileNumber, otp);
    return res
      .status(200)
      .json(new ApiResponse(200, { verified: true }, 'Customer confirmation OTP verified successfully.'));
  } catch (error) {
    next(error);
  }
};
