import app from '../backend/src/app.js';
import connectDB from '../backend/src/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('Serverless DB connection error:', err);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed on serverless function. Please check MONGODB_URI and MongoDB Atlas IP Whitelist (0.0.0.0/0).',
      error: err.message,
    });
  }
  return app(req, res);
}
