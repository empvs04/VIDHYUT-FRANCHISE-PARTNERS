import { ApiError } from '../utils/apiError.js';
import { FRANCHISE_TYPES } from '../config/constants.js';

export const validateCreatePartner = (req, res, next) => {
  const {
    fullName,
    mobileNumber,
    franchiseType,
    state,
    district,
    city,
    addressLine1,
    pinCode,
  } = req.body;

  const missingFields = [];
  if (!fullName?.trim()) missingFields.push('fullName');
  if (!mobileNumber?.trim()) missingFields.push('mobileNumber');
  if (!franchiseType?.trim()) missingFields.push('franchiseType');
  if (!state?.trim()) missingFields.push('state');
  if (!district?.trim()) missingFields.push('district');
  if (!city?.trim()) missingFields.push('city');
  if (!addressLine1?.trim()) missingFields.push('addressLine1');
  if (!pinCode?.trim()) missingFields.push('pinCode');

  if (missingFields.length > 0) {
    return next(
      new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`)
    );
  }

  if (!/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
    return next(new ApiError(400, 'Invalid 10-digit Indian mobile number.'));
  }

  if (!Object.values(FRANCHISE_TYPES).includes(franchiseType)) {
    return next(
      new ApiError(
        400,
        `Invalid franchiseType. Must be one of: ${Object.values(FRANCHISE_TYPES).join(', ')}`
      )
    );
  }

  if (!/^\d{6}$/.test(pinCode.trim())) {
    return next(new ApiError(400, 'PIN Code must be a 6-digit number.'));
  }

  next();
};

export const validateUpdatePartner = (req, res, next) => {
  const { mobileNumber, pinCode } = req.body;

  if (mobileNumber && !/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
    return next(new ApiError(400, 'Invalid 10-digit Indian mobile number.'));
  }

  if (pinCode && !/^\d{6}$/.test(pinCode.trim())) {
    return next(new ApiError(400, 'PIN Code must be a 6-digit number.'));
  }

  next();
};
