import FranchisePartner from '../models/FranchisePartner.model.js';
import User from '../models/User.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { createFranchisePartner, updateFranchisePartnerStatus } from '../services/partner.service.js';
import { DEFAULT_PAGINATION, ACCOUNT_STATUS } from '../config/constants.js';

// Create New Franchise Partner (Admin Only)
export const createPartner = async (req, res, next) => {
  try {
    const partner = await createFranchisePartner(req.body, req.user._id);

    res.status(201).json(
      new ApiResponse(201, partner, 'Franchise Partner registered successfully.')
    );
  } catch (err) {
    next(err);
  }
};

// Get All Franchise Partners with Search, Filter & Pagination
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
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { mobileNumber: searchRegex },
        { email: searchRegex },
        { franchiseId: searchRegex },
        { city: searchRegex },
      ];
    }

    if (state) {
      query.state = new RegExp(`^${state.trim()}$`, 'i');
    }

    if (district) {
      query.district = new RegExp(`^${district.trim()}$`, 'i');
    }

    if (franchiseType) {
      query.franchiseType = franchiseType;
    }

    if (accountStatus) {
      query.accountStatus = accountStatus;
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

// Get Franchise Partner by ID
export const getPartnerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const partner = await FranchisePartner.findById(id)
      .populate('userId', 'role status lastLoginAt')
      .populate('createdBy', 'fullName email');

    if (!partner) {
      throw new ApiError(404, 'Franchise Partner not found.');
    }

    res.status(200).json(
      new ApiResponse(200, partner, 'Partner details retrieved successfully.')
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
    } = req.body;

    const partner = await FranchisePartner.findById(id);
    if (!partner) {
      throw new ApiError(404, 'Franchise Partner not found.');
    }

    if (fullName) partner.fullName = fullName.trim();
    if (email !== undefined) partner.email = email ? email.toLowerCase().trim() : '';
    if (city) partner.city = city.trim();
    if (addressLine1) partner.addressLine1 = addressLine1.trim();
    if (addressLine2 !== undefined) partner.addressLine2 = addressLine2.trim();
    if (pinCode) partner.pinCode = pinCode.trim();
    if (notes !== undefined) partner.notes = notes.trim();
    if (authorizedDistricts && Array.isArray(authorizedDistricts)) {
      partner.authorizedDistricts = authorizedDistricts;
    }

    await partner.save();

    // Also update User full name / email if changed
    const userUpdates = {};
    if (fullName) userUpdates.fullName = fullName.trim();
    if (email !== undefined) userUpdates.email = email ? email.toLowerCase().trim() : undefined;

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

// Toggle Partner Status (Activate / Deactivate)
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
