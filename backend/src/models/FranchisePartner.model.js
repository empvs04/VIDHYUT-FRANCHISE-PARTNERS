import mongoose from 'mongoose';
import { FRANCHISE_TYPES, ACCOUNT_STATUS } from '../config/constants.js';

const franchisePartnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    franchiseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    franchiseType: {
      type: String,
      enum: Object.values(FRANCHISE_TYPES),
      required: [true, 'Franchise type is required'],
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    profilePhotoUrl: {
      type: String,
      default: '',
    },
    // Territory and Location Fields
    state: {
      type: String,
      required: [true, 'Authorized state is required'],
      trim: true,
      index: true,
    },
    district: {
      type: String,
      required: [true, 'Authorized district is required'],
      trim: true,
      index: true,
    },
    authorizedDistricts: {
      type: [String],
      default: [],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    addressLine1: {
      type: String,
      required: [true, 'Address Line 1 is required'],
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: '',
    },
    pinCode: {
      type: String,
      required: [true, 'PIN code is required'],
      trim: true,
      default: '400001',
      match: [/^\d{6}$/, 'Please enter a valid 6-digit PIN code'],
    },
    // Government ID & Proof Verification
    govIdType: {
      type: String,
      enum: ['AADHAAR', 'PAN', 'VOTER_ID', 'DRIVING_LICENSE', 'PASSPORT', 'NONE'],
      default: 'NONE',
    },
    govIdNumber: {
      type: String,
      trim: true,
      default: '',
    },
    govIdDocumentUrl: {
      type: String,
      default: '',
    },
    isGovIdVerified: {
      type: Boolean,
      default: false,
    },
    verificationDetails: {
      verifiedAt: Date,
      message: String,
      maskedId: String,
      entityType: String,
    },
    // Address Proof Verification
    addressProofType: {
      type: String,
      default: 'ELECTRICITY_BILL',
    },
    addressProofNumber: {
      type: String,
      trim: true,
      default: '',
    },
    addressProofDocumentUrl: {
      type: String,
      default: '',
    },
    // Additional Required Onboarding Documents
    otherDocuments: [
      {
        name: { type: String, required: true },
        docType: {
          type: String,
          enum: ['GST_CERTIFICATE', 'ADDRESS_PROOF', 'FRANCHISE_AGREEMENT', 'BANK_PASSBOOK', 'OTHER'],
          default: 'OTHER',
        },
        fileUrl: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Hierarchy and Relationship
    parentPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
      index: true,
    },
    // Lifecycle & Authorization Dates
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    accountStatus: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: null,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast territory lookups, hierarchy queries, and duplicate district checks
franchisePartnerSchema.index({ state: 1, district: 1, franchiseType: 1, accountStatus: 1 });
franchisePartnerSchema.index({ parentPartnerId: 1, accountStatus: 1 });
franchisePartnerSchema.index({ franchiseType: 1, accountStatus: 1 });

const FranchisePartner = mongoose.model('FranchisePartner', franchisePartnerSchema);
export default FranchisePartner;
