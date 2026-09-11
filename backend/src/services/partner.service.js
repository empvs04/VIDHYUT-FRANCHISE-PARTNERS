import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiError } from '../utils/apiError.js';
import { generateFranchiseId } from '../utils/idGenerator.js';
import { verifyGovernmentDocument } from '../utils/govIdValidator.js';
import { USER_ROLES, ACCOUNT_STATUS } from '../config/constants.js';

export const createFranchisePartner = async (partnerData, adminUserId) => {
  const {
    fullName,
    mobileNumber,
    email,
    franchiseType,
    state,
    district,
    authorizedDistricts,
    city,
    addressLine1,
    addressLine2,
    pinCode,
    govIdType,
    govIdNumber,
    govIdDocumentUrl,
    otherDocuments,
    notes,
    joiningDate,
  } = partnerData;

  // Check if mobile already exists in User collection
  const existingUser = await User.findOne({ mobileNumber });
  if (existingUser) {
    throw new ApiError(409, 'A user with this mobile number already exists.');
  }

  if (email) {
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      throw new ApiError(409, 'A user with this email address already exists.');
    }
  }

  // Validate Government ID if provided
  let isGovIdVerified = false;
  let verificationDetails = null;

  if (govIdType && govIdType !== 'NONE' && govIdNumber) {
    const verifyResult = verifyGovernmentDocument(govIdType, govIdNumber, govIdDocumentUrl);
    if (!verifyResult.isValid) {
      throw new ApiError(400, `Government ID Verification Failed: ${verifyResult.message}`);
    }
    isGovIdVerified = true;
    verificationDetails = {
      verifiedAt: new Date(),
      message: verifyResult.message,
      maskedId: verifyResult.masked,
      entityType: verifyResult.entityType || 'Verified Partner',
    };
  }

  // Generate Unique Franchise ID
  let franchiseId;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    franchiseId = generateFranchiseId(franchiseType, state, district);
    const existingPartner = await FranchisePartner.findOne({ franchiseId });
    if (!existingPartner) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new ApiError(500, 'Could not generate a unique Franchise ID. Please try again.');
  }

  // Create User account
  const newUser = await User.create({
    fullName,
    mobileNumber,
    email: email ? email.toLowerCase() : undefined,
    role: USER_ROLES.FRANCHISE_PARTNER,
    status: ACCOUNT_STATUS.ACTIVE,
  });

  // Create FranchisePartner record
  try {
    const newPartner = await FranchisePartner.create({
      userId: newUser._id,
      franchiseId,
      franchiseType,
      fullName,
      mobileNumber,
      email: email ? email.toLowerCase() : undefined,
      state,
      district,
      authorizedDistricts: authorizedDistricts || [],
      city,
      addressLine1,
      addressLine2: addressLine2 || '',
      pinCode,
      govIdType: govIdType || 'NONE',
      govIdNumber: govIdNumber || '',
      govIdDocumentUrl: govIdDocumentUrl || '',
      isGovIdVerified,
      verificationDetails,
      otherDocuments: otherDocuments || [],
      notes: notes || '',
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      createdBy: adminUserId,
    });

    return newPartner;
  } catch (err) {
    // Cleanup created user if partner creation fails
    await User.findByIdAndDelete(newUser._id);
    throw err;
  }
};

export const updateFranchisePartnerStatus = async (partnerId, newStatus) => {
  if (!Object.values(ACCOUNT_STATUS).includes(newStatus)) {
    throw new ApiError(400, 'Invalid account status value.');
  }

  const partner = await FranchisePartner.findById(partnerId);
  if (!partner) {
    throw new ApiError(404, 'Franchise Partner not found.');
  }

  partner.accountStatus = newStatus;
  await partner.save();

  // Also sync status on User account
  await User.findByIdAndUpdate(partner.userId, { status: newStatus });

  return partner;
};
