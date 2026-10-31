import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Vehicle from '../src/models/Vehicle.js';

let mongoServer;
let request;
let userA;
let userB;
let tokenA;
let tokenB;

const generateToken = (userId, role = 'customer') => {
  const secret = process.env.JWT_SECRET || 'fallback_jwt_secret';
  return jwt.sign({ id: userId, role }, secret, { expiresIn: '1h' });
};

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
  await User.deleteMany({});
  await Vehicle.deleteMany({});

  userA = await User.create({
    name: 'User A',
    email: 'usera@example.com',
    password: 'password123',
    phone: '9876543210',
    vehicleNumber: 'KA01AA1111',
    role: 'customer',
  });
  tokenA = generateToken(userA._id, userA.role);

  userB = await User.create({
    name: 'User B',
    email: 'userb@example.com',
    password: 'password123',
    phone: '9876543211',
    vehicleNumber: 'KA02BB2222',
    role: 'customer',
  });
  tokenB = generateToken(userB._id, userB.role);
});

describe('POST /api/vehicles (Issue #11 - B-010)', () => {
  const validVehicle = {
    vehicleNumber: 'KA05AB1234',
    vehicleType: '4-wheeler',
    model: 'Honda City',
  };

  test('should register a new vehicle and link to authenticated user (201)', async () => {
    const res = await request
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(validVehicle);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.vehicle).toBeDefined();
    expect(res.body.data.vehicle.vehicleNumber).toBe('KA05AB1234');
    expect(res.body.data.vehicle.vehicleType).toBe('4-wheeler');
    expect(res.body.data.vehicle.model).toBe('Honda City');
    expect(res.body.data.vehicle.user).toBe(userA._id.toString());

    // Verify persisted in database
    const dbVehicle = await Vehicle.findOne({ vehicleNumber: 'KA05AB1234' });
    expect(dbVehicle).not.toBeNull();
    expect(dbVehicle.user.toString()).toBe(userA._id.toString());
  });

  test('should store vehicleNumber in uppercase', async () => {
    const res = await request
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...validVehicle, vehicleNumber: 'ka05ab9999' });

    expect(res.status).toBe(201);
    expect(res.body.data.vehicle.vehicleNumber).toBe('KA05AB9999');
  });

  test('should register a 2-wheeler vehicle successfully', async () => {
    const res = await request
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        vehicleNumber: 'KA03XY1111',
        vehicleType: '2-wheeler',
        model: 'Yamaha R15',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.vehicle.vehicleType).toBe('2-wheeler');
  });

  test('should return 401 when Authorization token is missing', async () => {
    const res = await request.post('/api/vehicles').send(validVehicle);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('should return 409 Conflict when duplicate vehicleNumber is registered', async () => {
    await request
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(validVehicle);

    // Attempt to register same vehicle with User B
    const res = await request
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${tokenB}`)
      .send(validVehicle);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('should return 400 when vehicleNumber is missing', async () => {
    const { vehicleNumber, ...noNumber } = validVehicle;
    const res = await request
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(noNumber);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'vehicleNumber' }),
      ])
    );
  });

  test('should return 400 when vehicleType is invalid', async () => {
    const res = await request
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...validVehicle, vehicleType: 'truck' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'vehicleType' }),
      ])
    );
  });

  test('should return 400 when body is empty', async () => {
    const res = await request
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('GET /api/vehicles (Issue #12 - B-011)', () => {
  test('should return 200 with empty array when user has no registered vehicles', async () => {
    const res = await request
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(0);
    expect(res.body.data.vehicles).toEqual([]);
  });

  test('should return all vehicles registered by the authenticated user', async () => {
    await Vehicle.create({
      vehicleNumber: 'KA01AA1000',
      vehicleType: '4-wheeler',
      model: 'Sedan',
      user: userA._id,
    });

    await Vehicle.create({
      vehicleNumber: 'KA01AA2000',
      vehicleType: '2-wheeler',
      model: 'Scooter',
      user: userA._id,
    });

    const res = await request
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);
    expect(res.body.data.vehicles.length).toBe(2);
  });

  test('should isolate vehicles so User A cannot view User B vehicles', async () => {
    // Vehicle for User A
    await Vehicle.create({
      vehicleNumber: 'KA01USERA',
      vehicleType: '4-wheeler',
      model: 'Car A',
      user: userA._id,
    });

    // Vehicle for User B
    await Vehicle.create({
      vehicleNumber: 'KA02USERB',
      vehicleType: '2-wheeler',
      model: 'Bike B',
      user: userB._id,
    });

    // Request as User A
    const resA = await request
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.count).toBe(1);
    expect(resA.body.data.vehicles[0].vehicleNumber).toBe('KA01USERA');

    // Request as User B
    const resB = await request
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.count).toBe(1);
    expect(resB.body.data.vehicles[0].vehicleNumber).toBe('KA02USERB');
  });

  test('should return 401 when Authorization token is missing', async () => {
    const res = await request.get('/api/vehicles');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
