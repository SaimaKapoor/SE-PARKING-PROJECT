import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { seedParkingSlots } from '../config/seedSlots.js';

async function runSeed() {
  try {
    await connectDB();
    console.log('Seeding initial parking slots...');
    const result = await seedParkingSlots(true);
    console.log(`Successfully seeded ${result.count} parking slots.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
}

runSeed();

