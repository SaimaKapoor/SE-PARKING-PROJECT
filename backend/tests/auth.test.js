import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.js';

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

afterEach(async () => {
  await User.deleteMany({});
});

const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  phone: '9876543210',
  vehicleNumber: 'KA01AB1234',
};

describe('POST /api/auth/register', () => {
  // ---- Happy path ----

  test('should register a new user and return 201', async () => {
    const res = await request.post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.name).toBe(validUser.name);
  });

  test('should not return password in response', async () => {
    const res = await request.post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('should store password as a bcrypt hash, not plaintext (SEC-001)', async () => {
    await request.post('/api/auth/register').send(validUser);

    const dbUser = await User.findOne({ email: validUser.email }).select('+password');
    expect(dbUser).not.toBeNull();
    expect(dbUser.password).not.toBe(validUser.password);
    expect(dbUser.password).toMatch(/^\$2[aby]?\$/);
  });

  test('should default role to customer', async () => {
    const res = await request.post('/api/auth/register').send(validUser);

    expect(res.body.data.user.role).toBe('customer');
  });

  test('should store vehicleNumber in uppercase', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ ...validUser, vehicleNumber: 'ka01ab1234' });

    expect(res.body.data.user.vehicleNumber).toBe('KA01AB1234');
  });

  // ---- Duplicate email ----

  test('should return 409 when email already exists', async () => {
    await request.post('/api/auth/register').send(validUser);
    const res = await request.post('/api/auth/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  // ---- Validation failures (SEC-003) ----

  test('should return 400 when name is missing', async () => {
    const { name, ...noName } = validUser;
    const res = await request.post('/api/auth/register').send(noName);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
      ])
    );
  });

  test('should return 400 when email is invalid', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ ...validUser, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  test('should return 400 when password is too short', async () => {
    const res = await request
      .post('/api/auth/register')
      .send({ ...validUser, password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  test('should return 400 when phone is missing', async () => {
    const { phone, ...noPhone } = validUser;
    const res = await request.post('/api/auth/register').send(noPhone);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'phone' }),
      ])
    );
  });

  test('should return 400 when vehicleNumber is missing', async () => {
    const { vehicleNumber, ...noVehicle } = validUser;
    const res = await request.post('/api/auth/register').send(noVehicle);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'vehicleNumber' }),
      ])
    );
  });

  test('should return 400 when body is empty', async () => {
    const res = await request.post('/api/auth/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
  });
});
