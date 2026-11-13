import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { seedParkingSlots } from '../config/seedSlots.js';
import { seedDemoUsers } from '../config/seedUsers.js';

export { seedDemoUsers };

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
    console.log('Database seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
}

runSeed();
