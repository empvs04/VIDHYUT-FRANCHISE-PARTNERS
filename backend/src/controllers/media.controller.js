import { storeMediaFile } from '../services/media.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const uploadMedia = async (req, res, next) => {
  try {
    const { fileData, fileName, mimeType, category = 'installations' } = req.body;

    if (!fileName) {
      throw new ApiError(400, 'File name is required for upload.');
    }

    const uploaded = await storeMediaFile({
      fileData,
      fileName,
      mimeType: mimeType || 'image/jpeg',
      category,
    });

    return res.status(200).json(
      new ApiResponse(200, uploaded, 'File uploaded and secure reference generated successfully.')
    );
  } catch (error) {
    next(error);
  }
};
