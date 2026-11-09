import './setupMongo.js';
import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import supertest from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import ParkingSession from '../src/models/ParkingSession.js';
import Payment from '../src/models/Payment.js';
import ParkingSlot from '../src/models/ParkingSlot.js';

let mongoServer;
let request;
let token;
let user;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-for-payment-flow';
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), ParkingSession.deleteMany({}), Payment.deleteMany({}), ParkingSlot.deleteMany({})]);
  await User.create({ name: 'Test User', email: 'payment@example.com', password: 'password123', phone: '9876543210', vehicleNumber: 'KA01AB1234' });
  const login = await request.post('/api/auth/login').send({ email: 'payment@example.com', password: 'password123' });
  token = login.body.data.token;
  user = await User.findOne({ email: 'payment@example.com' });
});
afterEach(async () => { jest.clearAllMocks(); });

describe('IT-03 mock payment flow', () => {
  test('records entry, exit, payment, and completes the session', async () => {
    const entry = await request.post('/api/sessions/entry').set('Authorization', `Bearer ${token}`).send({ slotId: 'A-01' });
    expect(entry.status).toBe(201);
    const sessionId = entry.body.data.session._id;

    // Make the session old enough to have a deterministic non-zero charge.
    await ParkingSession.findByIdAndUpdate(sessionId, { entryTime: new Date(Date.now() - 61 * 60000) });
    const exit = await request.post('/api/sessions/exit').set('Authorization', `Bearer ${token}`).send({ sessionId });
    expect(exit.status).toBe(200);
    expect(exit.body.data.session.status).toBe('AWAITING_PAYMENT');
    expect(exit.body.data.session.fee).toBeGreaterThan(0);

    const pay = await request.post('/api/payments').set('Authorization', `Bearer ${token}`).send({ sessionId, outcome: 'success' });
    expect(pay.status).toBe(201);
    expect(pay.body.data.payment.status).toBe('SUCCESS');
    expect(pay.body.data.payment.amount).toBe(exit.body.data.session.fee);
    expect(pay.body.data.payment.cardNumber).toBeUndefined();

    const complete = await request.post(`/api/sessions/${sessionId}/complete`).set('Authorization', `Bearer ${token}`).send({});
    expect(complete.status).toBe(200);
    expect(complete.body.data.session.status).toBe('COMPLETED');
    const slot = await ParkingSlot.findOne({ slotId: 'A-01' });
    expect(slot.status).toBe('AVAILABLE');

    const history = await request.get('/api/history').set('Authorization', `Bearer ${token}`);
    expect(history.status).toBe(200);
    expect(history.body.data.sessions).toHaveLength(1);
    expect(history.body.data.payments).toHaveLength(1);
  });

  test('rolls back the exit update when MongoDB rejects the write', async () => {
    const entry = await request.post('/api/sessions/entry').set('Authorization', `Bearer ${token}`).send({ slotId: 'A-02' });
    expect(entry.status).toBe(201);
    const sessionId = entry.body.data.session._id;
    const collectionName = ParkingSession.collection.collectionName;
    await mongoose.connection.db.command({
      collMod: collectionName,
      validator: { status: { $ne: 'AWAITING_PAYMENT' } },
      validationAction: 'error',
    });

    try {
      const exit = await request.post('/api/sessions/exit').set('Authorization', `Bearer ${token}`).send({ sessionId });
      expect(exit.status).toBe(500);
      const stored = await ParkingSession.findById(sessionId);
      expect(stored.status).toBe('ACTIVE');
      expect(stored.exitTime).toBeNull();
      expect(stored.fee).toBeNull();
    } finally {
      await mongoose.connection.db.command({
        collMod: collectionName,
        validator: {},
        validationAction: 'error',
      });
    }
  });

  test('only one concurrent exit request can process an active session', async () => {
    const entry = await request.post('/api/sessions/entry').set('Authorization', `Bearer ${token}`).send({ slotId: 'A-03' });
    expect(entry.status).toBe(201);
    const sessionId = entry.body.data.session._id;
    await ParkingSession.findByIdAndUpdate(sessionId, { entryTime: new Date(Date.now() - 61 * 60000) });

    const exit = () => request.post('/api/sessions/exit').set('Authorization', `Bearer ${token}`).send({ sessionId });
    const responses = await Promise.all([exit(), exit()]);
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.every((response) => [200, 404, 409].includes(response.status))).toBe(true);

    const stored = await ParkingSession.findById(sessionId);
    expect(stored.status).toBe('AWAITING_PAYMENT');
    expect(stored.exitTime).toBeTruthy();
    expect(stored.fee).toBeGreaterThan(0);
  });
});
