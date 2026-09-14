import { ApiError } from '../utils/apiError.js';
import { validateCustomerData } from './customer.validator.js';

export const validateInstallationData = (data) => {
  // Validate basic customer details embedded or referenced
  validateCustomerData(data);

  const {
    cardSerialNumbers = [],
    cardIds = [],
    pricePerCard,
    mcbPhoto,
    billPhoto,
    installedCardPhoto,
  } = data;

  const totalCards = (cardSerialNumbers.length > 0 ? cardSerialNumbers.length : cardIds.length);
  if (totalCards === 0) {
    throw new ApiError(400, 'Please select at least one card for installation.');
  }

  const price = parseFloat(pricePerCard);
  if (isNaN(price) || price < 0) {
    throw new ApiError(400, 'Price per card must be a valid non-negative number.');
  }

  if (!mcbPhoto || !mcbPhoto.trim()) {
    throw new ApiError(400, 'Please upload the MCB / ELCB distribution panel photo.');
  }

  if (!billPhoto || !billPhoto.trim()) {
    throw new ApiError(400, 'Please upload the electricity bill photo.');
  }

  if (!installedCardPhoto || !installedCardPhoto.trim()) {
    throw new ApiError(400, 'Please upload the photo showing installed Vidhyut Saathi cards.');
  }

  return true;
};
