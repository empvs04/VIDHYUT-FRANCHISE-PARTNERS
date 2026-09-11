import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiError } from '../utils/apiError.js';
import { generateFranchiseId } from '../utils/idGenerator.js';
import { verifyGovernmentDocument } from '../utils/govIdValidator.js';
import { USER_ROLES, FRANCHISE_TYPES, ACCOUNT_STATUS } from '../config/constants.js';

export const createFranchisePartner = async (partnerData, creatorUser) => {
  const {
    fullName,
    mobileNumber,
    email,
    franchiseType,
    parentPartnerId,
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
    startDate,
    expiryDate,
    joiningDate,
    accountStatus = ACCOUNT_STATUS.ACTIVE,
  } = partnerData;

  // 1. Mobile number uniqueness
  const existingMobile = await User.findOne({ mobileNumber: mobileNumber.trim() });
  if (existingMobile) {
    throw new ApiError(409, 'A user with this mobile number already exists.');
  }

  // 2. Email uniqueness
  if (!email || !email.trim()) {
    throw new ApiError(400, 'Email address is required.');
  }
  const cleanEmail = email.toLowerCase().trim();
  const existingEmail = await User.findOne({ email: cleanEmail });
  if (existingEmail) {
    throw new ApiError(409, 'A user with this email address already exists.');
  }

  // 3. Duplicate District Protection for DISTRICT_FRANCHISE
  if (
    franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE &&
    accountStatus === ACCOUNT_STATUS.ACTIVE
  ) {
    const activeDistrictPartner = await FranchisePartner.findOne({
      state: { $regex: new RegExp(`^${state.trim()}$`, 'i') },
      district: { $regex: new RegExp(`^${district.trim()}$`, 'i') },
      franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    });

    if (activeDistrictPartner) {
      throw new ApiError(
        409,
        `This district (${district}, ${state}) already has an active District Franchise Partner: ${activeDistrictPartner.fullName} (${activeDistrictPartner.franchiseId}).`
      );
    }
  }

  // 4. Validate Parent Partner Relationship if provided
  let resolvedParentPartner = null;
  if (parentPartnerId) {
    resolvedParentPartner = await FranchisePartner.findById(parentPartnerId);
    if (!resolvedParentPartner) {
      throw new ApiError(404, 'Specified parent franchise partner does not exist.');
    }

    if (resolvedParentPartner.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
      throw new ApiError(
        400,
        `Cannot assign parent partner (${resolvedParentPartner.franchiseId}) because their status is ${resolvedParentPartner.accountStatus}.`
      );
    }

    // Territory compatibility check with parent
    if (
      resolvedParentPartner.franchiseType === FRANCHISE_TYPES.STATE_FRANCHISE &&
      resolvedParentPartner.state.toLowerCase() !== state.toLowerCase()
    ) {
      throw new ApiError(
        400,
        `Territory conflict: Parent State Franchise (${resolvedParentPartner.state}) does not match partner state (${state}).`
      );
    }

    if (
      resolvedParentPartner.franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE &&
      (resolvedParentPartner.state.toLowerCase() !== state.toLowerCase() ||
        resolvedParentPartner.district.toLowerCase() !== district.toLowerCase())
    ) {
      throw new ApiError(
        400,
        `Territory conflict: Parent District Franchise is authorized for ${resolvedParentPartner.district}, ${resolvedParentPartner.state}, but partner is in ${district}, ${state}.`
      );
    }
  }

  // 5. Validate Government ID if provided
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

  // 6. Generate Unique Franchise ID
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

  // Map franchiseType to User Role
  let assignedRole = USER_ROLES.FRANCHISE_PARTNER;
  if (franchiseType === FRANCHISE_TYPES.STATE_FRANCHISE) assignedRole = USER_ROLES.STATE_FRANCHISE;
  else if (franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE) assignedRole = USER_ROLES.DISTRICT_FRANCHISE;
  else if (franchiseType === FRANCHISE_TYPES.SUB_FRANCHISE) assignedRole = USER_ROLES.SUB_FRANCHISE;

  // 7. Create User account
  const newUser = await User.create({
    fullName: fullName.trim(),
    mobileNumber: mobileNumber.trim(),
    email: cleanEmail,
    role: assignedRole,
    status: accountStatus,
  });

  // 8. Create FranchisePartner record
  try {
    const newPartner = await FranchisePartner.create({
      userId: newUser._id,
      franchiseId,
      franchiseType,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: cleanEmail,
      parentPartnerId: resolvedParentPartner ? resolvedParentPartner._id : null,
      state: state.trim(),
      district: district.trim(),
      authorizedDistricts: authorizedDistricts || [],
      city: city.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2 ? addressLine2.trim() : '',
      pinCode: pinCode.trim(),
      govIdType: govIdType || 'NONE',
      govIdNumber: govIdNumber ? govIdNumber.trim() : '',
      govIdDocumentUrl: govIdDocumentUrl || '',
      isGovIdVerified,
      verificationDetails,
      otherDocuments: otherDocuments || [],
      notes: notes ? notes.trim() : '',
      startDate: startDate ? new Date(startDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      accountStatus,
      createdBy: creatorUser?._id || null,
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

  // Duplicate district protection when changing status to ACTIVE
  if (
    newStatus === ACCOUNT_STATUS.ACTIVE &&
    partner.franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE
  ) {
    const existingActive = await FranchisePartner.findOne({
      _id: { $ne: partner._id },
      state: partner.state,
      district: partner.district,
      franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    });

    if (existingActive) {
      throw new ApiError(
        409,
        `Cannot activate: District ${partner.district}, ${partner.state} already has an active District Franchise Partner (${existingActive.fullName} - ${existingActive.franchiseId}).`
      );
    }
  }

  partner.accountStatus = newStatus;
  await partner.save();

  // Sync status to User model
  await User.findByIdAndUpdate(partner.userId, { status: newStatus });

  return partner;
};

export const getPartnerHierarchy = async (partnerId) => {
  const partner = await FranchisePartner.findById(partnerId)
    .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email state district accountStatus')
    .populate('createdBy', 'fullName email role');

  if (!partner) {
    throw new ApiError(404, 'Franchise Partner not found.');
  }

  // Fetch all direct child partners
  const children = await FranchisePartner.find({ parentPartnerId: partner._id })
    .select('fullName franchiseId franchiseType mobileNumber email state district city accountStatus joiningDate')
    .sort({ createdAt: -1 });

  return {
    partner,
    parent: partner.parentPartnerId,
    children,
    totalChildren: children.length,
    activeChildren: children.filter((c) => c.accountStatus === ACCOUNT_STATUS.ACTIVE).length,
  };
};
