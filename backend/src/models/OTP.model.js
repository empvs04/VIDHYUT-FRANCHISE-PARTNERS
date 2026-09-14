import mongoose from 'mongoose';
import { OTP_PURPOSE } from '../config/constants.js';

const otpSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      index: true,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      index: true,
      trim: true,
      lowercase: true,
      default: '',
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FranchisePartner',
      default: null,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: Object.values(OTP_PURPOSE),
      default: OTP_PURPOSE.PARTNER_LOGIN,
      index: true,
    },
    channel: {
      type: String,
      enum: ['SMS', 'EMAIL', 'BOTH'],
      default: 'SMS',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index automatically removes expired documents
    },
  },
  {
    timestamps: true,
  }
);

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
