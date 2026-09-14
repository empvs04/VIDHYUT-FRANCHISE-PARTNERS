import { ApiError } from '../utils/apiError.js';
import { CUSTOMER_TYPES, ELECTRICITY_PHASES } from '../config/constants.js';

export const validateCustomerData = (data) => {
  const {
    fullName,
    mobileNumber,
    customerType,
    address,
    electricityDetails,
  } = data;

  if (!fullName || !fullName.trim()) {
    throw new ApiError(400, 'Please enter customer full name.');
  }

  if (!mobileNumber || !/^[6-9]\d{9}$/.test(String(mobileNumber).trim())) {
    throw new ApiError(400, 'Please provide a valid 10-digit Indian mobile number.');
  }

  if (!customerType || !Object.values(CUSTOMER_TYPES).includes(customerType)) {
    throw new ApiError(
      400,
      `Invalid customer type. Must be one of: ${Object.values(CUSTOMER_TYPES).join(', ')}.`
    );
  }

  if (!address || typeof address !== 'object') {
    throw new ApiError(400, 'Customer address details are required.');
  }

  const { city, district, state, pinCode } = address;

  if (!city || !city.trim()) {
    throw new ApiError(400, 'Please enter the city.');
  }

  if (!district || !district.trim()) {
    throw new ApiError(400, 'Please select or enter the district.');
  }

  if (!state || !state.trim()) {
    throw new ApiError(400, 'Please select or enter the state.');
  }

  if (!pinCode || !/^\d{6}$/.test(String(pinCode).trim())) {
    throw new ApiError(400, 'Please enter a valid 6-digit PIN code.');
  }

  if (!electricityDetails || typeof electricityDetails !== 'object') {
    throw new ApiError(400, 'Electricity details are required.');
  }

  const { connectedLoadKw, phase } = electricityDetails;

  const loadNum = parseFloat(connectedLoadKw);
  if (isNaN(loadNum) || loadNum <= 0) {
    throw new ApiError(400, 'Connected load must be a positive number greater than 0 kW.');
  }

  if (phase && !Object.values(ELECTRICITY_PHASES).includes(phase)) {
    throw new ApiError(
      400,
      `Invalid electrical phase. Must be one of: ${Object.values(ELECTRICITY_PHASES).join(', ')}.`
    );
  }

  return true;
};
