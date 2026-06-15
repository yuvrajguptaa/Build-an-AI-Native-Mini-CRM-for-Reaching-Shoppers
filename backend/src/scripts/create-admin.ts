import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from '../models/User';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/xeno-crm';

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'admin@xenopilot.com';
    const password = 'AdminPassword123!';

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log('Admin already exists! You can log in with:');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    await User.create({
      name: 'XenoPilot Admin',
      email,
      passwordHash,
      role: 'admin'
    });

    console.log('Admin user created successfully!');
    console.log('-----------------------------------');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('-----------------------------------');

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdmin();
