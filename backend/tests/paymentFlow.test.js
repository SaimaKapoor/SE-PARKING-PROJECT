import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
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
});
