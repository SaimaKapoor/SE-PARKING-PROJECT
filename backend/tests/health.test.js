import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import app from '../src/app.js';

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

describe('GET /api/health', () => {
  test('reports backend liveness and database readiness when connected', async () => {
    const response = await request.get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'UP',
      backend: 'UP',
      database: 'connected',
      readiness: 'ready',
    });
  });

  test('reports backend liveness but returns 503 when MongoDB is disconnected', async () => {
    await mongoose.disconnect();

    const response = await request.get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'DOWN',
      backend: 'UP',
      database: 'disconnected',
      readiness: 'not_ready',
    });
  });
});
