import mongoose from 'mongoose';
import Customer from '../models/Customer.model.js';
import Installation from '../models/Installation.model.js';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import LocationVerification from '../models/LocationVerification.model.js';
import { ApiError } from '../utils/apiError.js';
import { generateCustomerId, generateInstallationId } from '../utils/idGenerator.js';
import { validateInstallationData } from '../validators/installation.validator.js';
import { calculateRecommendedCards, calculateInstallationTotal } from '../config/businessRules.js';
import { verifyCustomerConfirmationOTP } from './customer.service.js';
import { verifyLocation } from './locationVerification.service.js';
import {
  USER_ROLES,
  ACCOUNT_STATUS,
  CARD_STATUS,
  CARD_ACTIONS,
  CARD_OWNER_TYPES,
  CONFIRMATION_STATUS,
  CONFIRMATION_METHODS,
  INSTALLATION_VERIFICATION_STATUS,
  LOCATION_VERIFICATION_STATUS,
  DEFAULT_PAGINATION,
  NOTIFICATION_TYPES,
  ENTITY_TYPES,
} from '../config/constants.js';
import { createNotification, notifySuperAdmins } from './notification.service.js';

// 1. Get Cards Eligible for Installation for the Logged-in Partner
export const getInstallationEligibleCards = async (user, partner) => {
  const query = {};

  if (user.role === USER_ROLES.SUPER_ADMIN) {
    // Super Admin can see available cards
    query.status = { $in: [CARD_STATUS.AVAILABLE, CARD_STATUS.ASSIGNED, CARD_STATUS.TRANSFERRED] };
  } else {
    if (!partner) {
      throw new ApiError(403, 'Franchise Partner profile required to view eligible cards.');
    }
    query.currentOwnerId = partner._id;
    query.currentOwnerType = CARD_OWNER_TYPES.FRANCHISE_PARTNER;
    query.status = { $in: [CARD_STATUS.ASSIGNED, CARD_STATUS.AVAILABLE, CARD_STATUS.TRANSFERRED] };
  }

  const eligibleCards = await Card.find(query)
    .select('serialNumber status currentOwnerId currentOwnerType batchId assignedAt')
    .sort({ serialNumber: 1 })
    .lean();

  return eligibleCards;
};

// 2. Create Installation & Link Customer and Cards (Atomic Operation)
export const createInstallation = async (data, user, partner) => {
  // A. Authenticate Partner & Status
  let executingPartner = partner;
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    if (data.partnerId && mongoose.Types.ObjectId.isValid(data.partnerId)) {
      executingPartner = await FranchisePartner.findById(data.partnerId);
      if (!executingPartner) throw new ApiError(404, 'Specified Franchise Partner not found.');
    } else if (partner) {
      executingPartner = partner;
    }
  }

  if (!executingPartner && user.role !== USER_ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Franchise Partner profile required to perform card installation.');
  }

  if (executingPartner && executingPartner.accountStatus !== ACCOUNT_STATUS.ACTIVE) {
    throw new ApiError(
      400,
      `Cannot proceed with installation: Partner status is ${executingPartner.accountStatus}.`
    );
  }

  // B. Validate Fields
  validateInstallationData(data);

  const {
    fullName,
    mobileNumber,
    alternateMobileNumber = '',
    email = '',
    customerType,
    address,
    electricityDetails,
    cardSerialNumbers = [],
    cardIds = [],
    pricePerCard,
    mcbPhoto,
    billPhoto,
    installedCardPhoto,
    customerSignaturePhoto = '',
    customerOtp,
    skipOtpVerification = false,
    locationVerificationId = null,
    latitude = null,
    longitude = null,
    gpsAccuracy = null,
    gpsTimestamp = null,
    gpsAddress = '',
    detectedDistrict = '',
    detectedState = '',
    territoryMatch = true,
    notes = '',
  } = data;

  // C. Location Verification Lookup or Inline Validation
  let linkedLocationVerification = null;
  if (locationVerificationId) {
    if (mongoose.Types.ObjectId.isValid(locationVerificationId)) {
      linkedLocationVerification = await LocationVerification.findById(locationVerificationId);
    } else {
      linkedLocationVerification = await LocationVerification.findOne({ locationVerificationId });
    }
  } else if (latitude !== null && longitude !== null && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
    // Perform inline location verification if raw coordinates are provided
    const locResult = await verifyLocation(
      {
        latitude,
        longitude,
        accuracy: gpsAccuracy || 10,
        gpsCapturedAt: gpsTimestamp || new Date(),
        customerEnteredState: address.state,
        customerEnteredDistrict: address.district,
        partnerId: executingPartner ? executingPartner._id : null,
      },
      user,
      executingPartner
    );
    linkedLocationVerification = await LocationVerification.findById(locResult._id);
  }

  // Determine territory values
  const finalLat = linkedLocationVerification ? linkedLocationVerification.latitude : (latitude ? parseFloat(latitude) : null);
  const finalLng = linkedLocationVerification ? linkedLocationVerification.longitude : (longitude ? parseFloat(longitude) : null);
  const finalAccuracy = linkedLocationVerification ? linkedLocationVerification.accuracyMeters : (gpsAccuracy ? parseFloat(gpsAccuracy) : null);
  const finalGpsTimestamp = linkedLocationVerification ? linkedLocationVerification.gpsCapturedAt : (gpsTimestamp ? new Date(gpsTimestamp) : null);
  const finalGpsAddress = linkedLocationVerification ? linkedLocationVerification.formattedAddress : (gpsAddress || '');
  const finalDetectedDistrict = linkedLocationVerification ? linkedLocationVerification.district : (detectedDistrict || address.district);
  const finalDetectedState = linkedLocationVerification ? linkedLocationVerification.state : (detectedState || address.state);
  const finalTerritoryMatch = linkedLocationVerification ? linkedLocationVerification.territoryMatch : territoryMatch;
  const finalVerificationStatus = finalTerritoryMatch
    ? INSTALLATION_VERIFICATION_STATUS.CONFIRMED
    : INSTALLATION_VERIFICATION_STATUS.FLAGGED;

  // C. Territory Authorization Verification
  if (executingPartner && user.role !== USER_ROLES.SUPER_ADMIN) {
    const custState = (address.state || '').trim().toLowerCase();
    const custDistrict = (address.district || '').trim().toLowerCase();
    const partnerState = (executingPartner.state || '').trim().toLowerCase();
    const partnerDistrict = (executingPartner.district || '').trim().toLowerCase();
    const partnerAuthDistricts = (executingPartner.authorizedDistricts || []).map((d) =>
      d.trim().toLowerCase()
    );

    let isViolated = false;
    let violationMessage = '';

    if (executingPartner.franchiseType === 'STATE_FRANCHISE') {
      if (custState !== partnerState) {
        isViolated = true;
        violationMessage = `Territory Violation: Customer state "${address.state}" is outside your authorized state "${executingPartner.state}".`;
      }
    } else {
      // District / Sub Franchise
      const isDistrictAuthorized =
        custDistrict === partnerDistrict || partnerAuthDistricts.includes(custDistrict);
      if (custState !== partnerState || !isDistrictAuthorized) {
        isViolated = true;
        violationMessage = `Territory Violation: Installation address (${address.district}, ${address.state}) is outside your authorized district (${executingPartner.district}, ${executingPartner.state}).`;
      }
    }

    if (isViolated) {
      // Dispatch in-app notification to Super Admin & Parent Partner
      if (executingPartner.parentPartnerId) {
        FranchisePartner.findById(executingPartner.parentPartnerId).populate('userId').then((parentPartner) => {
          if (parentPartner?.userId) {
            const parentUserId = parentPartner.userId._id || parentPartner.userId;
            createNotification({
              recipientUserId: parentUserId,
              recipientPartnerId: parentPartner._id,
              type: NOTIFICATION_TYPES.TERRITORY_MISMATCH,
              title: `🚨 Sub-Franchise Territory Breach: ${executingPartner.fullName}`,
              message: `Sub-Partner ${executingPartner.fullName} (${executingPartner.franchiseId}) attempted installation in ${address.district}, ${address.state} (Authorized: ${executingPartner.district}, ${executingPartner.state}).`,
              entityType: ENTITY_TYPES.LOCATION_VERIFICATION,
              metadata: {
                subPartnerName: executingPartner.fullName,
                subPartnerCode: executingPartner.franchiseId,
                parentPartnerName: parentPartner.fullName,
                attemptedState: address.state,
                attemptedDistrict: address.district,
                authorizedState: executingPartner.state,
                authorizedDistrict: executingPartner.district,
              },
            }).catch(() => {});
          }
        }).catch(() => {});
      }

      notifySuperAdmins({
        type: NOTIFICATION_TYPES.TERRITORY_MISMATCH,
        title: `🚨 Geofence Breach: ${executingPartner.fullName}`,
        message: `Partner ${executingPartner.fullName} (${executingPartner.franchiseId}) attempted installation in ${address.district}, ${address.state} (Authorized: ${executingPartner.district}, ${executingPartner.state}).`,
        entityType: ENTITY_TYPES.LOCATION_VERIFICATION,
        metadata: {
          partnerName: executingPartner.fullName,
          partnerCode: executingPartner.franchiseId,
          attemptedState: address.state,
          attemptedDistrict: address.district,
          authorizedState: executingPartner.state,
          authorizedDistrict: executingPartner.district,
        },
      }).catch(() => {});

      throw new ApiError(403, violationMessage);
    }
  }

  // D. Card Selection & Strict Ownership / Status Checks
  const cardQuery = {};
  if (cardSerialNumbers.length > 0) {
    cardQuery.serialNumber = { $in: cardSerialNumbers.map((s) => s.trim().toUpperCase()) };
  } else if (cardIds.length > 0) {
    cardQuery._id = { $in: cardIds };
  }

  const cards = await Card.find(cardQuery);
  const targetCount = cardSerialNumbers.length > 0 ? cardSerialNumbers.length : cardIds.length;

  if (cards.length !== targetCount) {
    throw new ApiError(
      400,
      `Card selection error: Found ${cards.length} valid cards in inventory for ${targetCount} requested.`
    );
  }

  // Verify each card
  for (const card of cards) {
    if (executingPartner) {
      if (!card.currentOwnerId || String(card.currentOwnerId) !== String(executingPartner._id)) {
        throw new ApiError(
          403,
          `Card ownership error: Card "${card.serialNumber}" does not belong to ${executingPartner.fullName}.`
        );
      }
    }

    if (card.status === CARD_STATUS.INSTALLED) {
      throw new ApiError(
        400,
        `Card "${card.serialNumber}" is no longer available for installation (already INSTALLED with customer ${card.customerId || ''}).`
      );
    }

    if (card.status === CARD_STATUS.BLOCKED) {
      throw new ApiError(
        400,
        `Card "${card.serialNumber}" is currently BLOCKED / on QC Hold and cannot be installed.`
      );
    }

    if (card.status === CARD_STATUS.PENDING_TRANSFER) {
      throw new ApiError(
        400,
        `Card "${card.serialNumber}" is reserved in a pending transfer transaction and cannot be installed.`
      );
    }
  }

  // E. Connected Load & Business Rules Recalculation (Load + Monthly Bill + Peak Bill + Phase)
  const loadKw = parseFloat(electricityDetails.connectedLoadKw) || 0;
  const recommendedCardCount = calculateRecommendedCards({
    connectedLoadKw: loadKw,
    monthlyElectricityBill: parseFloat(electricityDetails.monthlyElectricityBill) || 0,
    highestElectricityBill12Months: parseFloat(electricityDetails.highestElectricityBill12Months) || 0,
    phase: electricityDetails.phase || 'SINGLE_PHASE',
  });
  const installedCardCount = cards.length;
  const verifiedPricePerCard = Math.max(0, parseFloat(pricePerCard) || 0);
  const totalAmount = calculateInstallationTotal(installedCardCount, verifiedPricePerCard);

  // F. Customer Confirmation OTP Verification (Optional / Skipped)
  if (!skipOtpVerification && customerOtp) {
    await verifyCustomerConfirmationOTP(mobileNumber, customerOtp);
  }

  const installationDateTime = new Date();

  // G. Customer Lookup / Auto-Generation
  let customer = await Customer.findOne({
    mobileNumber: String(mobileNumber).trim(),
    createdByPartnerId: executingPartner ? executingPartner._id : user._id,
  });

  if (!customer) {
    // Generate Unique Customer ID
    let customerId;
    let isCustIdUnique = false;
    let custAttempts = 0;
    while (!isCustIdUnique && custAttempts < 10) {
      const count = (await Customer.countDocuments()) + custAttempts + 1;
      customerId = generateCustomerId(count);
      const existing = await Customer.findOne({ customerId });
      if (!existing) isCustIdUnique = true;
      custAttempts++;
    }

    customer = new Customer({
      customerId,
      fullName: fullName.trim(),
      mobileNumber: String(mobileNumber).trim(),
      alternateMobileNumber: alternateMobileNumber ? String(alternateMobileNumber).trim() : '',
      email: email ? email.trim().toLowerCase() : '',
      customerType,
      address: {
        houseOrShopNumber: address.houseOrShopNumber || '',
        street: address.street || '',
        locality: address.locality || '',
        city: address.city.trim(),
        district: address.district.trim(),
        state: address.state.trim(),
        pinCode: String(address.pinCode).trim(),
        landmark: address.landmark || '',
        fullAddress:
          address.fullAddress ||
          `${address.houseOrShopNumber || ''} ${address.street || ''} ${address.locality || ''}, ${address.city}, ${address.district}, ${address.state} - ${address.pinCode}`.trim(),
      },
      electricityDetails: {
        connectedLoadKw: loadKw,
        monthlyElectricityBill: parseFloat(electricityDetails.monthlyElectricityBill) || 0,
        highestElectricityBill12Months:
          parseFloat(electricityDetails.highestElectricityBill12Months) || 0,
        highestBillPhotoUrl: billPhoto,
        electricityBoard: electricityDetails.electricityBoard || '',
        consumerAccountNumber: electricityDetails.consumerAccountNumber || '',
        meterNumber: electricityDetails.meterNumber || '',
        sanctionedLoad: electricityDetails.sanctionedLoad || '',
        phase: electricityDetails.phase || 'SINGLE_PHASE',
      },
      createdByPartnerId: executingPartner ? executingPartner._id : user._id,
      createdByPartnerType: executingPartner ? (executingPartner.franchiseType || 'DISTRICT_FRANCHISE') : 'SUPER_ADMIN',
      parentPartnerId: executingPartner?.parentPartnerId ? executingPartner.parentPartnerId : null,
      status: ACCOUNT_STATUS.ACTIVE,
      installedCardCount,
      lastInstallationDate: installationDateTime,
      notes,
    });

    await customer.save();
  } else {
    // Update existing customer stats
    customer.installedCardCount += installedCardCount;
    customer.lastInstallationDate = installationDateTime;
    customer.electricityDetails.connectedLoadKw = loadKw;
    if (billPhoto) customer.electricityDetails.highestBillPhotoUrl = billPhoto;
    if (!customer.createdByPartnerType && executingPartner) {
      customer.createdByPartnerType = executingPartner.franchiseType || 'DISTRICT_FRANCHISE';
    }
    if (!customer.parentPartnerId && executingPartner?.parentPartnerId) {
      customer.parentPartnerId = executingPartner.parentPartnerId;
    }
    await customer.save();
  }

  // H. Generate Unique Installation ID
  let installationId;
  let isInsIdUnique = false;
  let insAttempts = 0;
  while (!isInsIdUnique && insAttempts < 10) {
    const count = (await Installation.countDocuments()) + insAttempts + 1;
    installationId = generateInstallationId(count);
    const existing = await Installation.findOne({ installationId });
    if (!existing) isInsIdUnique = true;
    insAttempts++;
  }

  // I. Create Installation Record
  const newInstallation = await Installation.create({
    installationId,
    customerId: customer._id,
    partnerId: executingPartner ? executingPartner._id : user._id,
    createdByPartnerId: executingPartner ? executingPartner._id : user._id,
    createdByPartnerType: executingPartner ? (executingPartner.franchiseType || 'DISTRICT_FRANCHISE') : 'SUPER_ADMIN',
    parentPartnerId: executingPartner?.parentPartnerId ? executingPartner.parentPartnerId : null,
    cardIds: cards.map((c) => c._id),
    cardSerialNumbers: cards.map((c) => c.serialNumber),
    customerType,
    installationDateTime,
    installationAddress: customer.address,
    connectedLoadKw: loadKw,
    recommendedCardCount,
    installedCardCount,
    monthlyElectricityBill: parseFloat(electricityDetails.monthlyElectricityBill) || 0,
    highestElectricityBill12Months:
      parseFloat(electricityDetails.highestElectricityBill12Months) || 0,
    electricityBoard: electricityDetails.electricityBoard || '',
    consumerAccountNumber: electricityDetails.consumerAccountNumber || '',
    meterNumber: electricityDetails.meterNumber || '',
    sanctionedLoad: electricityDetails.sanctionedLoad || '',
    phase: electricityDetails.phase || 'SINGLE_PHASE',
    pricePerCard: verifiedPricePerCard,
    totalAmount,
    currency: 'INR',
    mcbPhoto,
    billPhoto,
    installedCardPhoto,
    customerSignaturePhoto,
    customerConfirmationStatus: CONFIRMATION_STATUS.CONFIRMED,
    customerConfirmedAt: installationDateTime,
    customerConfirmationMethod: CONFIRMATION_METHODS.OTP,
    locationVerificationId: linkedLocationVerification ? linkedLocationVerification._id : null,
    latitude: finalLat,
    longitude: finalLng,
    gpsAccuracy: finalAccuracy,
    gpsTimestamp: finalGpsTimestamp,
    gpsAddress: finalGpsAddress,
    detectedDistrict: finalDetectedDistrict,
    detectedState: finalDetectedState,
    territoryMatch: finalTerritoryMatch,
    verificationStatus: finalVerificationStatus,
    notes,
    createdBy: user._id,
  });

  // Link LocationVerification record with newly generated Installation and Customer IDs
  if (linkedLocationVerification) {
    await LocationVerification.findByIdAndUpdate(linkedLocationVerification._id, {
      installationId: newInstallation._id,
      customerId: customer._id,
    });
  }

  // J. Atomic Update Cards to INSTALLED
  await Card.updateMany(
    { _id: { $in: cards.map((c) => c._id) } },
    {
      $set: {
        status: CARD_STATUS.INSTALLED,
        customerId: customer._id,
        installationId: newInstallation.installationId,
        installationDate: installationDateTime,
        notes: `Installed with customer ${customer.fullName} (${customer.customerId}) on ${installationDateTime.toLocaleDateString()}`,
      },
    }
  );

  // K. Write Immutable Card History Records
  const historyRecords = cards.map((card) => ({
    cardId: card._id,
    serialNumber: card.serialNumber,
    action: CARD_ACTIONS.INSTALLED,
    fromOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
    fromOwnerId: executingPartner ? executingPartner._id : null,
    toOwnerType: null,
    toOwnerId: null,
    previousStatus: card.status,
    newStatus: CARD_STATUS.INSTALLED,
    performedBy: user._id,
    performedByRole: user.role,
    reason: `Card successfully installed for customer ${customer.fullName} (${customer.customerId}) by ${executingPartner ? executingPartner.fullName : 'Admin'} (${executingPartner?.franchiseType || user.role}). Connected load: ${loadKw} kW. Total amount: ₹${totalAmount}. Installation: ${installationId}`,
    metadata: {
      customerId: customer.customerId,
      customerName: customer.fullName,
      customerMobile: customer.mobileNumber,
      installationId: newInstallation.installationId,
      partnerId: executingPartner ? executingPartner._id : null,
      partnerType: executingPartner ? executingPartner.franchiseType : 'SUPER_ADMIN',
      parentPartnerId: executingPartner?.parentPartnerId ? executingPartner.parentPartnerId : null,
      connectedLoadKw: loadKw,
      recommendedCardCount,
      installedCardCount,
      pricePerCard: verifiedPricePerCard,
      totalAmount,
    },
    timestamp: installationDateTime,
  }));

  await CardHistory.insertMany(historyRecords, { ordered: false });

  // L. Dispatch In-App Notification to Parent Franchise Partner (if installed by Sub-Franchise)
  const timeFormatted = new Date(installationDateTime).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const dateFormatted = new Date(installationDateTime).toLocaleDateString('en-IN');

  if (executingPartner && executingPartner.parentPartnerId) {
    FranchisePartner.findById(executingPartner.parentPartnerId)
      .populate('userId')
      .then(async (parentPartner) => {
        if (parentPartner && parentPartner.userId) {
          const parentUserId = parentPartner.userId._id || parentPartner.userId;
          await createNotification({
            recipientUserId: parentUserId,
            recipientPartnerId: parentPartner._id,
            type: NOTIFICATION_TYPES.INSTALLATION_SUBMITTED,
            title: `⚡ Sub-Franchise Installation: ${installedCardCount} Card(s) by ${executingPartner.fullName}`,
            message: `Aapke sub-franchise partner ${executingPartner.fullName} (${executingPartner.franchiseId || 'Sub-Partner'}) ne ${dateFormatted} ko ${timeFormatted} baje customer ${customer.fullName} ke yahan ${installedCardCount} card(s) install kar diye hain. (Installation ID: ${newInstallation.installationId})`,
            entityType: ENTITY_TYPES.INSTALLATION,
            entityId: newInstallation.installationId,
            metadata: {
              installationId: newInstallation.installationId,
              subPartnerId: executingPartner._id,
              subPartnerName: executingPartner.fullName,
              subPartnerFranchiseId: executingPartner.franchiseId,
              installedCardCount,
              cardSerialNumbers: cards.map((c) => c.serialNumber),
              customerName: customer.fullName,
              customerId: customer.customerId,
              customerCity: customer.address?.city || customer.city || address?.city || '',
              installedAt: installationDateTime,
              timeFormatted: `${timeFormatted}, ${dateFormatted}`,
            },
          });
        }
      })
      .catch((err) => {
        console.warn('Sub-franchise installation notification dispatch note:', err?.message);
      });
  }

  // Notify Super Admins
  notifySuperAdmins({
    type: NOTIFICATION_TYPES.INSTALLATION_SUBMITTED,
    title: `⚡ New Installation: ${installedCardCount} Card(s) by ${executingPartner ? executingPartner.fullName : 'Admin'}`,
    message: `${executingPartner ? `${executingPartner.fullName} (${executingPartner.franchiseId})` : 'Admin'} recorded ${installedCardCount} card(s) installed for customer ${customer.fullName} at ${timeFormatted} on ${dateFormatted}. (ID: ${newInstallation.installationId})`,
    entityType: ENTITY_TYPES.INSTALLATION,
    entityId: newInstallation.installationId,
    metadata: {
      installationId: newInstallation.installationId,
      partnerName: executingPartner?.fullName,
      partnerFranchiseId: executingPartner?.franchiseId,
      installedCardCount,
      cardSerialNumbers: cards.map((c) => c.serialNumber),
      customerName: customer.fullName,
      customerId: customer.customerId,
      installedAt: installationDateTime,
      timeFormatted: `${timeFormatted}, ${dateFormatted}`,
    },
  }).catch(() => {});

  return {
    installation: newInstallation,
    customer,
  };
};

// 3. Get All Installations with Filters, Search, and Pagination
export const getInstallations = async (queryParams, user, partner) => {
  const {
    page = DEFAULT_PAGINATION.PAGE,
    limit = DEFAULT_PAGINATION.LIMIT,
    search = '',
    customerType,
    partnerId,
    source = 'ALL', // 'ALL' | 'MY_INSTALLATIONS' | 'SUB_FRANCHISE_INSTALLATIONS'
    state,
    district,
    confirmationStatus,
    verificationStatus,
    startDate,
    endDate,
    sortBy = 'installationDateTime',
    sortOrder = 'desc',
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  // RBAC Scope
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    if (partnerId && mongoose.Types.ObjectId.isValid(partnerId)) {
      const subPartnerIds = await FranchisePartner.find({
        parentPartnerId: partnerId,
      }).distinct('_id');
      if (source === 'MY_INSTALLATIONS') {
        filter.partnerId = partnerId;
      } else if (source === 'SUB_FRANCHISE_INSTALLATIONS') {
        filter.partnerId = { $in: subPartnerIds };
      } else {
        filter.$or = [{ partnerId }, { partnerId: { $in: subPartnerIds } }, { parentPartnerId: partnerId }];
      }
    } else if (source === 'SUB_FRANCHISE_INSTALLATIONS') {
      const subPartnerIds = await FranchisePartner.find({
        franchiseType: 'SUB_FRANCHISE',
      }).distinct('_id');
      filter.partnerId = { $in: subPartnerIds };
    } else if (source === 'MY_INSTALLATIONS') {
      const mainPartnerIds = await FranchisePartner.find({
        franchiseType: { $ne: 'SUB_FRANCHISE' },
      }).distinct('_id');
      filter.partnerId = { $in: mainPartnerIds };
    }
  } else {
    if (!partner) {
      throw new ApiError(403, 'Franchise Partner profile required to view installations.');
    }
    if (partner.franchiseType === 'SUB_FRANCHISE') {
      filter.partnerId = partner._id;
    } else if (
      partner.franchiseType === 'DISTRICT_FRANCHISE' ||
      partner.franchiseType === 'NON_EXCLUSIVE_DISTRICT' ||
      partner.franchiseType === 'STANDARD_EXCLUSIVE_DISTRICT' ||
      partner.franchiseType === 'PREMIUM_EXCLUSIVE_DISTRICT'
    ) {
      const subPartnerIds = await FranchisePartner.find({
        parentPartnerId: partner._id,
      }).distinct('_id');

      if (source === 'MY_INSTALLATIONS') {
        filter.partnerId = partner._id;
      } else if (source === 'SUB_FRANCHISE_INSTALLATIONS') {
        filter.partnerId = { $in: subPartnerIds };
      } else {
        filter.$or = [
          { partnerId: partner._id },
          { partnerId: { $in: subPartnerIds } },
          { parentPartnerId: partner._id },
        ];
      }
    } else if (partner.franchiseType === 'STATE_FRANCHISE') {
      const downlinePartnerIds = await FranchisePartner.find({
        $or: [{ parentPartnerId: partner._id }, { _id: partner._id }, { state: partner.state }],
      }).distinct('_id');

      const subPartnerIds = await FranchisePartner.find({
        $or: [{ parentPartnerId: partner._id }, { state: partner.state }],
      }).distinct('_id');

      if (source === 'MY_INSTALLATIONS') {
        filter.partnerId = partner._id;
      } else if (source === 'SUB_FRANCHISE_INSTALLATIONS') {
        filter.partnerId = { $in: subPartnerIds };
      } else {
        filter.$or = [
          { partnerId: partner._id },
          { partnerId: { $in: downlinePartnerIds } },
          { parentPartnerId: partner._id },
          { partnerId: { $in: subPartnerIds } },
        ];
      }
    } else {
      filter.partnerId = partner._id;
    }
  }

  if (customerType) filter.customerType = customerType;
  if (confirmationStatus) filter.customerConfirmationStatus = confirmationStatus;
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (state) filter['installationAddress.state'] = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
  if (district) filter['installationAddress.district'] = { $regex: new RegExp(`^${district.trim()}$`, 'i') };

  if (startDate || endDate) {
    filter.installationDateTime = {};
    if (startDate) filter.installationDateTime.$gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      filter.installationDateTime.$lte = e;
    }
  }

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { installationId: { $regex: s, $options: 'i' } },
      { cardSerialNumbers: { $regex: s, $options: 'i' } },
      { consumerAccountNumber: { $regex: s, $options: 'i' } },
      { meterNumber: { $regex: s, $options: 'i' } },
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [installations, totalRecords] = await Promise.all([
    Installation.find(filter)
      .populate('customerId', 'customerId fullName mobileNumber customerType address')
      .populate({
        path: 'partnerId',
        select: 'fullName franchiseId franchiseType mobileNumber district state parentPartnerId',
        populate: {
          path: 'parentPartnerId',
          select: 'fullName franchiseId franchiseType mobileNumber district state',
        },
      })
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Installation.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalRecords / limitNum) || 1;

  return {
    installations,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalRecords,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

// 4. Get Installation by ID
export const getInstallationById = async (id, user, partner) => {
  let installation;

  if (mongoose.Types.ObjectId.isValid(id)) {
    installation = await Installation.findById(id)
      .populate('customerId')
      .populate({
        path: 'partnerId',
        select: 'fullName franchiseId franchiseType mobileNumber email district state parentPartnerId',
        populate: {
          path: 'parentPartnerId',
          select: 'fullName franchiseId franchiseType mobileNumber district state',
        },
      })
      .populate('cardIds', 'serialNumber status batchId installationDate');
  } else {
    installation = await Installation.findOne({ installationId: id.toUpperCase() })
      .populate('customerId')
      .populate({
        path: 'partnerId',
        select: 'fullName franchiseId franchiseType mobileNumber email district state parentPartnerId',
        populate: {
          path: 'parentPartnerId',
          select: 'fullName franchiseId franchiseType mobileNumber district state',
        },
      })
      .populate('cardIds', 'serialNumber status batchId installationDate');
  }

  if (!installation) {
    throw new ApiError(404, 'Installation record not found.');
  }

  // RBAC scope check
  if (user.role !== USER_ROLES.SUPER_ADMIN && partner) {
    const isOwner = String(installation.partnerId?._id || installation.partnerId) === String(partner._id);
    if (!isOwner && partner.franchiseType !== 'STATE_FRANCHISE' && partner.franchiseType !== 'DISTRICT_FRANCHISE') {
      throw new ApiError(403, 'Access denied: You are not authorized to view this installation.');
    }
  }

  return installation;
};
