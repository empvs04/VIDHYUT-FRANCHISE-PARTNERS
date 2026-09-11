import crypto from 'crypto';
import { FRANCHISE_TYPES } from '../config/constants.js';

export const generateFranchiseId = (franchiseType, state, district) => {
  const stateCode = (state || 'IN').replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
  const districtCode = (district || 'GEN').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();

  if (franchiseType === FRANCHISE_TYPES.STATE_FRANCHISE) {
    return `VS-ST-${stateCode}-${randomSuffix}`;
  } else if (franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE) {
    return `VS-DT-${stateCode}-${districtCode}-${randomSuffix}`;
  } else {
    return `VS-SUB-${stateCode}-${districtCode}-${randomSuffix}`;
  }
};
