import FranchisePartner from '../models/FranchisePartner.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import {
  createFranchisePartner,
  updateFranchisePartnerStatus,
  getPartnerHierarchy as fetchHierarchy,
  deleteFranchisePartner,
} from '../services/partner.service.js';
import { generateFranchiseId } from '../utils/idGenerator.js';
import { verifyGovernmentDocument } from '../utils/govIdValidator.js';
import { scanAndVerifyDocument } from '../utils/documentScanner.js';
import { DEFAULT_PAGINATION, ACCOUNT_STATUS, USER_ROLES, FRANCHISE_TYPES } from '../config/constants.js';

// Preview Generated Franchise ID in Real-Time
export const previewFranchiseId = async (req, res, next) => {
  try {
    const { franchiseType, state, district } = req.query;
    const generatedId = generateFranchiseId(franchiseType, state, district);

    res.status(200).json(
      new ApiResponse(200, { generatedFranchiseId: generatedId }, 'Franchise ID preview generated')
    );
  } catch (err) {
    next(err);
  }
};

// Live Government ID Format Verification
export const verifyGovDocumentLive = async (req, res, next) => {
  try {
    const { idType, idNumber, documentData } = req.body;
    if (!idType || !idNumber) {
      throw new ApiError(400, 'idType and idNumber are required for verification.');
    }

    const verificationResult = verifyGovernmentDocument(idType, idNumber, documentData);

    res.status(200).json(
      new ApiResponse(
        200,
        verificationResult,
        verificationResult.isValid
          ? 'Government document format & checksum verified successfully'
          : verificationResult.message
      )
    );
  } catch (err) {
    next(err);
  }
};

// Deep Document Content & Authenticity Scanner (Inspects uploaded image/PDF)
export const scanUploadedDocument = async (req, res, next) => {
  try {
    const { docType, extractedText, fileMeta } = req.body;

    if (!docType) {
      throw new ApiError(400, 'docType is required.');
    }

    const scanResult = scanAndVerifyDocument(docType, extractedText, fileMeta);

    res.status(200).json(
      new ApiResponse(
        200,
        scanResult,
        scanResult.isAuthentic
          ? 'Document scan passed: Authentic Government ID verified.'
          : scanResult.message
      )
    );
  } catch (err) {
    next(err);
  }
};

// Fetch Eligible Parent Partners (for parent partner dropdown in forms)
export const getEligibleParents = async (req, res, next) => {
  try {
    const { franchiseType, state, district } = req.query;
    const query = { accountStatus: ACCOUNT_STATUS.ACTIVE };

    if (franchiseType === FRANCHISE_TYPES.SUB_FRANCHISE) {
      // Sub-Franchise parent can be District Franchise (in same state & district) or State Franchise
      query.franchiseType = {
        $in: [
          FRANCHISE_TYPES.DISTRICT_FRANCHISE,
          FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
          FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT,
          FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT,
          FRANCHISE_TYPES.STATE_FRANCHISE,
        ],
      };
      if (state) query.state = new RegExp(`^${state.trim()}$`, 'i');
      if (district) {
        query.$or = [
          {
            district: new RegExp(`^${district.trim()}$`, 'i'),
            franchiseType: {
              $in: [
                FRANCHISE_TYPES.DISTRICT_FRANCHISE,
                FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
                FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT,
                FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT,
              ],
            },
          },
          { franchiseType: FRANCHISE_TYPES.STATE_FRANCHISE },
        ];
      }
    } else if (
      franchiseType === FRANCHISE_TYPES.DISTRICT_FRANCHISE ||
      franchiseType === FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT ||
      franchiseType === FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT ||
      franchiseType === FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT
    ) {
      // District Franchise parent can only be a State Franchise in that state
      query.franchiseType = FRANCHISE_TYPES.STATE_FRANCHISE;
      if (state) query.state = new RegExp(`^${state.trim()}$`, 'i');
    } else {
      return res.status(200).json(new ApiResponse(200, [], 'State Franchise has no parent.'));
    }

    const eligibleParents = await FranchisePartner.find(query)
      .select('fullName franchiseId franchiseType state district mobileNumber email')
      .sort({ fullName: 1 })
      .limit(50);

    res.status(200).json(
      new ApiResponse(200, eligibleParents, 'Eligible parent partners retrieved.')
    );
  } catch (err) {
    next(err);
  }
};

// Create New Franchise Partner (Super Admin or Authorized Parent Partner)
export const createPartner = async (req, res, next) => {
  try {
    // If created by a District Partner, automatically set territory and parent
    if (req.user.role === USER_ROLES.DISTRICT_FRANCHISE) {
      req.body.franchiseType = FRANCHISE_TYPES.SUB_FRANCHISE;
      req.body.state = req.partner.state;
      req.body.district = req.partner.district;
      req.body.parentPartnerId = req.partner._id;
    } else if (req.user.role === USER_ROLES.STATE_FRANCHISE) {
      req.body.state = req.partner.state;
      if (!req.body.parentPartnerId) {
        req.body.parentPartnerId = req.partner._id;
      }
    }

    const partner = await createFranchisePartner(req.body, req.user);

    res.status(201).json(
      new ApiResponse(201, partner, 'Franchise Partner registered successfully.')
    );
  } catch (err) {
    next(err);
  }
};

// Get All Franchise Partners with Search, Filter & Pagination (RBAC Aware)
export const getAllPartners = async (req, res, next) => {
  try {
    const {
      page = DEFAULT_PAGINATION.PAGE,
      limit = DEFAULT_PAGINATION.LIMIT,
      search = '',
      state = '',
      district = '',
      franchiseType = '',
      accountStatus = '',
      parentPartnerId = '',
      excludeSubFranchise = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // RBAC Scope Filtering (Exclude self so only downline / network partners are shown)
    if (req.user.role === USER_ROLES.STATE_FRANCHISE && req.partner) {
      query.state = new RegExp(`^${req.partner.state.trim()}$`, 'i');
      query._id = { $ne: req.partner._id };
    } else if (req.user.role === USER_ROLES.DISTRICT_FRANCHISE && req.partner) {
      query._id = { $ne: req.partner._id };
      query.$or = [
        { parentPartnerId: req.partner._id },
        {
          district: new RegExp(`^${req.partner.district.trim()}$`, 'i'),
          state: new RegExp(`^${req.partner.state.trim()}$`, 'i'),
          franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE,
        },
      ];
    } else if (req.user.role === USER_ROLES.SUB_FRANCHISE && req.partner) {
      query._id = { $ne: req.partner._id, parentPartnerId: req.partner._id };
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { fullName: searchRegex },
        { mobileNumber: searchRegex },
        { email: searchRegex },
        { franchiseId: searchRegex },
        { city: searchRegex },
        { govIdNumber: searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    if (state && req.user.role === USER_ROLES.SUPER_ADMIN) {
      query.state = new RegExp(`^${state.trim()}$`, 'i');
    }

    if (district && (req.user.role === USER_ROLES.SUPER_ADMIN || req.user.role === USER_ROLES.STATE_FRANCHISE)) {
      query.district = new RegExp(`^${district.trim()}$`, 'i');
    }

    if (franchiseType) {
      if (franchiseType === 'FRANCHISE_ONLY' || franchiseType === 'STATE_AND_DISTRICT') {
        query.franchiseType = {
          $in: [FRANCHISE_TYPES.STATE_FRANCHISE, FRANCHISE_TYPES.DISTRICT_FRANCHISE],
        };
      } else {
        query.franchiseType = franchiseType;
      }
    } else if (excludeSubFranchise === 'true' || excludeSubFranchise === true) {
      query.franchiseType = {
        $in: [FRANCHISE_TYPES.STATE_FRANCHISE, FRANCHISE_TYPES.DISTRICT_FRANCHISE],
      };
    }

    if (accountStatus) {
      query.accountStatus = accountStatus;
    }

    if (parentPartnerId) {
      query.parentPartnerId = parentPartnerId;
    }


    const pageNumber = Math.max(1, parseInt(page, 10));
    const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * limitNumber;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [partners, total] = await Promise.all([
      FranchisePartner.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNumber)
        .populate('userId', 'role status lastLoginAt')
        .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber')
        .populate('createdBy', 'fullName email'),
      FranchisePartner.countDocuments(query),
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          partners,
          pagination: {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(total / limitNumber),
            hasNextPage: pageNumber * limitNumber < total,
            hasPrevPage: pageNumber > 1,
          },
        },
        'Partners list retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

// Get Franchise Partner by ID (with Parent and Children info)
export const getPartnerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const partner = await FranchisePartner.findById(id)
      .populate('userId', 'role status lastLoginAt')
      .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email state district accountStatus')
      .populate('createdBy', 'fullName email role');

    if (!partner) {
      throw new ApiError(404, 'Franchise Partner not found.');
    }

    // RBAC: If Partner, verify permission to view
    if (req.user.role === USER_ROLES.DISTRICT_FRANCHISE && req.partner) {
      const isSelf = partner._id.equals(req.partner._id);
      const isChild = partner.parentPartnerId && partner.parentPartnerId._id.equals(req.partner._id);
      const isSameDistrict = partner.district.toLowerCase() === req.partner.district.toLowerCase();
      if (!isSelf && !isChild && !isSameDistrict) {
        throw new ApiError(403, 'You are not authorized to view partner details outside your territory.');
      }
    }

    // Fetch direct child partners
    const childPartners = await FranchisePartner.find({ parentPartnerId: partner._id })
      .select('fullName franchiseId franchiseType mobileNumber email state district city accountStatus joiningDate')
      .sort({ createdAt: -1 });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          ...partner.toObject(),
          parentPartner: partner.parentPartnerId,
          childPartners,
          totalChildren: childPartners.length,
          activeChildren: childPartners.filter((c) => c.accountStatus === ACCOUNT_STATUS.ACTIVE).length,
        },
        'Partner details retrieved successfully.'
      )
    );
  } catch (err) {
    next(err);
  }
};

// Get Partner Hierarchy Tree
export const getPartnerHierarchy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hierarchy = await fetchHierarchy(id);

    res.status(200).json(
      new ApiResponse(200, hierarchy, 'Partner hierarchy retrieved successfully.')
    );
  } catch (err) {
    next(err);
  }
};

// Update Franchise Partner Details
export const updatePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      city,
      addressLine1,
      addressLine2,
      pinCode,
      notes,
      authorizedDistricts,
      startDate,
      expiryDate,
      parentPartnerId,
    } = req.body;

    const partner = await FranchisePartner.findById(id);
    if (!partner) {
      throw new ApiError(404, 'Franchise Partner not found.');
    }

    // Territory protection: Non-admins cannot alter state/district
    if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
      if (req.body.state && req.body.state !== partner.state) {
        throw new ApiError(403, 'Partners are not permitted to modify authorized state.');
      }
      if (req.body.district && req.body.district !== partner.district) {
        throw new ApiError(403, 'Partners are not permitted to modify authorized district.');
      }
    } else {
      if (req.body.state) partner.state = req.body.state.trim();
      if (req.body.district) partner.district = req.body.district.trim();
    }

    if (fullName) partner.fullName = fullName.trim();
    if (email) partner.email = email.toLowerCase().trim();
    if (city) partner.city = city.trim();
    if (addressLine1) partner.addressLine1 = addressLine1.trim();
    if (addressLine2 !== undefined) partner.addressLine2 = addressLine2.trim();
    if (pinCode) partner.pinCode = pinCode.trim();
    if (notes !== undefined) partner.notes = notes.trim();
    if (startDate) partner.startDate = new Date(startDate);
    if (expiryDate !== undefined) partner.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (parentPartnerId !== undefined) partner.parentPartnerId = parentPartnerId || null;
    if (authorizedDistricts && Array.isArray(authorizedDistricts)) {
      partner.authorizedDistricts = authorizedDistricts;
    }

    await partner.save();

    const userUpdates = {};
    if (fullName) userUpdates.fullName = fullName.trim();
    if (email) userUpdates.email = email.toLowerCase().trim();

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(partner.userId, userUpdates);
    }

    res.status(200).json(
      new ApiResponse(200, partner, 'Franchise Partner updated successfully.')
    );
  } catch (err) {
    next(err);
  }
};

// Change Partner Status (ACTIVE / INACTIVE / SUSPENDED / EXPIRED)
export const togglePartnerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(ACCOUNT_STATUS).includes(status)) {
      throw new ApiError(
        400,
        `Status must be one of: ${Object.values(ACCOUNT_STATUS).join(', ')}`
      );
    }

    const updatedPartner = await updateFranchisePartnerStatus(id, status);

    res.status(200).json(
      new ApiResponse(
        200,
        updatedPartner,
        `Partner account status changed to ${status}.`
      )
    );
  } catch (err) {
    next(err);
  }
};

// Permanently Delete Franchise Partner (Super Admin Only)
export const deletePartner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteFranchisePartner(id, req.user._id);

    res.status(200).json(
      new ApiResponse(
        200,
        result,
        `Franchise partner ${result.franchiseId} (${result.fullName}) permanently deleted. ${result.reclaimedCardsCount} cards reclaimed to HQ.`
      )
    );
  } catch (err) {
    next(err);
  }
};
