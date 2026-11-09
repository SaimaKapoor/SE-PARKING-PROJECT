import './setupMongo.js';
import { beforeAll, afterAll, test, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { performance } from 'node:perf_hooks';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import supertest from 'supertest';
import app from '../src/app.js';
import ParkingSlot from '../src/models/ParkingSlot.js';

let mongoServer;
let request;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

test('customer can register, authenticate, reserve a slot, and receive a QR in under three minutes', async () => {
  await ParkingSlot.create({ slotNumber: 'J-01', slotId: 'J-01', floor: 1, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 30 });
  const start = performance.now();
  const registration = await request.post('/api/auth/register').send({
    name: 'Journey Customer', email: 'journey@example.com', password: 'journey-pass-123',
    phone: '9876543210', vehicleNumber: 'KA01QR1234',
  });
  expect(registration.status).toBe(201);
  expect(registration.body.data.token).toBeTruthy();
  const authorization = `Bearer ${registration.body.data.token}`;

  const reservation = await request.post('/api/reservations')
    .set('Authorization', authorization)
    .send({ slotId: 'J-01', durationHours: 2 });
  expect(reservation.status).toBe(201);

  const qr = await request.post('/api/qr/generate')
    .set('Authorization', authorization)
    .send({ reservationId: reservation.body.data.reservation._id });
  const elapsedMs = performance.now() - start;

  console.info(`Registration-to-QR API journey: ${Math.round(elapsedMs)} ms`);
  expect(qr.status).toBe(201);
  expect(qr.body.data.qrCode).toMatch(/^data:image\/png;base64,/);
  expect(elapsedMs).toBeLessThan(180_000);
}, 180_000);
