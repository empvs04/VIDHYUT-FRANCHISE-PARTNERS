import dotenv from 'dotenv';
import app from './src/app.js';
import connectDB from './src/config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB Atlas
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`⚡ VIDHYUT SAATHI FRANCHISE SYSTEM - BACKEND API ⚡`);
    console.log(`======================================================`);
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🏥 Health check at:   http://localhost:${PORT}/api/v1/health`);
    console.log(`🌐 Environment:       ${process.env.NODE_ENV || 'development'}`);
    console.log(`======================================================\n`);
  });
};

startServer();
