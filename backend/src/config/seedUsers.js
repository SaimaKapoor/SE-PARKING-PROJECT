import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';

export const defaultDemoUsers = [
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

export async function seedDemoUsers(force = false) {
  let createdCount = 0;
  for (const u of defaultDemoUsers) {
    let existing = await User.findOne({ email: u.email });
    if (force && existing) {
      await Vehicle.deleteMany({ user: existing._id });
      await User.deleteOne({ _id: existing._id });
      existing = null;
    }
    if (!existing) {
      const user = await User.create(u);
      await Vehicle.create({
        user: user._id,
        vehicleNumber: u.vehicleNumber,
        vehicleType: '4-wheeler',
        model: 'Standard Car',
      });
      createdCount++;
    }
  }
  return createdCount;
}
