import mongoose from 'mongoose';
import LocationVerification from '../models/LocationVerification.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import Installation from '../models/Installation.model.js';
import { ApiError } from '../utils/apiError.js';
import { generateLocationVerificationId } from '../utils/idGenerator.js';
import {
  reverseGeocodeCoordinates,
  isStateMatch,
  isDistrictMatch,
  normalizeStateName,
  normalizeDistrictName,
} from './geocoding.service.js';
import { evaluateGpsAccuracy, BUSINESS_RULES } from '../config/businessRules.js';
import {
  USER_ROLES,
  LOCATION_VERIFICATION_STATUS,
  GPS_ACCURACY_STATUS,
  ACCOUNT_STATUS,
} from '../config/constants.js';

/**
 * 1. Verify Installation Location (Partner GPS Submission)
 * Independent Backend Verification:
 * - Validates coordinate bounds & accuracy thresholds
 * - Performs server-side reverse geocoding to determine real State and District
 * - Pulls authoritative partner authorization from MongoDB
 * - Determines territoryMatch & customerAddressMatch
 * - Saves immutable LocationVerification record
 */
export const verifyLocation = async (data, user, partner) => {
  const {
    latitude,
    longitude,
    accuracy,
    gpsCapturedAt,
    customerEnteredState = '',
    customerEnteredDistrict = '',
    customerId = null,
    partnerId = null,
  } = data;

  // A. Validate Coordinate Inputs
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const acc = parseFloat(accuracy);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ApiError(400, 'Invalid GPS coordinates provided.');
  }

  if (isNaN(acc) || acc < 0) {
    throw new ApiError(400, 'Valid GPS accuracy measurement is required.');
  }

  // B. Identify Executing Franchise Partner
  let executingPartner = partner;
  if (user.role === USER_ROLES.SUPER_ADMIN && partnerId) {
    if (mongoose.Types.ObjectId.isValid(partnerId)) {
      executingPartner = await FranchisePartner.findById(partnerId);
    }
  }

  if (!executingPartner && user.role !== USER_ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Franchise Partner profile is required for location verification.');
  }

  if (executingPartner && executingPartner.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    throw new ApiError(
      400,
      `Cannot verify location: Partner account status is ${executingPartner.accountStatus}.`
    );
  }

  // C. Evaluate GPS Accuracy
  const accuracyStatus = evaluateGpsAccuracy(acc);
  const isPoorAccuracy = accuracyStatus === 'POOR';

  // D. Perform Server-Side Reverse Geocoding
  const geocoded = await reverseGeocodeCoordinates(lat, lng);
  const detectedState = geocoded.state;
  const detectedDistrict = geocoded.district;

  // E. Verify Against Authoritative Partner Territory from Database
  let territoryMatch = true;
  let verificationStatus = LOCATION_VERIFICATION_STATUS.VERIFIED;
  let verificationReason = 'GPS coordinates verified within authorized territory.';

  const authState = executingPartner ? executingPartner.state : detectedState;
  const authDistrict = executingPartner ? executingPartner.district : detectedDistrict;
  const authDistricts = executingPartner ? executingPartner.authorizedDistricts || [] : [];
  const franchiseType = executingPartner ? executingPartner.franchiseType : 'STATE_FRANCHISE';

  if (executingPartner && user.role !== USER_ROLES.SUPER_ADMIN) {
    const stateMatched = isStateMatch(detectedState, authState);

    if (!stateMatched) {
      territoryMatch = false;
      verificationStatus = LOCATION_VERIFICATION_STATUS.TERRITORY_MISMATCH;
      verificationReason = `State Mismatch: Captured GPS location is in ${detectedState}, but partner is authorized for ${authState}.`;
    } else {
      if (franchiseType === 'STATE_FRANCHISE') {
        // State franchise authorized across the state
        territoryMatch = true;
      } else {
        // District / Sub-Franchise requires district match
        const districtMatched = isDistrictMatch(detectedDistrict, authDistrict, authDistricts);
        if (!districtMatched) {
          territoryMatch = false;
          verificationStatus = LOCATION_VERIFICATION_STATUS.TERRITORY_MISMATCH;
          verificationReason = `District Mismatch: Captured GPS location is in ${detectedDistrict} (${detectedState}), but partner is authorized for ${authDistrict} (${authState}).`;
        }
      }
    }
  }

  // F. Evaluate Accuracy Status Impact
  if (isPoorAccuracy) {
    verificationStatus = LOCATION_VERIFICATION_STATUS.LOW_ACCURACY;
    verificationReason = `GPS accuracy is too low (${acc.toFixed(1)}m > ${BUSINESS_RULES.GPS_ACCURACY_ACCEPTABLE_METERS}m). Please move to an open area and retry.`;
  }

  // G. Customer Address vs GPS Check
  let customerAddressMatch = true;
  if (customerEnteredState && customerEnteredDistrict) {
    const custStateMatch = isStateMatch(detectedState, customerEnteredState);
    const custDistrictMatch = isDistrictMatch(detectedDistrict, customerEnteredDistrict);
    if (!custStateMatch || !custDistrictMatch) {
      customerAddressMatch = false;
      if (verificationStatus === LOCATION_VERIFICATION_STATUS.VERIFIED) {
        // If territory matches partner but differs from customer address, flag for audit review
        verificationReason += ` Note: Detected GPS location (${detectedDistrict}, ${detectedState}) differs from customer entered address (${customerEnteredDistrict}, ${customerEnteredState}).`;
      }
    }
  }

  // H. Generate Unique Verification Record
  const count = await LocationVerification.countDocuments();
  const locationVerificationId = generateLocationVerificationId(count + 1);

  const verificationRecord = new LocationVerification({
    locationVerificationId,
    partnerId: executingPartner ? executingPartner._id : user._id,
    customerId: customerId && mongoose.Types.ObjectId.isValid(customerId) ? customerId : null,
    latitude: lat,
    longitude: lng,
    accuracyMeters: acc,
    gpsCapturedAt: gpsCapturedAt ? new Date(gpsCapturedAt) : new Date(),
    serverTimestamp: new Date(),
    formattedAddress: geocoded.formattedAddress,
    locality: geocoded.locality,
    city: geocoded.city,
    district: detectedDistrict,
    state: detectedState,
    country: geocoded.country || 'India',
    postalCode: geocoded.postalCode || '',
    customerEnteredState: customerEnteredState ? normalizeStateName(customerEnteredState) : '',
    customerEnteredDistrict: customerEnteredDistrict ? normalizeDistrictName(customerEnteredDistrict) : '',
    authorizedState: authState,
    authorizedDistrict: authDistrict,
    authorizedDistricts: authDistricts,
    territoryMatch,
    customerAddressMatch,
    accuracyStatus,
    verificationStatus,
    verificationReason,
    geocodingProvider: geocoded.provider || 'OSM_NOMINATIM',
  });

  await verificationRecord.save();

  return {
    locationVerificationId: verificationRecord.locationVerificationId,
    _id: verificationRecord._id,
    latitude: lat,
    longitude: lng,
    accuracyMeters: acc,
    accuracyStatus,
    formattedAddress: geocoded.formattedAddress,
    detectedState,
    detectedDistrict,
    authorizedState: authState,
    authorizedDistrict: authDistrict,
    territoryMatch,
    customerAddressMatch,
    verificationStatus,
    verificationReason,
    gpsCapturedAt: verificationRecord.gpsCapturedAt,
    serverTimestamp: verificationRecord.serverTimestamp,
    canProceed: verificationStatus === LOCATION_VERIFICATION_STATUS.VERIFIED,
  };
};

/**
 * 2. Get Location Verification Record by ID
 */
export const getLocationVerificationById = async (id, user) => {
  let query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query._id = id;
  } else {
    query.locationVerificationId = id;
  }

  const record = await LocationVerification.findOne(query)
    .populate('partnerId', 'fullName franchiseId franchiseType mobileNumber email state district')
    .populate('customerId', 'customerId fullName mobileNumber address')
    .populate('installationId', 'installationId connectedLoadKw installedCardCount cardSerialNumbers')
    .populate('auditHistory.reviewedBy', 'fullName email role')
    .lean();

  if (!record) {
    throw new ApiError(404, 'Location verification record not found.');
  }

  return record;
};

/**
 * 3. Super Admin Review / Override of Location Verification
 */
export const adminReviewLocation = async (id, action, reviewReason, user) => {
  if (user.role !== USER_ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Super Admin authorization required to review or override location verifications.');
  }

  if (!['APPROVE', 'REJECT', 'OVERRIDE'].includes(action)) {
    throw new ApiError(400, 'Invalid action. Must be APPROVE, REJECT, or OVERRIDE.');
  }

  if (!reviewReason || !reviewReason.trim()) {
    throw new ApiError(400, 'Mandatory review reason is required to audit this action.');
  }

  let query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query._id = id;
  } else {
    query.locationVerificationId = id;
  }

  const record = await LocationVerification.findOne(query);
  if (!record) {
    throw new ApiError(404, 'Location verification record not found.');
  }

  const previousStatus = record.verificationStatus;
  let newStatus;

  if (action === 'APPROVE') {
    newStatus = LOCATION_VERIFICATION_STATUS.VERIFIED;
  } else if (action === 'REJECT') {
    newStatus = LOCATION_VERIFICATION_STATUS.REJECTED;
  } else {
    newStatus = LOCATION_VERIFICATION_STATUS.ADMIN_OVERRIDDEN;
  }

  // Push audit record
  record.auditHistory.push({
    reviewedBy: user._id,
    reviewedAt: new Date(),
    reviewReason: reviewReason.trim(),
    previousStatus,
    newStatus,
    action,
  });

  record.verificationStatus = newStatus;
  record.verificationReason = `Admin ${action}: ${reviewReason.trim()}`;
  if (action === 'APPROVE' || action === 'OVERRIDE') {
    record.territoryMatch = true;
  }
  await record.save();

  // If linked to an installation, update installation status
  if (record.installationId) {
    await Installation.findByIdAndUpdate(record.installationId, {
      verificationStatus:
        action === 'REJECT'
          ? LOCATION_VERIFICATION_STATUS.REJECTED
          : LOCATION_VERIFICATION_STATUS.VERIFIED,
      territoryMatch: action !== 'REJECT',
    });
  }

  return record;
};

/**
 * 4. Get Location Verification Overview Statistics (Admin Metrics)
 */
export const getLocationVerificationStats = async (user) => {
  const [total, verified, mismatch, lowAccuracy, reviewRequired, rejected] = await Promise.all([
    LocationVerification.countDocuments(),
    LocationVerification.countDocuments({ verificationStatus: LOCATION_VERIFICATION_STATUS.VERIFIED }),
    LocationVerification.countDocuments({ verificationStatus: LOCATION_VERIFICATION_STATUS.TERRITORY_MISMATCH }),
    LocationVerification.countDocuments({ verificationStatus: LOCATION_VERIFICATION_STATUS.LOW_ACCURACY }),
    LocationVerification.countDocuments({ verificationStatus: LOCATION_VERIFICATION_STATUS.REVIEW_REQUIRED }),
    LocationVerification.countDocuments({ verificationStatus: LOCATION_VERIFICATION_STATUS.REJECTED }),
  ]);

  return {
    total,
    verified,
    mismatch,
    lowAccuracy,
    reviewRequired,
    rejected,
  };
};

/**
 * 5. List Location Verifications with Filters & Pagination (Admin View)
 */
export const listLocationVerifications = async (params, user) => {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const query = {};

  if (params.status && params.status.trim()) {
    query.verificationStatus = params.status.trim();
  }

  if (params.accuracyStatus && params.accuracyStatus.trim()) {
    query.accuracyStatus = params.accuracyStatus.trim();
  }

  if (params.state && params.state.trim()) {
    query.state = new RegExp(params.state.trim(), 'i');
  }

  if (params.district && params.district.trim()) {
    query.district = new RegExp(params.district.trim(), 'i');
  }

  if (params.partnerId && mongoose.Types.ObjectId.isValid(params.partnerId)) {
    query.partnerId = params.partnerId;
  }

  if (params.search && params.search.trim()) {
    const s = params.search.trim();
    query.$or = [
      { locationVerificationId: new RegExp(s, 'i') },
      { formattedAddress: new RegExp(s, 'i') },
      { district: new RegExp(s, 'i') },
      { state: new RegExp(s, 'i') },
    ];
  }

  if (params.dateFrom || params.dateTo) {
    query.serverTimestamp = {};
    if (params.dateFrom) query.serverTimestamp.$gte = new Date(params.dateFrom);
    if (params.dateTo) query.serverTimestamp.$lte = new Date(params.dateTo);
  }

  const [records, total] = await Promise.all([
    LocationVerification.find(query)
      .populate('partnerId', 'fullName franchiseId franchiseType state district mobileNumber')
      .populate('customerId', 'customerId fullName mobileNumber')
      .populate('installationId', 'installationId connectedLoadKw installedCardCount cardSerialNumbers')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LocationVerification.countDocuments(query),
  ]);

  return {
    records,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};
