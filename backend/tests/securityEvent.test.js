import './setupMongo.js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { authorize } from '../src/middleware/auth.js';
import User from '../src/models/User.js';
import Reservation from '../src/models/Reservation.js';
import SecurityEvent from '../src/models/SecurityEvent.js';

let mongoServer;
let request;
let customer;
let reservationOwner;
let customerToken;
let authorizationRequest;

beforeAll(async () => {
  process.env.JWT_SECRET = 'security-event-test-secret';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  request = supertest(app);

  const authorizationApp = express();
  authorizationApp.get('/admin-only', (req, res, next) => {
    req.user = customer;
    next();
  }, authorize('admin'), (req, res) => res.sendStatus(200));
  authorizationRequest = supertest(authorizationApp);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([
    SecurityEvent.deleteMany({}),
    Reservation.deleteMany({}),
    User.deleteMany({}),
  ]);
  [customer, reservationOwner] = await User.create([
    {
      name: 'Security Test Customer',
      email: 'security-customer@example.com',
      password: 'password123',
      phone: '9876543210',
      vehicleNumber: 'KA01AB1234',
      role: 'customer',
    },
    {
      name: 'Reservation Owner',
      email: 'reservation-owner@example.com',
      password: 'password123',
      phone: '9876543211',
      vehicleNumber: 'KA02CD5678',
      role: 'customer',
    },
  ]);
  customerToken = jwt.sign({ id: customer._id, role: customer.role }, process.env.JWT_SECRET);
});

describe('persistent security event logging', () => {
  test('logs a failed login with the known user ID and does not store credentials', async () => {
    const password = 'incorrect-secret-password';
    const response = await request.post('/api/auth/login').send({
      email: customer.email,
      password,
    });

    expect(response.status).toBe(401);
    const event = await SecurityEvent.findOne({ eventType: 'LOGIN_FAILED' }).lean();
    expect(event).toMatchObject({
      userId: customer._id,
      outcome: 'DENIED',
      method: 'POST',
      path: '/api/auth/login',
      reason: 'invalid_password',
    });
    expect(event.createdAt).toBeInstanceOf(Date);
    expect(JSON.stringify(event)).not.toContain(password);
    expect(JSON.stringify(event)).not.toContain(customer.email);
  });

  test('logs a failed login without a user ID when the account is unknown', async () => {
    const response = await request.post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'not-stored',
    });

    expect(response.status).toBe(401);
    const event = await SecurityEvent.findOne({ eventType: 'LOGIN_FAILED' }).lean();
    expect(event.userId).toBeNull();
    expect(event.reason).toBe('user_not_found');
    expect(JSON.stringify(event)).not.toContain('missing@example.com');
    expect(JSON.stringify(event)).not.toContain('not-stored');
  });

  test('logs an unauthenticated access attempt without recording its token', async () => {
    const response = await request.get('/api/reservations');

    expect(response.status).toBe(401);
    const event = await SecurityEvent.findOne({ eventType: 'UNAUTHORIZED_ACCESS' }).lean();
    expect(event).toMatchObject({
      userId: null,
      outcome: 'DENIED',
      method: 'GET',
      path: '/api/reservations',
      reason: 'missing_token',
    });
    expect(event.createdAt).toBeInstanceOf(Date);
    expect(JSON.stringify(event)).not.toContain('Authorization');
  });

  test('logs a role authorization denial with the authenticated user ID', async () => {
    const response = await authorizationRequest
      .get('/admin-only')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(403);
    const event = await SecurityEvent.findOne({ eventType: 'UNAUTHORIZED_ACCESS' }).lean();
    expect(event).toMatchObject({
      userId: customer._id,
      outcome: 'DENIED',
      method: 'GET',
      path: '/admin-only',
      reason: 'role_not_allowed',
    });
    expect(JSON.stringify(event)).not.toContain(customerToken);
  });

  test('logs a reservation ownership denial', async () => {
    const reservation = await Reservation.create({
      reservationId: 'RES-SECURITY1',
      userId: reservationOwner._id,
      vehicleId: reservationOwner.vehicleNumber,
      slotId: 'A-01',
    });

    const response = await request
      .get(`/api/reservations/${reservation._id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(403);
    const event = await SecurityEvent.findOne({
      eventType: 'UNAUTHORIZED_ACCESS',
      reason: 'reservation_access_denied',
    }).lean();
    expect(event.userId).toEqual(customer._id);
    expect(event.path).toBe('/api/reservations/:id');
    expect(JSON.stringify(event)).not.toContain(customerToken);
  });
});
