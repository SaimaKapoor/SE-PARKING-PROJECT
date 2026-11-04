import ParkingSlot from '../models/ParkingSlot.js';

export const initialSlots = [
  // Floor 1
  { slotNumber: 'A-01', floor: 1, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 30 },
  { slotNumber: 'A-02', floor: 1, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 30 },
  { slotNumber: 'A-03', floor: 1, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 30 },
  { slotNumber: 'A-04', floor: 1, type: '4-wheeler', status: 'RESERVED', hourlyRate: 30 },
  { slotNumber: 'A-05', floor: 1, type: '4-wheeler', status: 'OCCUPIED', hourlyRate: 30 },
  { slotNumber: 'B-01', floor: 1, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 15 },
  { slotNumber: 'B-02', floor: 1, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 15 },
  { slotNumber: 'B-03', floor: 1, type: '2-wheeler', status: 'OCCUPIED', hourlyRate: 15 },
  { slotNumber: 'B-04', floor: 1, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 15 },

  // Floor 2
  { slotNumber: 'C-01', floor: 2, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 30 },
  { slotNumber: 'C-02', floor: 2, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 30 },
  { slotNumber: 'C-03', floor: 2, type: '4-wheeler', status: 'RESERVED', hourlyRate: 30 },
  { slotNumber: 'C-04', floor: 2, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 30 },
  { slotNumber: 'D-01', floor: 2, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 15 },
  { slotNumber: 'D-02', floor: 2, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 15 },
  { slotNumber: 'D-03', floor: 2, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 15 },
  { slotNumber: 'D-04', floor: 2, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 15 },

  // Floor 3
  { slotNumber: 'E-01', floor: 3, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 25 },
  { slotNumber: 'E-02', floor: 3, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 25 },
  { slotNumber: 'E-03', floor: 3, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 25 },
  { slotNumber: 'E-04', floor: 3, type: '4-wheeler', status: 'AVAILABLE', hourlyRate: 25 },
  { slotNumber: 'F-01', floor: 3, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 10 },
  { slotNumber: 'F-02', floor: 3, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 10 },
  { slotNumber: 'F-03', floor: 3, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 10 },
  { slotNumber: 'F-04', floor: 3, type: '2-wheeler', status: 'AVAILABLE', hourlyRate: 10 },
];

export async function seedParkingSlots(force = false) {
  const count = await ParkingSlot.countDocuments();
  if (count > 0 && !force) {
    return { count, seeded: false };
  }

  if (force) {
    await ParkingSlot.deleteMany({});
  }

  const created = await ParkingSlot.insertMany(
    initialSlots.map((slot) => ({
      ...slot,
      slotId: slot.slotNumber,
    }))
  );

  return { count: created.length, seeded: true };
}

