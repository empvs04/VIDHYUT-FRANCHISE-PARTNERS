import mongoose from 'mongoose';
import { CUSTOMER_TYPES, ACCOUNT_STATUS, ELECTRICITY_PHASES } from '../config/constants.js';

const addressSchema = new mongoose.Schema(
  {
    houseOrShopNumber: {
      type: String,
      trim: true,
      default: '',
    },
    street: {
      type: String,
      trim: true,
      default: '',
    },
    locality: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      index: true,
    },
    pinCode: {
      type: String,
      required: [true, 'PIN code is required'],
      trim: true,
      match: [/^\d{6}$/, 'Please provide a valid 6-digit PIN code'],
    },
    landmark: {
      type: String,
      trim: true,
      default: '',
    },
    fullAddress: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const electricityDetailsSchema = new mongoose.Schema(
  {
    connectedLoadKw: {
      type: Number,
      required: [true, 'Connected load in kW is required'],
      min: [0.1, 'Connected load must be greater than 0 kW'],
    },
    monthlyElectricityBill: {
      type: Number,
      min: [0, 'Monthly bill cannot be negative'],
      default: 0,
    },
    highestElectricityBill12Months: {
      type: Number,
      min: [0, 'Highest 12M bill cannot be negative'],
      default: 0,
    },
    highestBillPhotoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    electricityBoard: {
      type: String,
      trim: true,
      default: '',
    },
    consumerAccountNumber: {
      type: String,
      trim: true,
      default: '',
    },
    meterNumber: {
      type: String,
      trim: true,
      default: '',
    },
    sanctionedLoad: {
      type: String,
      trim: true,
      default: '',
    },
    phase: {
      type: String,
      enum: Object.values(ELECTRICITY_PHASES),
      default: ELECTRICITY_PHASES.SINGLE_PHASE,
    },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      index: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'],
    },
    alternateMobileNumber: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    customerType: {
      type: String,
      enum: Object.values(CUSTOMER_TYPES),
      default: CUSTOMER_TYPES.RESIDENTIAL,
      required: [true, 'Customer type is required'],
      index: true,
    },
    address: {
      type: addressSchema,
      required: [true, 'Address is required'],
    },
    electricityDetails: {
      type: electricityDetailsSchema,
      required: [true, 'Electricity details are required'],
    },
    createdByPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      required: [true, 'Creating Franchise Partner reference is required'],
      index: true,
    },
    createdByPartnerType: {
      type: String,
      enum: ['SUPER_ADMIN', 'STATE_FRANCHISE', 'DISTRICT_FRANCHISE', 'SUB_FRANCHISE'],
      default: 'DISTRICT_FRANCHISE',
      index: true,
    },
    parentPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: [ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.INACTIVE],
      default: ACCOUNT_STATUS.ACTIVE,
      index: true,
    },
    installedCardCount: {
      type: Number,
      default: 0,
    },
    lastInstallationDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for searching, territorial reporting, and partner dashboard filtering
customerSchema.index({ createdByPartnerId: 1, status: 1, createdAt: -1 });
customerSchema.index({ parentPartnerId: 1, createdAt: -1 });
customerSchema.index({ createdByPartnerType: 1, createdAt: -1 });
customerSchema.index({ 'address.state': 1, 'address.district': 1, customerType: 1 });
customerSchema.index({ fullName: 'text', mobileNumber: 'text', customerId: 'text' });

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
