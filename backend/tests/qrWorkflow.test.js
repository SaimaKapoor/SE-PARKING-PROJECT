import './setupMongo.js';
import { beforeAll, afterAll, beforeEach, describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import ParkingSlot from '../src/models/ParkingSlot.js';
import Reservation from '../src/models/Reservation.js';

let mongoServer;
let request;
let customer;
let staff;
let reservation;
let customerToken;
let staffToken;

const makeToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_jwt_secret', { expiresIn: '1h' });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Reservation.init();
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), ParkingSlot.deleteMany({}), Reservation.deleteMany({})]);
  customer = await User.create({ name: 'QR Customer', email: 'qr-customer@example.com', password: 'password123', phone: '9876543210', vehicleNumber: 'KA01AB1234', role: 'customer' });
  staff = await User.create({ name: 'QR Staff', email: 'qr-staff@example.com', password: 'password123', phone: '9876543211', vehicleNumber: 'KA01AB1235', role: 'staff' });
  customerToken = makeToken(customer);
  staffToken = makeToken(staff);
  const slot = await ParkingSlot.create({ slotNumber: 'QR-01', slotId: 'QR-01', floor: 1, type: '4-wheeler', status: 'RESERVED', hourlyRate: 30 });
  reservation = await Reservation.create({ reservationId: 'RES-QR001', userId: customer._id, vehicleId: 'KA01AB1234', slotId: slot.slotNumber, slot: slot._id, status: 'CONFIRMED', startTime: new Date(Date.now() - 60000), endTime: new Date(Date.now() + 3600000) });
});

async function generateQr() {
  return request.post('/api/qr/generate').set('Authorization', `Bearer ${customerToken}`).send({ reservationId: reservation._id.toString() });
}

describe('Reservation QR workflow', () => {
  test('generates UUID tokens and regeneration replaces the prior token', async () => {
    const first = await generateQr();
    const firstToken = (await Reservation.findById(reservation._id).select('+qrToken')).qrToken;
    const second = await generateQr();
    const current = await Reservation.findById(reservation._id).select('+qrToken');

    expect(first.status).toBe(201);
    expect(first.body.data.qrCode).toMatch(/^data:image\/png;base64,/);
    expect(firstToken).toMatch(/^[0-9a-f-]{36}$/i);
    expect(second.status).toBe(201);
    expect(current.qrToken).not.toBe(firstToken);
    expect(current.qrExpiresAt.getTime()).toBeGreaterThan(Date.now());
    const oldValidation = await request.post('/api/qr/validate').set('Authorization', `Bearer ${staffToken}`).send({ token: firstToken });
    expect(oldValidation.status).toBe(400);
  });

  test('only the reservation customer can generate a QR', async () => {
    const other = await User.create({ name: 'Other', email: 'other@example.com', password: 'password123', phone: '9876543212', vehicleNumber: 'KA01AB1236', role: 'customer' });
    const response = await request.post('/api/qr/generate').set('Authorization', `Bearer ${makeToken(other)}`).send({ reservationId: reservation._id.toString() });
    expect(response.status).toBe(404);
  });

  test('only staff can validate and a token can only be consumed once', async () => {
    await generateQr();
    const token = (await Reservation.findById(reservation._id).select('+qrToken')).qrToken;
    const forbidden = await request.post('/api/qr/validate').set('Authorization', `Bearer ${customerToken}`).send({ token });
    expect(forbidden.status).toBe(403);
    const valid = await request.post('/api/qr/validate').set('Authorization', `Bearer ${staffToken}`).send({ token });
    const reused = await request.post('/api/qr/validate').set('Authorization', `Bearer ${staffToken}`).send({ token });
    expect(valid.status).toBe(200);
    expect(valid.body.data.reservation.reservationId).toBe(reservation.reservationId);
    expect(reused.status).toBe(409);
  });

  test('rejects invalid, expired and cancelled tokens', async () => {
    await generateQr();
    let current = await Reservation.findById(reservation._id).select('+qrToken');
    const invalid = await request.post('/api/qr/validate').set('Authorization', `Bearer ${staffToken}`).send({ token: 'not-a-token' });
    expect(invalid.status).toBe(400);
    current.qrExpiresAt = new Date(Date.now() - 1000);
    await current.save();
    const expired = await request.post('/api/qr/validate').set('Authorization', `Bearer ${staffToken}`).send({ token: current.qrToken });
    expect(expired.status).toBe(400);
    current.status = 'CANCELLED';
    current.qrExpiresAt = new Date(Date.now() + 60000);
    await current.save();
    const cancelled = await request.post('/api/qr/validate').set('Authorization', `Bearer ${staffToken}`).send({ token: current.qrToken });
    expect(cancelled.status).toBe(400);
  });

  test('atomically permits only one of two concurrent scans', async () => {
    await generateQr();
    const token = (await Reservation.findById(reservation._id).select('+qrToken')).qrToken;
    const scan = () => request.post('/api/qr/validate').set('Authorization', `Bearer ${staffToken}`).send({ token });
    const responses = await Promise.all([scan(), scan()]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
  });

  test('rejects duplicate tokens at the database level', async () => {
    await generateQr();
    const first = await Reservation.findById(reservation._id).select('+qrToken').lean();
    await expect(Reservation.create({ ...first, _id: undefined, reservationId: 'RES-QR002' })).rejects.toMatchObject({ code: 11000 });
  });
});
