import './setupMongo.js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import ParkingSession from '../src/models/ParkingSession.js';
import ParkingSlot from '../src/models/ParkingSlot.js';
import Payment from '../src/models/Payment.js';
import Reservation from '../src/models/Reservation.js';
import SecurityEvent from '../src/models/SecurityEvent.js';
import User from '../src/models/User.js';

let mongoServer;
let request;
let admin;
let customer;
let otherCustomer;
let adminToken;
let customerToken;
let session;

const createToken = (user) => jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' },
);

beforeAll(async () => {
  process.env.JWT_SECRET = 'admin-transactions-test-secret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([
    Payment.deleteMany({}),
    ParkingSession.deleteMany({}),
    ParkingSlot.deleteMany({}),
    Reservation.deleteMany({}),
    SecurityEvent.deleteMany({}),
    User.deleteMany({}),
  ]);

  [admin, customer, otherCustomer] = await User.create([
    { name: 'Admin', email: 'admin-transactions@example.com', password: 'password123', phone: '9876543210', vehicleNumber: 'KA01AA1111', role: 'admin' },
    { name: 'Customer', email: 'customer-transactions@example.com', password: 'password123', phone: '9876543211', vehicleNumber: 'KA02BB2222' },
    { name: 'Other Customer', email: 'other-transactions@example.com', password: 'password123', phone: '9876543212', vehicleNumber: 'KA03CC3333' },
  ]);
  adminToken = createToken(admin);
  customerToken = createToken(customer);

  session = await ParkingSession.create({
    customerId: customer._id,
    reservationId: 'RES-ADMIN001',
    vehicleId: customer.vehicleNumber,
    slotId: 'A-01',
    hourlyRate: 30,
    fee: 45,
    status: 'AWAITING_PAYMENT',
  });
  const otherSession = await ParkingSession.create({
    customerId: otherCustomer._id,
    vehicleId: otherCustomer.vehicleNumber,
    slotId: 'A-02',
    hourlyRate: 30,
    fee: 60,
    status: 'AWAITING_PAYMENT',
  });

  await ParkingSlot.create([
    { slotNumber: 'A-01', status: 'OCCUPIED', currentSessionId: session._id },
    { slotNumber: 'A-02', status: 'AVAILABLE' },
  ]);
  await Payment.create([
    { sessionId: session._id, customerId: customer._id, amount: 45, status: 'SUCCESS', provider: 'MOCK', transactionReference: 'MOCK-ADMIN-SUCCESS-1' },
    { sessionId: session._id, customerId: customer._id, amount: 45, status: 'FAILED', provider: 'MOCK', transactionReference: 'MOCK-ADMIN-FAILED-1' },
    { sessionId: otherSession._id, customerId: otherCustomer._id, amount: 60, status: 'SUCCESS', provider: 'MOCK', transactionReference: 'MOCK-ADMIN-SUCCESS-2' },
  ]);
});

describe('GET /api/admin/transactions', () => {
  test('allows admins to retrieve transactions, sessions, and slot usage', async () => {
    const response = await request
      .get(`/api/admin/transactions?userId=${customer._id}&status=SUCCESS`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.transactions).toHaveLength(1);
    expect(response.body.data.transactions[0]).toMatchObject({
      transactionReference: 'MOCK-ADMIN-SUCCESS-1',
      user: { _id: customer._id.toString(), name: 'Customer', email: customer.email },
      session: {
        _id: session._id.toString(),
        reservationId: 'RES-ADMIN001',
        vehicleId: customer.vehicleNumber,
        slotId: 'A-01',
      },
      amount: 45,
      provider: 'MOCK',
      status: 'SUCCESS',
    });
    expect(response.body.data.transactions[0].transactionId).toBeDefined();
    expect(response.body.data.transactions[0].timestamp).toBeDefined();
    expect(response.body.data.transactions[0].user.password).toBeUndefined();
    expect(response.body.data.sessions).toHaveLength(2);
    expect(response.body.data.slotUsage).toHaveLength(2);
    expect(response.body.data.slotUsage[0].currentSessionId._id).toBe(session._id.toString());
    expect(response.body.data.pagination).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  test('rejects requests without authentication and authenticated non-admin users', async () => {
    const unauthenticated = await request.get('/api/admin/transactions');
    expect(unauthenticated.status).toBe(401);

    const nonAdmin = await request
      .get('/api/admin/transactions')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(nonAdmin.status).toBe(403);
    expect(nonAdmin.body.success).toBe(false);
  });

  test('filters transactions and applies page and limit parameters', async () => {
    const response = await request
      .get('/api/admin/transactions?status=SUCCESS&page=1&limit=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.transactions).toHaveLength(1);
    expect(response.body.data.transactions[0].status).toBe('SUCCESS');
    expect(response.body.data.pagination).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });
  });

  test('rejects unsupported transaction status filters', async () => {
    const response = await request
      .get('/api/admin/transactions?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
  });
});
