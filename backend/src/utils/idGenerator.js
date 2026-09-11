import crypto from 'crypto';
import { FRANCHISE_TYPES } from '../config/constants.js';

export const generateFranchiseId = (franchiseType, state, district) => {
  const stateCode = (state || 'MH').replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
  const districtCode = (district || 'GEN').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  
  // Clean, readable 4-digit number (1001 to 9999)
  const randomNum = crypto.randomInt(1001, 9999);

  if (franchiseType === FRANCHISE_TYPES.STATE_FRANCHISE) {
    return `VS-${stateCode}-ST-${randomNum}`;
  } else if (franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE) {
    return `VS-${stateCode}-${districtCode}-${randomNum}`;
  } else {
    return `VS-SUB-${stateCode}-${districtCode}-${randomNum}`;
  }
};
