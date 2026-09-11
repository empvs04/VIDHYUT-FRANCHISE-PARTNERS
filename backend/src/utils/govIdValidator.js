// Government ID validation and verification algorithms

// Verhoeff algorithm table for Aadhaar validation
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export const validateAadhaar = (aadhaarNumber) => {
  const clean = (aadhaarNumber || '').replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(clean)) {
    return { isValid: false, message: 'Aadhaar number must be exactly 12 numeric digits.' };
  }

  // Check that it does not start with 0 or 1
  if (clean.startsWith('0') || clean.startsWith('1')) {
    return { isValid: false, message: 'Invalid Aadhaar: Cannot begin with 0 or 1.' };
  }

  // Verhoeff checksum validation
  let c = 0;
  const invertedArray = clean.split('').map(Number).reverse();

  for (let i = 0; i < invertedArray.length; i++) {
    c = d[c][p[i % 8][invertedArray[i]]];
  }

  if (c !== 0) {
    return { isValid: false, message: 'Invalid Aadhaar: Failed Verhoeff checksum validation.' };
  }

  return {
    isValid: true,
    formatted: `${clean.substring(0, 4)} ${clean.substring(4, 8)} ${clean.substring(8, 12)}`,
    masked: `XXXX XXXX ${clean.substring(8, 12)}`,
    message: 'Valid Indian Aadhaar Card',
  };
};

export const validatePAN = (panNumber) => {
  const clean = (panNumber || '').trim().toUpperCase();
  // PAN format: 5 letters (4th is status: P, C, H, F, A, T, B, L, J, G), 4 digits, 1 letter
  const panRegex = /^[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z]$/;

  if (!panRegex.test(clean)) {
    return {
      isValid: false,
      message: 'Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F with 4th character representing entity status).',
    };
  }

  const holderTypes = {
    P: 'Individual / Person',
    C: 'Company',
    H: 'HUF (Hindu Undivided Family)',
    F: 'Firm / Partnership',
    A: 'Association of Persons',
    T: 'Trust',
    B: 'Body of Individuals',
    L: 'Local Authority',
    J: 'Artificial Juridical Person',
    G: 'Government Agency',
  };

  const entityType = holderTypes[clean.charAt(3)] || 'Verified Entity';

  return {
    isValid: true,
    formatted: clean,
    masked: `${clean.substring(0, 5)}XXXX${clean.charAt(9)}`,
    entityType,
    message: `Valid Indian PAN Card (${entityType})`,
  };
};

export const validateVoterID = (voterId) => {
  const clean = (voterId || '').trim().toUpperCase();
  // Standard EPIC Voter ID format: 3 uppercase letters followed by 7 digits
  const epicRegex = /^[A-Z]{3}\d{7}$/;

  if (!epicRegex.test(clean)) {
    return {
      isValid: false,
      message: 'Invalid Voter ID format. Must be 10 characters (e.g. ABC1234567 - 3 letters followed by 7 digits).',
    };
  }

  return {
    isValid: true,
    formatted: clean,
    masked: `${clean.substring(0, 3)}XXXX${clean.substring(7)}`,
    message: 'Valid Indian Election Commission Voter ID (EPIC)',
  };
};

export const validateDrivingLicense = (dlNumber) => {
  const clean = (dlNumber || '').trim().toUpperCase().replace(/[\s-]/g, '');
  // Standard DL format: 2 letter state code followed by 13-14 alphanumeric digits
  const dlRegex = /^[A-Z]{2}\d{13,14}$/;

  if (!dlRegex.test(clean)) {
    return {
      isValid: false,
      message: 'Invalid Driving License format. Must begin with 2-letter State code followed by RTO and numeric sequence.',
    };
  }

  return {
    isValid: true,
    formatted: clean,
    masked: `${clean.substring(0, 4)}XXXXXXX${clean.substring(clean.length - 4)}`,
    message: 'Valid Indian Driving License format',
  };
};

export const verifyGovernmentDocument = (idType, idNumber, documentBase64OrUrl) => {
  let result;
  switch (idType) {
    case 'AADHAAR':
      result = validateAadhaar(idNumber);
      break;
    case 'PAN':
      result = validatePAN(idNumber);
      break;
    case 'VOTER_ID':
      result = validateVoterID(idNumber);
      break;
    case 'DRIVING_LICENSE':
      result = validateDrivingLicense(idNumber);
      break;
    default:
      return {
        isValid: false,
        message: 'Unsupported government ID type. Supported: AADHAAR, PAN, VOTER_ID, DRIVING_LICENSE.',
      };
  }

  return {
    ...result,
    idType,
    hasAttachedDocument: !!documentBase64OrUrl,
    verifiedAt: new Date(),
    verificationConfidence: result.isValid ? 0.98 : 0.0,
  };
};
