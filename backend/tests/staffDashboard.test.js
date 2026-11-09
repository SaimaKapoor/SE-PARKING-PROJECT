import './setupMongo.js';
import { beforeAll, afterAll, beforeEach, describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import ParkingSlot from '../src/models/ParkingSlot.js';
import ParkingSession from '../src/models/ParkingSession.js';
import Reservation from '../src/models/Reservation.js';

let mongoServer;
let request;
let staff;
let customer;
let reservation;
let staffToken;
let customerToken;

const tokenFor = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_jwt_secret', { expiresIn: '1h' });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), ParkingSlot.deleteMany({}), ParkingSession.deleteMany({}), Reservation.deleteMany({})]);
  staff = await User.create({ name: 'Staff User', email: 'staff-dash@example.com', password: 'password123', phone: '9876543200', vehicleNumber: 'STAFF-01', role: 'staff' });
  customer = await User.create({ name: 'Customer User', email: 'customer-dash@example.com', password: 'password123', phone: '9876543201', vehicleNumber: 'KA01AB1234', role: 'customer' });
  staffToken = tokenFor(staff);
  customerToken = tokenFor(customer);
  const slot = await ParkingSlot.create({ slotNumber: 'D-01', slotId: 'D-01', floor: 1, type: '4-wheeler', status: 'RESERVED', hourlyRate: 40 });
  reservation = await Reservation.create({
    reservationId: 'RES-DASH01', userId: customer._id, vehicleId: 'KA01AB1234', slotId: slot.slotId,
    slot: slot._id, status: 'CONFIRMED', startTime: new Date(Date.now() - 60000), endTime: new Date(Date.now() + 3600000),
    qrToken: randomUUID(), qrExpiresAt: new Date(Date.now() + 60000),
  });
  slot.currentReservationId = reservation._id;
  await slot.save();
});

describe('Staff entry/exit dashboard API', () => {
  test('requires staff for dashboard endpoints', async () => {
    const sessions = await request.get('/api/sessions/active').set('Authorization', `Bearer ${customerToken}`);
    const entry = await request.post('/api/sessions/staff/entry').set('Authorization', `Bearer ${customerToken}`).send({ reservationId: reservation.reservationId });
    expect(sessions.status).toBe(403);
    expect(entry.status).toBe(403);
  });

  test('validates reservation QR, records customer entry and lists the active session', async () => {
    const scan = await request.post('/api/qr/validate').set('Authorization', `Bearer ${staffToken}`).send({ token: reservation.qrToken });
    expect(scan.status).toBe(200);
    const entry = await request.post('/api/sessions/staff/entry').set('Authorization', `Bearer ${staffToken}`).send({ reservationId: reservation.reservationId });
    expect(entry.status).toBe(201);
    expect(entry.body.data.session.customerId).toBe(customer._id.toString());
    expect(entry.body.data.session.vehicleId).toBe('KA01AB1234');

    const active = await request.get('/api/sessions/active').set('Authorization', `Bearer ${staffToken}`);
    expect(active.status).toBe(200);
    expect(active.body.data.sessions).toHaveLength(1);
    expect(active.body.data.sessions[0].reservationId).toBe(reservation.reservationId);
  });

  test('does not record entry before the QR token has been validated', async () => {
    const entry = await request.post('/api/sessions/staff/entry').set('Authorization', `Bearer ${staffToken}`).send({ reservationId: reservation.reservationId });
    expect(entry.status).toBe(409);
  });

  test('records exit and reports fee and payment-pending status', async () => {
    await request.post('/api/qr/validate').set('Authorization', `Bearer ${staffToken}`).send({ token: reservation.qrToken });
    const entry = await request.post('/api/sessions/staff/entry').set('Authorization', `Bearer ${staffToken}`).send({ reservationId: reservation.reservationId });
    const sessionId = entry.body.data.session._id;
    await ParkingSession.findByIdAndUpdate(sessionId, { entryTime: new Date(Date.now() - 61 * 60000) });

    const exit = await request.post(`/api/sessions/staff/${sessionId}/exit`).set('Authorization', `Bearer ${staffToken}`).send({});
    expect(exit.status).toBe(200);
    expect(exit.body.data.session.status).toBe('AWAITING_PAYMENT');
    expect(exit.body.data.session.fee).toBe(80);
  });
});
