import mongoose from 'mongoose';
import { OTP_PURPOSE } from '../config/constants.js';

const otpSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: Object.values(OTP_PURPOSE),
      default: OTP_PURPOSE.PARTNER_LOGIN,
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
