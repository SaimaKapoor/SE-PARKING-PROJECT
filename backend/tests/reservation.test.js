import './setupMongo.js';
import { jest, describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import ParkingSlot from '../src/models/ParkingSlot.js';
import Reservation from '../src/models/Reservation.js';

let mongoServer;
let request;
let user;
let token;

const generateToken = (userId, role = 'customer') => {
  const secret = process.env.JWT_SECRET || 'fallback_jwt_secret';
  return jwt.sign({ id: userId, role }, secret, { expiresIn: '1h' });
};

beforeAll(async () => {
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
  await User.deleteMany({});
  await ParkingSlot.deleteMany({});
  await Reservation.deleteMany({});

  user = await User.create({
    name: 'Reservation Tester',
    email: 'res@example.com',
    password: 'password123',
    phone: '9876543210',
    vehicleNumber: 'KA05CD5678',
    role: 'customer',
  });
  token = generateToken(user._id, user.role);

  await ParkingSlot.create([
    { slotNumber: 'A-01', slotId: 'A-01', floor: 1, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 30 },
    { slotNumber: 'A-02', slotId: 'A-02', floor: 1, type: '4-wheeler', status: 'OCCUPIED', hourlyRate: 30 },
    { slotNumber: 'A-03', slotId: 'A-03', floor: 1, type: '4-wheeler', status: 'RESERVED', hourlyRate: 30 },
  ]);
});

describe('POST /api/reservations (Issue #19 - B-018, UT-05, UT-02)', () => {
  test('successfully creates a reservation on an AVAILABLE slot (UT-05)', async () => {
    const res = await request
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slotId: 'A-01',
        vehicleNumber: 'KA05CD5678',
        durationHours: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reservation).toBeDefined();
    expect(res.body.data.reservation.reservationId).toMatch(/^RES-/);
    expect(res.body.data.reservation.status).toBe('CONFIRMED');

    // Slot status must now be RESERVED
    const slot = await ParkingSlot.findOne({ slotNumber: 'A-01' });
    expect(slot.status).toBe('RESERVED');
    expect(slot.currentReservationId.toString()).toBe(res.body.data.reservation._id.toString());
  });

  test('falls back to user primary vehicleNumber if not provided', async () => {
    const res = await request
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotId: 'A-01' });

    expect(res.status).toBe(201);
    expect(res.body.data.reservation.vehicleId).toBe('KA05CD5678');
  });

  test('rejects reservation of an OCCUPIED slot with 409 Conflict (UT-02)', async () => {
    const res = await request
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slotId: 'A-02',
        vehicleNumber: 'KA05CD5678',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/occupied/i);
  });

  test('rejects reservation of an already RESERVED slot with 409 Conflict (UT-02)', async () => {
    const res = await request
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slotId: 'A-03',
        vehicleNumber: 'KA05CD5678',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/reserved/i);
  });

  test('rejects reservation if slot does not exist with 404', async () => {
    const res = await request
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slotId: 'NON-EXISTENT',
        vehicleNumber: 'KA05CD5678',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('rejects reservation if slotId is missing with 400', async () => {
    const res = await request
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET & PUT /api/reservations (Issue #18, #19)', () => {
  let createdReservation;

  beforeEach(async () => {
    const res = await request
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slotId: 'A-01',
        vehicleNumber: 'KA05CD5678',
      });
    createdReservation = res.body.data.reservation;
  });

  test('retrieves user reservations list', async () => {
    const res = await request
      .get('/api/reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reservations).toHaveLength(1);
    expect(res.body.data.reservations[0].reservationId).toBe(createdReservation.reservationId);
  });

  test('retrieves reservation by ID', async () => {
    const res = await request
      .get(`/api/reservations/${createdReservation._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.reservation.reservationId).toBe(createdReservation.reservationId);
  });

  test('cancels reservation and frees the slot back to AVAILABLE', async () => {
    const res = await request
      .put(`/api/reservations/${createdReservation._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.reservation.status).toBe('CANCELLED');

    const slot = await ParkingSlot.findOne({ slotNumber: 'A-01' });
    expect(slot.status).toBe('AVAILABLE');
    expect(slot.currentReservationId).toBeNull();
  });

  test('rejects cancelling an already cancelled reservation', async () => {
    await request
      .put(`/api/reservations/${createdReservation._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request
      .put(`/api/reservations/${createdReservation._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

