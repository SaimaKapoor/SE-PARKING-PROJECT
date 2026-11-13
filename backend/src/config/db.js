import mongoose from 'mongoose';

const MAX_CONNECTION_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 4000;
const SERVER_SELECTION_TIMEOUT_MS = 5000;

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vehicle_parking';

  let retryDelay = INITIAL_RETRY_DELAY_MS;
  for (let attempt = 1; attempt <= MAX_CONNECTION_ATTEMPTS; attempt += 1) {
    try {
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      if (attempt === MAX_CONNECTION_ATTEMPTS) {
        console.error(`MongoDB connection failed after ${attempt} attempts: ${error.message}`);
        throw error;
      }

      console.error(`MongoDB connection attempt ${attempt} failed: ${error.message}`);
      await wait(retryDelay);
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
    }
  }
};
