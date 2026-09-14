import app from '../backend/src/app.js';
import connectDB from '../backend/src/config/db.js';

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error('Serverless DB connection error:', err);
    }
  }
  return app(req, res);
}
