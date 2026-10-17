import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
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

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request.post('/api/auth/register').send(validUser);
  });

  test('should login user and return 200 with JWT token and user info', async () => {
    const res = await request.post('/api/auth/login').send({
      email: validUser.email,
      password: validUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.password).toBeUndefined();

    // Verify JWT payload contains id and role
    const decoded = jwt.decode(res.body.data.token);
    expect(decoded).toBeDefined();
    expect(decoded.id).toBeDefined();
    expect(decoded.role).toBe('customer');
  });

  test('should return 401 when password is incorrect', async () => {
    const res = await request.post('/api/auth/login').send({
      email: validUser.email,
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  test('should return 401 when email does not exist', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  test('should return 400 when email is missing or empty', async () => {
    const res = await request.post('/api/auth/login').send({
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  test('should return 400 when password is missing or empty', async () => {
    const res = await request.post('/api/auth/login').send({
      email: validUser.email,
    });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  test('should handle case-insensitive email login successfully', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'TEST@EXAMPLE.COM',
      password: validUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  test('should trim whitespace from email on login', async () => {
    const res = await request.post('/api/auth/login').send({
      email: `  ${validUser.email}  `,
      password: validUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  test('should return 400 when email format is invalid on login', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'not-an-email',
      password: validUser.password,
    });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  test('should verify token integrity and expiration using jwt.verify (B-041)', async () => {
    const res = await request.post('/api/auth/login').send({
      email: validUser.email,
      password: validUser.password,
    });

    expect(res.status).toBe(200);
    const secret = process.env.JWT_SECRET || 'fallback_jwt_secret';
    const verified = jwt.verify(res.body.data.token, secret);

    expect(verified).toBeDefined();
    expect(verified.id).toBeDefined();
    expect(verified.role).toBe('customer');
    expect(verified.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('should return correct role in token for staff or admin user (B-039)', async () => {
    const adminUser = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      phone: '9876543211',
      vehicleNumber: 'KA02CD5678',
      role: 'admin',
    };
    await User.create(adminUser);

    const res = await request.post('/api/auth/login').send({
      email: adminUser.email,
      password: adminUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');

    const decoded = jwt.decode(res.body.data.token);
    expect(decoded.role).toBe('admin');
  });

  test('should reject NoSQL injection attempts with 400 validation error (SEC-003)', async () => {
    const res = await request.post('/api/auth/login').send({
      email: { $gt: '' },
      password: validUser.password,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('should return 400 when empty body is sent to login', async () => {
    const res = await request.post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });
});

