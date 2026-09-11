import { ApiError } from '../utils/apiError.js';
import { CARD_STATUS } from '../config/constants.js';

// Validate Batch Serial Range Creation
export const validateBatchCards = (req, res, next) => {
  const { prefix = 'VS', startNumber, endNumber, paddingLength = 6, notes } = req.body;

  if (startNumber === undefined || startNumber === null || endNumber === undefined || endNumber === null) {
    return next(new ApiError(400, 'Starting number and ending number are required for batch card creation.'));
  }

  const start = parseInt(startNumber, 10);
  const end = parseInt(endNumber, 10);

  if (isNaN(start) || isNaN(end)) {
    return next(new ApiError(400, 'Start and End numbers must be valid integers.'));
  }

  if (start <= 0 || end <= 0) {
    return next(new ApiError(400, 'Serial numbers must be positive integers greater than 0.'));
  }

  if (start > end) {
    return next(new ApiError(400, 'Start serial number cannot be greater than End serial number.'));
  }

  const count = end - start + 1;
  if (count > 2000) {
    return next(new ApiError(400, 'Maximum 2,000 cards can be created in a single batch.'));
  }

  if (typeof prefix !== 'string' || !/^[A-Z0-9_-]{1,10}$/i.test(prefix.trim())) {
    return next(new ApiError(400, 'Prefix must be 1 to 10 alphanumeric characters (e.g. VS).'));
  }

  req.validatedBatch = {
    prefix: prefix.trim().toUpperCase(),
    startNumber: start,
    endNumber: end,
    paddingLength: Math.min(Math.max(parseInt(paddingLength, 10) || 6, 4), 10),
    count,
    notes: typeof notes === 'string' ? notes.trim() : '',
  };

  next();
};

// Validate Manual List of Serial Numbers
export const validateManualCards = (req, res, next) => {
  const { serialNumbers, notes } = req.body;

  if (!Array.isArray(serialNumbers) || serialNumbers.length === 0) {
    return next(new ApiError(400, 'An array of serial numbers is required.'));
  }

  if (serialNumbers.length > 500) {
    return next(new ApiError(400, 'Maximum 500 cards can be manually added in a single request.'));
  }

  const cleanSerials = [];
  const seen = new Set();
  const duplicateInPayload = [];
  const invalidFormat = [];

  for (let s of serialNumbers) {
    if (typeof s !== 'string' || !s.trim()) {
      invalidFormat.push(String(s));
      continue;
    }
    const normalized = s.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{4,20}$/.test(normalized)) {
      invalidFormat.push(normalized);
      continue;
    }
    if (seen.has(normalized)) {
      duplicateInPayload.push(normalized);
    } else {
      seen.add(normalized);
      cleanSerials.push(normalized);
    }
  }

  if (invalidFormat.length > 0) {
    return next(
      new ApiError(
        400,
        `Invalid serial number format for: ${invalidFormat.slice(0, 5).join(', ')}${
          invalidFormat.length > 5 ? ` (+${invalidFormat.length - 5} more)` : ''
        }. Must be 4-20 alphanumeric characters.`
      )
    );
  }

  if (duplicateInPayload.length > 0) {
    return next(
      new ApiError(
        400,
        `Duplicate serial numbers found in your submission: ${duplicateInPayload.slice(0, 5).join(', ')}${
          duplicateInPayload.length > 5 ? ` (+${duplicateInPayload.length - 5} more)` : ''
        }`
      )
    );
  }

  req.validatedSerials = cleanSerials;
  req.validatedNotes = typeof notes === 'string' ? notes.trim() : '';
  next();
};

// Validate Card Status Update
export const validateUpdateCardStatus = (req, res, next) => {
  const { newStatus, reason } = req.body;

  if (!newStatus || !Object.values(CARD_STATUS).includes(newStatus)) {
    return next(
      new ApiError(
        400,
        `Invalid status. Allowed values: ${Object.values(CARD_STATUS).join(', ')}`
      )
    );
  }

  if (newStatus === CARD_STATUS.BLOCKED && (!reason || !reason.trim())) {
    return next(new ApiError(400, 'A reason is mandatory when blocking a card.'));
  }

  next();
};
