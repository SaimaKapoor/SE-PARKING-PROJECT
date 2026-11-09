import './setupMongo.js';
import { beforeAll, afterAll, test, expect } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import ParkingSlot from '../src/models/ParkingSlot.js';
import Reservation from '../src/models/Reservation.js';
import User from '../src/models/User.js';
import { runInTransaction } from '../src/services/mongoTransaction.js';

let mongoServer;
let customer;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongoServer.getUri());
  customer = await User.create({ name: 'Integrity Customer', email: 'integrity@example.com', password: 'integrity-pass-123', phone: '9876543210', vehicleNumber: 'KA01TX1234' });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

test('100 reservation-slot transactions commit together or roll back together', async () => {
  const slots = await ParkingSlot.create(Array.from({ length: 100 }, (_, index) => ({
    slotNumber: `T-${String(index).padStart(3, '0')}`,
    slotId: `T-${String(index).padStart(3, '0')}`,
    status: 'AVAILABLE',
  })));

  let successful = 0;
  let failed = 0;
  let integrityPreserved = 0;
  for (let index = 0; index < 100; index += 1) {
    const reservationId = `RES-TX${String(index).padStart(3, '0')}`;
    const shouldFail = index % 10 === 0;
    if (shouldFail) {
      await expect(runInTransaction(async (session) => {
        const [reservation] = await Reservation.create([{
          reservationId, userId: customer._id, vehicleId: customer.vehicleNumber,
          slotId: slots[index].slotId, slot: slots[index]._id,
          startTime: new Date(), endTime: new Date(Date.now() + 3600000),
        }], { session });
        await ParkingSlot.updateOne({ _id: slots[index]._id, status: 'AVAILABLE' }, {
          $set: { status: 'RESERVED', currentReservationId: reservation._id },
        }, { session });
        throw new Error('simulated failure after both writes');
      })).rejects.toThrow('simulated failure');
      failed += 1;
    } else {
      await runInTransaction(async (session) => {
        const [reservation] = await Reservation.create([{
          reservationId, userId: customer._id, vehicleId: customer.vehicleNumber,
          slotId: slots[index].slotId, slot: slots[index]._id,
          startTime: new Date(), endTime: new Date(Date.now() + 3600000),
        }], { session });
        const updated = await ParkingSlot.updateOne({ _id: slots[index]._id, status: 'AVAILABLE' }, {
          $set: { status: 'RESERVED', currentReservationId: reservation._id },
        }, { session });
        expect(updated.modifiedCount).toBe(1);
      });
      successful += 1;
    }

    const savedReservation = await Reservation.findOne({ reservationId });
    const savedSlot = await ParkingSlot.findById(slots[index]._id);
    if (shouldFail) {
      expect(savedReservation).toBeNull();
      expect(savedSlot.status).toBe('AVAILABLE');
      expect(savedSlot.currentReservationId).toBeNull();
      integrityPreserved += 1;
    } else {
      expect(savedReservation).not.toBeNull();
      expect(savedSlot.status).toBe('RESERVED');
      expect(savedSlot.currentReservationId.toString()).toBe(savedReservation._id.toString());
      integrityPreserved += 1;
    }
  }

  expect(successful).toBe(90);
  expect(failed).toBe(10);
  expect(successful + failed).toBe(100);
  expect(integrityPreserved).toBeGreaterThanOrEqual(99);
  expect(await Reservation.countDocuments()).toBe(90);
  expect(await ParkingSlot.countDocuments({ status: 'RESERVED' })).toBe(90);
});
