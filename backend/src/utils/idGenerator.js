import crypto from 'crypto';
import { FRANCHISE_TYPES } from '../config/constants.js';

export const generateFranchiseId = (franchiseType, state, district) => {
  const stateCode = (state || 'MH').replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase();
  const districtCode = (district || 'GEN').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  
  // Clean, readable 4-digit number (1001 to 9999)
  const randomNum = crypto.randomInt(1001, 9999);

  if (franchiseType === FRANCHISE_TYPES.STATE_FRANCHISE) {
    return `VS-${stateCode}-ST-${randomNum}`;
  } else if (franchiseType === FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT) {
    return `VS-NX-${stateCode}-${districtCode}-${randomNum}`;
  } else if (franchiseType === FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT) {
    return `VS-STD-${stateCode}-${districtCode}-${randomNum}`;
  } else if (franchiseType === FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT) {
    return `VS-PRM-${stateCode}-${districtCode}-${randomNum}`;
  } else if (franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE) {
    return `VS-${stateCode}-${districtCode}-${randomNum}`;
  } else {
    return `VS-SUB-${stateCode}-${districtCode}-${randomNum}`;
  }
};

export const generateTransactionId = (type = 'SALE') => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomInt(1000, 9999);
  const prefix = type === 'SALE' ? 'TXN' : type === 'TRANSFER' ? 'TRF' : 'CMP';
  return `${prefix}-${dateStr}-${rand}`;
};

export const generateCustomerId = (sequenceNumber) => {
  if (sequenceNumber !== undefined && sequenceNumber !== null) {
    const padded = String(sequenceNumber).padStart(6, '0');
    return `VSCUST${padded}`;
  }
  const rand = crypto.randomInt(100000, 999999);
  return `VSCUST${rand}`;
};

export const generateInstallationId = (sequenceNumber) => {
  if (sequenceNumber !== undefined && sequenceNumber !== null) {
    const padded = String(sequenceNumber).padStart(6, '0');
    return `VSINS${padded}`;
  }
  const rand = crypto.randomInt(100000, 999999);
  return `VSINS${rand}`;
};

export const generateLocationVerificationId = (sequenceNumber) => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  if (sequenceNumber !== undefined && sequenceNumber !== null) {
    const padded = String(sequenceNumber).padStart(5, '0');
    return `LOC-${dateStr}-${padded}`;
  }
  const rand = crypto.randomInt(10000, 99999);
  return `LOC-${dateStr}-${rand}`;
};


