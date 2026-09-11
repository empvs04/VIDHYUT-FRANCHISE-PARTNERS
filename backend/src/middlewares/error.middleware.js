import { ApiError } from '../utils/apiError.js';

export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Resource not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = new ApiError(400, `Invalid format for parameter: ${err.path}`);
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = new ApiError(409, `A record with this ${field} already exists.`);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = new ApiError(400, messages.join(', '));
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
    stack: process.env.NODE_ENV === 'production' ? null : error.stack,
  });
};
