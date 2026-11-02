import { jest, describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import app from '../src/app.js';
import ParkingSlot from '../src/models/ParkingSlot.js';

let mongoServer;
let request;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await ParkingSlot.deleteMany({});

  await ParkingSlot.insertMany([
    { slotNumber: 'A-01', slotId: 'A-01', floor: 1, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 30 },
    { slotNumber: 'A-02', slotId: 'A-02', floor: 1, type: '4-wheeler', status: 'OCCUPIED', hourlyRate: 30 },
    { slotNumber: 'B-01', slotId: 'B-01', floor: 1, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 15 },
    { slotNumber: 'C-01', slotId: 'C-01', floor: 2, type: '4-wheeler', status: 'RESERVED', hourlyRate: 30 },
    { slotNumber: 'D-01', slotId: 'D-01', floor: 2, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 15 },
  ]);
});

describe('GET /api/slots (Issue #15 - B-014, UT-03)', () => {
  test('returns all slots when no query filters applied', async () => {
    const res = await request.get('/api/slots');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(5);
    expect(res.body.data.slots).toHaveLength(5);
  });

  test('filters slots by status=AVAILABLE (UT-03)', async () => {
    const res = await request.get('/api/slots?status=AVAILABLE');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);
    const statuses = res.body.data.slots.map((s) => s.status);
    expect(statuses.every((s) => s === 'AVAILABLE')).toBe(true);
  });

  test('filters slots by type=2-wheeler', async () => {
    const res = await request.get('/api/slots?type=2-wheeler');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.data.slots.every((s) => s.type === '2-wheeler')).toBe(true);
  });

  test('filters slots by floor=2', async () => {
    const res = await request.get('/api/slots?floor=2');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.data.slots.every((s) => s.floor === 2)).toBe(true);
  });

  test('combines filters status=AVAILABLE & type=4-wheeler & floor=1', async () => {
    const res = await request.get('/api/slots?status=AVAILABLE&type=4-wheeler&floor=1');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data.slots[0].slotNumber).toBe('A-01');
  });

  test('retrieves single slot by slotNumber', async () => {
    const res = await request.get('/api/slots/A-01');
    expect(res.status).toBe(200);
    expect(res.body.data.slot.slotNumber).toBe('A-01');
  });

  test('returns 404 for non-existent slot', async () => {
    const res = await request.get('/api/slots/Z-99');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('PUT /api/slots/:id/status (Issue #17 - B-016)', () => {
  test('updates status from AVAILABLE to RESERVED', async () => {
    const res = await request.put('/api/slots/A-01/status').send({ status: 'RESERVED' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slot.status).toBe('RESERVED');

    const updated = await ParkingSlot.findOne({ slotNumber: 'A-01' });
    expect(updated.status).toBe('RESERVED');
  });

  test('updates status from RESERVED to OCCUPIED', async () => {
    const res = await request.put('/api/slots/C-01/status').send({ status: 'OCCUPIED' });
    expect(res.status).toBe(200);
    expect(res.body.data.slot.status).toBe('OCCUPIED');
  });

  test('updates status from OCCUPIED to AVAILABLE and clears sessions', async () => {
    const res = await request.put('/api/slots/A-02/status').send({ status: 'AVAILABLE' });
    expect(res.status).toBe(200);
    expect(res.body.data.slot.status).toBe('AVAILABLE');
  });

  test('rejects invalid status', async () => {
    const res = await request.put('/api/slots/A-01/status').send({ status: 'INVALID_STATUS' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects missing status body', async () => {
    const res = await request.put('/api/slots/A-01/status').send({});
    expect(res.status).toBe(400);
  });

  test('returns 404 when updating non-existent slot', async () => {
    const res = await request.put('/api/slots/NON_EXISTENT/status').send({ status: 'OCCUPIED' });
    expect(res.status).toBe(404);
  });
});

