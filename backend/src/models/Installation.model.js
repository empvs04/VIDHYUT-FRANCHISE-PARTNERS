import mongoose from 'mongoose';
import {
  CUSTOMER_TYPES,
  ELECTRICITY_PHASES,
  CONFIRMATION_STATUS,
  CONFIRMATION_METHODS,
  INSTALLATION_VERIFICATION_STATUS,
} from '../config/constants.js';

const installationAddressSchema = new mongoose.Schema(
  {
    houseOrShopNumber: { type: String, trim: true, default: '' },
    street: { type: String, trim: true, default: '' },
    locality: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true, index: true },
    state: { type: String, required: true, trim: true, index: true },
    pinCode: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true, default: '' },
    fullAddress: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const installationSchema = new mongoose.Schema(
  {
    installationId: {
      type: String,
      required: [true, 'Installation ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      required: [true, 'Franchise Partner reference is required'],
      index: true,
    },
    cardIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        required: true,
        index: true,
      },
    ],
    cardSerialNumbers: {
      type: [String],
      required: true,
    },
    customerType: {
      type: String,
      enum: Object.values(CUSTOMER_TYPES),
      required: true,
      index: true,
    },
    installationDateTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    installationAddress: {
      type: installationAddressSchema,
      required: true,
    },
    // Technical Electricity Specs & Load Calculations
    connectedLoadKw: {
      type: Number,
      required: true,
      min: 0.1,
    },
    recommendedCardCount: {
      type: Number,
      required: true,
      min: 1,
    },
    installedCardCount: {
      type: Number,
      required: true,
      min: 1,
    },
    monthlyElectricityBill: {
      type: Number,
      default: 0,
      min: 0,
    },
    highestElectricityBill12Months: {
      type: Number,
      default: 0,
      min: 0,
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
    // Commercials
    pricePerCard: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    // Media & Evidence Document References
    mcbPhoto: {
      type: String,
      required: [true, 'MCB / ELCB distribution panel photo is required'],
      trim: true,
    },
    billPhoto: {
      type: String,
      required: [true, 'Electricity bill photo is required'],
      trim: true,
    },
    installedCardPhoto: {
      type: String,
      required: [true, 'Installed Vidhyut Saathi card photo is required'],
      trim: true,
    },
    customerSignaturePhoto: {
      type: String,
      trim: true,
      default: '',
    },
    // Customer Confirmation
    customerConfirmationStatus: {
      type: String,
      enum: Object.values(CONFIRMATION_STATUS),
      default: CONFIRMATION_STATUS.CONFIRMED,
      index: true,
    },
    customerConfirmedAt: {
      type: Date,
      default: Date.now,
    },
    customerConfirmationMethod: {
      type: String,
      enum: Object.values(CONFIRMATION_METHODS),
      default: CONFIRMATION_METHODS.OTP,
    },
    // Phase 6 GPS Verification & Evidence Reference
    locationVerificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LocationVerification',
      default: null,
      index: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    gpsAccuracy: {
      type: Number,
      default: null,
    },
    gpsTimestamp: {
      type: Date,
      default: null,
    },
    gpsAddress: {
      type: String,
      trim: true,
      default: '',
    },
    detectedDistrict: {
      type: String,
      trim: true,
      default: '',
    },
    detectedState: {
      type: String,
      trim: true,
      default: '',
    },
    territoryMatch: {
      type: Boolean,
      default: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(INSTALLATION_VERIFICATION_STATUS),
      default: INSTALLATION_VERIFICATION_STATUS.CONFIRMED,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdByPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast reporting and queries
installationSchema.index({ partnerId: 1, createdAt: -1 });
installationSchema.index({ createdByPartnerId: 1, createdAt: -1 });
installationSchema.index({ parentPartnerId: 1, createdAt: -1 });
installationSchema.index({ createdByPartnerType: 1, createdAt: -1 });
installationSchema.index({ customerId: 1, createdAt: -1 });
installationSchema.index({ 'installationAddress.state': 1, 'installationAddress.district': 1, createdAt: -1 });
installationSchema.index({ cardSerialNumbers: 1 });
installationSchema.index({ verificationStatus: 1, customerConfirmationStatus: 1 });

const Installation = mongoose.model('Installation', installationSchema);
export default Installation;
