import mongoose from 'mongoose';
import Customer from '../models/Customer.model.js';
import Installation from '../models/Installation.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { ApiError } from '../utils/apiError.js';
import { generateCustomerId } from '../utils/idGenerator.js';
import { validateCustomerData } from '../validators/customer.validator.js';
import { createAndSendOTP, verifyOTP } from './otp.service.js';
import {
  USER_ROLES,
  ACCOUNT_STATUS,
  OTP_PURPOSE,
  DEFAULT_PAGINATION,
} from '../config/constants.js';

// Send OTP to Customer Mobile for Installation Confirmation
export const sendCustomerConfirmationOTP = async (mobileNumber) => {
  const cleanMobile = String(mobileNumber).trim();
  if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
    throw new ApiError(400, 'Please provide a valid 10-digit Indian mobile number.');
  }

  return await createAndSendOTP(cleanMobile, OTP_PURPOSE.CUSTOMER_CONFIRMATION);
};

// Verify Customer Confirmation OTP
export const verifyCustomerConfirmationOTP = async (mobileNumber, otp) => {
  const cleanMobile = String(mobileNumber).trim();
  const cleanOtp = String(otp).trim();

  if (!cleanMobile || !cleanOtp) {
    throw new ApiError(400, 'Mobile number and OTP are required.');
  }

  return await verifyOTP(cleanMobile, cleanOtp, OTP_PURPOSE.CUSTOMER_CONFIRMATION);
};

// Get List of Customers with Search, Filters, and RBAC Scope
export const getCustomers = async (queryParams, user, partner) => {
  const {
    page = DEFAULT_PAGINATION.PAGE,
    limit = DEFAULT_PAGINATION.LIMIT,
    search = '',
    customerType,
    state,
    district,
    partnerId,
    status,
    source = 'ALL', // 'ALL' | 'MY_CUSTOMERS' | 'SUB_FRANCHISE_CUSTOMERS'
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  // 1. RBAC Scoping & Multi-Tier Hierarchy
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    if (partnerId && mongoose.Types.ObjectId.isValid(partnerId)) {
      const subPartnerIds = await FranchisePartner.find({
        parentPartnerId: partnerId,
      }).distinct('_id');
      if (source === 'MY_CUSTOMERS') {
        filter.createdByPartnerId = partnerId;
      } else if (source === 'SUB_FRANCHISE_CUSTOMERS') {
        filter.createdByPartnerId = { $in: subPartnerIds };
      } else {
        filter.$or = [
          { createdByPartnerId: partnerId },
          { createdByPartnerId: { $in: subPartnerIds } },
          { parentPartnerId: partnerId },
        ];
      }
    } else if (source === 'SUB_FRANCHISE_CUSTOMERS') {
      const subPartnerIds = await FranchisePartner.find({
        franchiseType: 'SUB_FRANCHISE',
      }).distinct('_id');
      filter.createdByPartnerId = { $in: subPartnerIds };
    } else if (source === 'MY_CUSTOMERS') {
      const mainPartnerIds = await FranchisePartner.find({
        franchiseType: { $ne: 'SUB_FRANCHISE' },
      }).distinct('_id');
      filter.createdByPartnerId = { $in: mainPartnerIds };
    }
  } else {
    // Partner scope:
    if (!partner) {
      throw new ApiError(403, 'Franchise Partner profile required to view customers.');
    }

    if (partner.franchiseType === 'SUB_FRANCHISE') {
      // Sub-Franchise can ONLY see customers created by themselves
      filter.createdByPartnerId = partner._id;
    } else if (
      partner.franchiseType === 'DISTRICT_FRANCHISE' ||
      partner.franchiseType === 'NON_EXCLUSIVE_DISTRICT' ||
      partner.franchiseType === 'STANDARD_EXCLUSIVE_DISTRICT' ||
      partner.franchiseType === 'PREMIUM_EXCLUSIVE_DISTRICT'
    ) {
      const subPartnerIds = await FranchisePartner.find({
        parentPartnerId: partner._id,
      }).distinct('_id');

      if (source === 'MY_CUSTOMERS') {
        filter.createdByPartnerId = partner._id;
      } else if (source === 'SUB_FRANCHISE_CUSTOMERS') {
        filter.createdByPartnerId = { $in: subPartnerIds };
      } else {
        // ALL AUTHORIZED CUSTOMERS (Own + Sub-Franchises)
        filter.$or = [
          { createdByPartnerId: partner._id },
          { createdByPartnerId: { $in: subPartnerIds } },
          { parentPartnerId: partner._id },
        ];
      }
    } else if (partner.franchiseType === 'STATE_FRANCHISE') {
      const downlinePartnerIds = await FranchisePartner.find({
        $or: [{ parentPartnerId: partner._id }, { _id: partner._id }, { state: partner.state }],
      }).distinct('_id');

      const subPartnerIds = await FranchisePartner.find({
        $or: [{ parentPartnerId: partner._id }, { state: partner.state }],
        franchiseType: 'SUB_FRANCHISE',
      }).distinct('_id');

      if (source === 'MY_CUSTOMERS') {
        filter.createdByPartnerId = partner._id;
      } else if (source === 'SUB_FRANCHISE_CUSTOMERS') {
        filter.createdByPartnerId = { $in: subPartnerIds };
      } else {
        filter.createdByPartnerId = { $in: downlinePartnerIds };
      }
    } else {
      filter.createdByPartnerId = partner._id;
    }
  }

  // 2. Filters
  if (customerType) {
    filter.customerType = customerType;
  }

  if (status) {
    filter.status = status;
  }

  if (state) {
    filter['address.state'] = { $regex: new RegExp(`^${state.trim()}$`, 'i') };
  }

  if (district) {
    filter['address.district'] = { $regex: new RegExp(`^${district.trim()}$`, 'i') };
  }

  // 3. Search query
  if (search && search.trim()) {
    const s = search.trim();
    const searchConditions = [
      { customerId: { $regex: s, $options: 'i' } },
      { fullName: { $regex: s, $options: 'i' } },
      { mobileNumber: { $regex: s, $options: 'i' } },
      { 'address.city': { $regex: s, $options: 'i' } },
      { 'address.district': { $regex: s, $options: 'i' } },
    ];

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [customers, totalRecords] = await Promise.all([
    Customer.find(filter)
      .populate('createdByPartnerId', 'fullName franchiseId franchiseType mobileNumber district state')
      .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber district state')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalRecords / limitNum) || 1;

  return {
    customers,
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

// Get Single Customer by ID or customerId with Installation History
export const getCustomerById = async (id, user, partner) => {
  let customer;

  if (mongoose.Types.ObjectId.isValid(id)) {
    customer = await Customer.findById(id)
      .populate('createdByPartnerId', 'fullName franchiseId franchiseType mobileNumber email district state')
      .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email district state');
  } else {
    customer = await Customer.findOne({ customerId: id.toUpperCase() })
      .populate('createdByPartnerId', 'fullName franchiseId franchiseType mobileNumber email district state')
      .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email district state');
  }

  if (!customer) {
    throw new ApiError(404, 'Customer record not found.');
  }

  // Security & Authorization check
  if (user.role !== USER_ROLES.SUPER_ADMIN && partner) {
    const isDirectOwner = String(customer.createdByPartnerId?._id || customer.createdByPartnerId) === String(partner._id);
    const isParentOwner = String(customer.parentPartnerId?._id || customer.parentPartnerId) === String(partner._id);
    const isStateOrDistrict =
      partner.franchiseType === 'STATE_FRANCHISE' ||
      partner.franchiseType === 'DISTRICT_FRANCHISE' ||
      partner.franchiseType === 'NON_EXCLUSIVE_DISTRICT' ||
      partner.franchiseType === 'STANDARD_EXCLUSIVE_DISTRICT' ||
      partner.franchiseType === 'PREMIUM_EXCLUSIVE_DISTRICT';

    if (!isDirectOwner && !isParentOwner && !isStateOrDistrict) {
      throw new ApiError(403, 'Access denied: You are not authorized to view this customer.');
    }
  }

  // Fetch installation history for this customer
  const installations = await Installation.find({ customerId: customer._id })
    .populate('partnerId', 'fullName franchiseId franchiseType mobileNumber district state')
    .populate('createdByPartnerId', 'fullName franchiseId franchiseType mobileNumber district state')
    .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber district state')
    .sort({ installationDateTime: -1 })
    .lean();

  return {
    customer,
    installations,
  };
};
