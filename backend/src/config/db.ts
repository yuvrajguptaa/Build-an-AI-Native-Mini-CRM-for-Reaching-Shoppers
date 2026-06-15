import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/xeno-crm';

export async function connectDB(): Promise<void> {
  mongoose.connection.on('connected', () => console.log('[MongoDB] Connected to:', MONGO_URI));
  mongoose.connection.on('error', (err) => console.error('[MongoDB] Connection error:', err));
  mongoose.connection.on('disconnected', () => console.warn('[MongoDB] Disconnected'));

  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}
