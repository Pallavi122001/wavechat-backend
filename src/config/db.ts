import './env';
import mongoose from 'mongoose';
import { env } from './env';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.DATABASE_URL);
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log('🍃 MongoDB disconnected.');
};

