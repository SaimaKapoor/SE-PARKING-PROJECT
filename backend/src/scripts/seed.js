import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { seedParkingSlots } from '../config/seedSlots.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';

export async function seedDemoUsers(force = false) {
  const defaultUsers = [
    {
      name: 'System Admin',
      email: 'admin@parking.com',
      password: 'Password123',
      phone: '9876543210',
      vehicleNumber: 'KA01AD1111',
      role: 'admin',
    },
    {
      name: 'Gate Staff',
      email: 'staff@parking.com',
      password: 'Password123',
      phone: '9876543211',
      vehicleNumber: 'KA01ST2222',
      role: 'staff',
    },
    {
      name: 'Demo Customer',
      email: 'customer@parking.com',
      password: 'Password123',
      phone: '9876543212',
      vehicleNumber: 'KA01CU3333',
      role: 'customer',
    },
  ];

  let createdCount = 0;
  for (const u of defaultUsers) {
    let existing = await User.findOne({ email: u.email });
    if (force && existing) {
      await Vehicle.deleteMany({ userId: existing._id });
      await User.deleteOne({ _id: existing._id });
      existing = null;
    }
    if (!existing) {
      const user = await User.create(u);
      await Vehicle.create({
        userId: user._id,
        vehicleNumber: u.vehicleNumber,
        type: '4-wheeler',
        model: 'Standard Car',
      });
      createdCount++;
    }
  }
  return createdCount;
}

async function runSeed() {
  try {
    await connectDB();
    console.log('Seeding initial parking slots...');
    const slotResult = await seedParkingSlots(true);
    console.log(`Successfully seeded ${slotResult.count} parking slots.`);

    console.log('Seeding default demo users (Admin, Staff, Customer)...');
    const userCount = await seedDemoUsers(true);
    console.log(`Successfully seeded ${userCount} demo users.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
}

runSeed();
