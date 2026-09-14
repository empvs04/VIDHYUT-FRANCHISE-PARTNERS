import mongoose from 'mongoose';
import {
  LOCATION_VERIFICATION_STATUS,
  GPS_ACCURACY_STATUS,
} from '../config/constants.js';

const auditHistorySchema = new mongoose.Schema(
  {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
    },
    reviewReason: {
      type: String,
      required: true,
      trim: true,
    },
    previousStatus: {
      type: String,
      required: true,
    },
    newStatus: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['APPROVE', 'REJECT', 'FLAG', 'OVERRIDE'],
      required: true,
    },
  },
  { _id: true }
);

const locationVerificationSchema = new mongoose.Schema(
  {
    locationVerificationId: {
      type: String,
      required: [true, 'Location verification ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    installationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Installation',
      default: null,
      index: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      required: [true, 'Franchise Partner reference is required'],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },
    // Raw GPS Data
    latitude: {
      type: Number,
      required: [true, 'Latitude coordinate is required'],
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude coordinate is required'],
      min: -180,
      max: 180,
    },
    accuracyMeters: {
      type: Number,
      required: [true, 'GPS accuracy in meters is required'],
      min: 0,
    },
    gpsCapturedAt: {
      type: Date,
      required: [true, 'Client GPS capture timestamp is required'],
    },
    serverTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Server-Side Reverse Geocoded Address Components
    formattedAddress: {
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
      trim: true,
      default: '',
    },
    district: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    state: {
      type: String,
      trim: true,
      required: true,
      index: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    postalCode: {
      type: String,
      trim: true,
      default: '',
    },
    // Customer Entered Territory for Mismatch Checking
    customerEnteredState: {
      type: String,
      trim: true,
      default: '',
    },
    customerEnteredDistrict: {
      type: String,
      trim: true,
      default: '',
    },
    // Authoritative Partner Territory at Time of Verification
    authorizedState: {
      type: String,
      trim: true,
      required: true,
    },
    authorizedDistrict: {
      type: String,
      trim: true,
      required: true,
    },
    authorizedDistricts: {
      type: [String],
      default: [],
    },
    // Verification Outcome Flags
    territoryMatch: {
      type: Boolean,
      required: true,
      index: true,
    },
    customerAddressMatch: {
      type: Boolean,
      default: true,
    },
    accuracyStatus: {
      type: String,
      enum: Object.values(GPS_ACCURACY_STATUS),
      default: GPS_ACCURACY_STATUS.GOOD,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(LOCATION_VERIFICATION_STATUS),
      required: true,
      index: true,
    },
    verificationReason: {
      type: String,
      trim: true,
      default: '',
    },
    geocodingProvider: {
      type: String,
      trim: true,
      default: 'OSM_NOMINATIM',
    },
    // Audit Trail History for Super Admin Overrides
    auditHistory: [auditHistorySchema],
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for fast queries & analytics
locationVerificationSchema.index({ partnerId: 1, createdAt: -1 });
locationVerificationSchema.index({ verificationStatus: 1, createdAt: -1 });
locationVerificationSchema.index({ state: 1, district: 1, createdAt: -1 });
locationVerificationSchema.index({ latitude: 1, longitude: 1 });

const LocationVerification = mongoose.model('LocationVerification', locationVerificationSchema);
export default LocationVerification;
