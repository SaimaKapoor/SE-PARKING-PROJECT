import './setupMongo.js';
import { describe, expect, test, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ParkingSession from '../src/models/ParkingSession.js';
import User from '../src/models/User.js';

let mongoServer;
let customer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await ParkingSession.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([ParkingSession.deleteMany({}), User.deleteMany({})]);
  customer = await User.create({
    name: 'QR Test User',
    email: 'qr@example.com',
    password: 'password123',
    phone: '9876543210',
    vehicleNumber: 'KA01AB1234',
  });
});

const sessionData = (overrides = {}) => ({
  customerId: customer._id,
  vehicleId: 'KA01AB1234',
  slotId: 'A-01',
  hourlyRate: 30,
  ...overrides,
});

describe('ParkingSession QR tokens', () => {
  test('generates a distinct UUID token and future expiry for each session', async () => {
    const [first, second] = await Promise.all([
      ParkingSession.create(sessionData()),
      ParkingSession.create(sessionData({ slotId: 'A-02' })),
    ]);

    expect(first.qrToken).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second.qrToken).toMatch(/^[0-9a-f-]{36}$/i);
    expect(first.qrToken).not.toBe(second.qrToken);
    expect(first.qrTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('does not treat an expired token as valid', async () => {
    const session = await ParkingSession.create(sessionData({
      qrTokenExpiresAt: new Date(Date.now() - 1000),
    }));

    expect(session.hasValidQrToken()).toBe(false);
    expect(await ParkingSession.findValidQrToken(session.qrToken)).toBeNull();
  });

  test('rejects duplicate tokens at the database level', async () => {
    await ParkingSession.create(sessionData({ qrToken: 'duplicate-token' }));

    await expect(ParkingSession.create(sessionData({
      slotId: 'A-02',
      qrToken: 'duplicate-token',
    }))).rejects.toMatchObject({ code: 11000 });
  });
});
