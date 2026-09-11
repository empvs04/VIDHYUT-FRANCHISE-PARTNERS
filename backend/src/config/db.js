import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('[MongoDB] Error: MONGODB_URI is not defined in environment variables.');
    return;
  }

  const options = {
    dbName: 'vidhyut_saathi',
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(mongoUri, options);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host} | DB: vidhyut_saathi`);
  } catch (error) {
    console.error(`[MongoDB] Initial connection error: ${error.message}`);
  }
};

// Mongoose Connection Event Handlers
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Connection established to vidhyut_saathi');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Runtime connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[MongoDB] Connection closed due to application termination');
  process.exit(0);
});

export default connectDB;
