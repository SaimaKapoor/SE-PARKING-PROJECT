import './setupMongo.js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import ParkingSlot from '../src/models/ParkingSlot.js';
import User from '../src/models/User.js';

let mongoServer;
let request;
let admin;
let customer;
let adminToken;
let customerToken;

const createToken = (user) => jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' },
);

beforeAll(async () => {
  process.env.JWT_SECRET = 'admin-slots-test-secret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([ParkingSlot.deleteMany({}), User.deleteMany({})]);
  [admin, customer] = await User.create([
    { name: 'Slot Admin', email: 'slot-admin@example.com', password: 'password123', phone: '9876543210', vehicleNumber: 'KA01AA1111', role: 'admin' },
    { name: 'Slot Customer', email: 'slot-customer@example.com', password: 'password123', phone: '9876543211', vehicleNumber: 'KA02BB2222', role: 'customer' },
  ]);
  adminToken = createToken(admin);
  customerToken = createToken(customer);
  await ParkingSlot.create([
    { slotNumber: 'A-01', floor: 1, type: '4-wheeler', hourlyRate: 30, status: 'AVAILABLE' },
    { slotNumber: 'A-02', floor: 1, type: '2-wheeler', hourlyRate: 15, status: 'OCCUPIED' },
  ]);
});

const asAdmin = (httpRequest) => httpRequest.set('Authorization', `Bearer ${adminToken}`);

describe('/api/admin/slots', () => {
  test('supports creating, reading, updating, rate management, and deleting slots', async () => {
    const createdResponse = await asAdmin(request.post('/api/admin/slots')).send({
      slotNumber: 'b-03',
      floor: 2,
      type: '2-wheeler',
      hourlyRate: 18,
    });

    expect(createdResponse.status).toBe(201);
    const created = createdResponse.body.data.slot;
    expect(created).toMatchObject({
      slotNumber: 'B-03',
      slotId: 'B-03',
      floor: 2,
      type: '2-wheeler',
      hourlyRate: 18,
      status: 'AVAILABLE',
    });

    const listResponse = await asAdmin(request.get('/api/admin/slots?floor=2&type=2-wheeler'));
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.slots.map((slot) => slot._id)).toContain(created._id);

    const detailResponse = await asAdmin(request.get(`/api/admin/slots/${created._id}`));
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.slot.slotNumber).toBe('B-03');

    const updateResponse = await asAdmin(request.put(`/api/admin/slots/${created._id}`)).send({
      slotNumber: 'B-04',
      floor: 3,
      type: '4-wheeler',
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.slot).toMatchObject({
      slotNumber: 'B-04',
      slotId: 'B-04',
      floor: 3,
      type: '4-wheeler',
    });

    const rateResponse = await asAdmin(request.put(`/api/admin/slots/${created._id}/rate`)).send({ hourlyRate: 25 });
    expect(rateResponse.status).toBe(200);
    expect(rateResponse.body.data.slot.hourlyRate).toBe(25);

    const deleteResponse = await asAdmin(request.delete(`/api/admin/slots/${created._id}`));
    expect(deleteResponse.status).toBe(200);
    expect(await ParkingSlot.findById(created._id)).toBeNull();
  });

  test('validates slot fields, rejects duplicates, and prevents deleting an occupied slot', async () => {
    const invalidType = await asAdmin(request.post('/api/admin/slots')).send({
      slotNumber: 'B-10',
      type: 'invalid',
    });
    expect(invalidType.status).toBe(400);

    const mismatchedIds = await asAdmin(request.post('/api/admin/slots')).send({
      slotNumber: 'B-10',
      slotId: 'B-11',
    });
    expect(mismatchedIds.status).toBe(400);

    const invalidRate = await asAdmin(request.put('/api/admin/slots/A-01/rate')).send({ hourlyRate: -1 });
    expect(invalidRate.status).toBe(400);

    const duplicate = await asAdmin(request.post('/api/admin/slots')).send({ slotNumber: 'a-01' });
    expect(duplicate.status).toBe(409);

    const occupiedDelete = await asAdmin(request.delete('/api/admin/slots/A-02'));
    expect(occupiedDelete.status).toBe(409);
    expect(await ParkingSlot.findOne({ slotNumber: 'A-02' })).not.toBeNull();
  });

  test('rejects unauthenticated and non-admin requests', async () => {
    const unauthenticated = await request.post('/api/admin/slots').send({ slotNumber: 'C-01' });
    expect(unauthenticated.status).toBe(401);

    const nonAdmin = await request
      .get('/api/admin/slots')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(nonAdmin.status).toBe(403);
  });
});
