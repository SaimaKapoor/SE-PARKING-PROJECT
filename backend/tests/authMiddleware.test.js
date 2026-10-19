import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import User from '../src/models/User.js';
import { protect, authorize } from '../src/middleware/auth.js';
import app from '../src/app.js';

let mongoServer;
let request;
let testApp;
let testRequest;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);

  // Dedicated test app to test middleware and RBAC permutations
  testApp = express();
  testApp.use(express.json());

  testApp.get('/test/protected', protect, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
  });

  testApp.get(
    '/test/admin-only',
    protect,
    authorize('admin'),
    (req, res) => {
      res.status(200).json({ success: true, message: 'Welcome admin' });
    }
  );

  testApp.get(
    '/test/staff-or-admin',
    protect,
    authorize('staff', 'admin'),
    (req, res) => {
      res.status(200).json({ success: true, message: 'Welcome staff or admin' });
    }
  );

  testRequest = supertest(testApp);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

const generateToken = (userId, role = 'customer', expiresIn = '1h') => {
  const secret = process.env.JWT_SECRET || 'fallback_jwt_secret';
  return jwt.sign({ id: userId, role }, secret, { expiresIn });
};

describe('Auth Middleware: JWT Verification (protect)', () => {
  let customerUser;

  beforeEach(async () => {
    customerUser = await User.create({
      name: 'Customer One',
      email: 'customer@example.com',
      password: 'password123',
      phone: '9876543210',
      vehicleNumber: 'KA01AB1111',
      role: 'customer',
    });
  });

  test('should return 401 when Authorization header is missing', async () => {
    const res = await testRequest.get('/test/protected');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/token required/i);
  });

  test('should return 401 when Authorization header does not start with Bearer', async () => {
    const res = await testRequest
      .get('/test/protected')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('should return 401 when token is invalid or malformed', async () => {
    const res = await testRequest
      .get('/test/protected')
      .set('Authorization', 'Bearer invalid.token.value');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid.*token/i);
  });

  test('should return 401 when token is expired (B-041)', async () => {
    const expiredToken = generateToken(customerUser._id, 'customer', '-1s');

    const res = await testRequest
      .get('/test/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('should return 401 when user in token no longer exists in database', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const token = generateToken(nonExistentId, 'customer');

    const res = await testRequest
      .get('/test/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/no longer exists/i);
  });

  test('should authenticate valid token and attach user to req.user', async () => {
    const token = generateToken(customerUser._id, 'customer');

    const res = await testRequest
      .get('/test/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user._id).toBe(customerUser._id.toString());
    expect(res.body.user.email).toBe(customerUser.email);
    expect(res.body.user.password).toBeUndefined();
  });
});

describe('Auth Middleware: Role-Based Access Control (authorize)', () => {
  let customerUser;
  let staffUser;
  let adminUser;

  beforeEach(async () => {
    customerUser = await User.create({
      name: 'Customer',
      email: 'cust@example.com',
      password: 'password123',
      phone: '9876543201',
      vehicleNumber: 'KA01AB0001',
      role: 'customer',
    });

    staffUser = await User.create({
      name: 'Staff',
      email: 'staff@example.com',
      password: 'password123',
      phone: '9876543202',
      vehicleNumber: 'KA01AB0002',
      role: 'staff',
    });

    adminUser = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      phone: '9876543203',
      vehicleNumber: 'KA01AB0003',
      role: 'admin',
    });
  });

  test('should return 403 Forbidden when customer accesses admin-only route', async () => {
    const token = generateToken(customerUser._id, 'customer');

    const res = await testRequest
      .get('/test/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/forbidden|insufficient permissions/i);
  });

  test('should allow admin to access admin-only route', async () => {
    const token = generateToken(adminUser._id, 'admin');

    const res = await testRequest
      .get('/test/admin-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Welcome admin');
  });

  test('should allow staff to access staff-or-admin route', async () => {
    const token = generateToken(staffUser._id, 'staff');

    const res = await testRequest
      .get('/test/staff-or-admin')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should allow admin to access staff-or-admin route', async () => {
    const token = generateToken(adminUser._id, 'admin');

    const res = await testRequest
      .get('/test/staff-or-admin')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should reject customer on staff-or-admin route with 403', async () => {
    const token = generateToken(customerUser._id, 'customer');

    const res = await testRequest
      .get('/test/staff-or-admin')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me Integration', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await User.create({
      name: 'Profile User',
      email: 'profile@example.com',
      password: 'password123',
      phone: '9876543299',
      vehicleNumber: 'KA01AB9999',
      role: 'customer',
    });
    token = generateToken(user._id, 'customer');
  });

  test('should return user profile with 200 when authenticated', async () => {
    const res = await request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.name).toBe(user.name);
  });

  test('should return 401 when called without token', async () => {
    const res = await request.get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
