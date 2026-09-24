import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    const errorMsg = '[MongoDB] Error: MONGODB_URI is not defined in environment variables.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const options = {
      dbName: 'vidhyut_saathi',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false, // Prevents 10s hang if not connected
    };

    cached.promise = mongoose.connect(mongoUri, options).then((mongooseInstance) => {
      console.log(`[MongoDB] Connected successfully: ${mongooseInstance.connection.host} | DB: vidhyut_saathi`);
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      console.error(`[MongoDB] Connection error: ${err.message}`);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
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
