import './setupMongo.js';
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import app from '../src/app.js';
import ParkingSlot from '../src/models/ParkingSlot.js';

let mongoServer;
let request;

beforeAll(async () => {
  if (typeof app.setMaxListeners === 'function') {
    app.setMaxListeners(100);
  }
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);

  // Seed parking slots across multiple floors and vehicle types
  const slots = [];
  for (let f = 1; f <= 3; f++) {
    for (let s = 1; s <= 20; s++) {
      const slotNum = `F${f}-${s.toString().padStart(2, '0')}`;
      slots.push({
        slotNumber: slotNum,
        slotId: slotNum,
        floor: f,
        type: s % 3 === 0 ? '2-wheeler' : '4-wheeler',
        status: s % 5 === 0 ? 'OCCUPIED' : s % 7 === 0 ? 'RESERVED' : 'AVAILABLE',
        hourlyRate: s % 3 === 0 ? 15 : 30,
      });
    }
  }
  await ParkingSlot.insertMany(slots);
  await ParkingSlot.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('NFR-001 / PERF-01: Slot Availability Under Concurrent Load', () => {
  test('responds within 2 seconds for at least 95% of concurrent availability requests (PERF-01)', async () => {
    const CONCURRENT_REQUESTS = 50;
    const LATENCY_THRESHOLD_MS = 2000; // 2 seconds

    const latencies = [];

    const sendRequest = async () => {
      const start = Date.now();
      const response = await request.get('/api/slots?status=AVAILABLE');
      const duration = Date.now() - start;
      latencies.push(duration);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.slots)).toBe(true);
      expect(response.body.data.slots.length).toBeGreaterThan(0);
      return { status: response.status, duration };
    };

    const promises = Array.from({ length: CONCURRENT_REQUESTS }, () => sendRequest());
    const results = await Promise.all(promises);

    expect(results).toHaveLength(CONCURRENT_REQUESTS);

    const withinThreshold = latencies.filter((l) => l < LATENCY_THRESHOLD_MS);
    const successRatio = withinThreshold.length / latencies.length;
    const maxLatency = Math.max(...latencies);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    console.info(`PERF-01 Results: ${CONCURRENT_REQUESTS} concurrent requests, Avg: ${avgLatency.toFixed(1)}ms, Max: ${maxLatency}ms, Success Ratio: ${(successRatio * 100).toFixed(1)}%`);

    expect(successRatio).toBeGreaterThanOrEqual(0.95);
  });

  test('responds within 2 seconds under concurrent filtered queries (floor and type)', async () => {
    const CONCURRENT_REQUESTS = 30;
    const LATENCY_THRESHOLD_MS = 2000;

    const latencies = [];
    const sendRequest = async (index) => {
      const type = index % 2 === 0 ? '4-wheeler' : '2-wheeler';
      const floor = (index % 3) + 1;
      const start = Date.now();
      const response = await request.get(`/api/slots?status=AVAILABLE&type=${type}&floor=${floor}`);
      const duration = Date.now() - start;
      latencies.push(duration);
      expect(response.status).toBe(200);
      return { status: response.status, duration };
    };

    const promises = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => sendRequest(i));
    const results = await Promise.all(promises);

    expect(results).toHaveLength(CONCURRENT_REQUESTS);
    const withinThreshold = latencies.filter((l) => l < LATENCY_THRESHOLD_MS);
    expect(withinThreshold.length / latencies.length).toBeGreaterThanOrEqual(0.95);
  });
});
