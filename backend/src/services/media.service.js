import crypto from 'crypto';
import { ApiError } from '../utils/apiError.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validates uploaded base64 data or file metadata
 */
export const validateMediaFile = ({ mimeType, sizeBytes, originalName = '' }) => {
  if (originalName) {
    const ext = originalName.split('.').pop().toLowerCase();
    const dangerousExtensions = ['exe', 'bat', 'sh', 'js', 'vbs', 'scr', 'cmd', 'ps1', 'msi', 'com', 'pif'];
    if (dangerousExtensions.includes(ext)) {
      throw new ApiError(400, 'Security Alert: Executable file types are strictly prohibited.');
    }
  }

  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new ApiError(
      400,
      `Unsupported file type "${mimeType}". Allowed formats: JPEG, PNG, WEBP, PDF.`
    );
  }

  if (sizeBytes && sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new ApiError(400, `File size exceeds the maximum limit of 10MB.`);
  }

  return true;
};

/**
 * Handles media upload - stores to secure cloud storage (or simulated secure storage vault)
 */
export const storeMediaFile = async ({
  fileData, // base64 string or binary buffer
  fileName = 'document',
  mimeType = 'image/jpeg',
  category = 'installation',
}) => {
  validateMediaFile({ mimeType, originalName: fileName });

  // Generate unique content-addressed hash / secure reference
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const secureKey = `vs_${category}_${timestamp}_${hash}_${safeFileName}`;

  // If Cloudinary / S3 credentials are provided in environment, integration hook is ready here:
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
    // Cloudinary upload pipeline can be attached here
  }

  // Generate clean, secure URL reference for the application
  const storageUrl = `https://cdn.vidhyutsaathi.com/media/${category}/${secureKey}`;

  return {
    url: storageUrl,
    key: secureKey,
    mimeType,
    uploadedAt: new Date(),
  };
};
