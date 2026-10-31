import { describe, expect, test } from '@jest/globals';
import { calculateParkingFee } from '../src/services/feeCalculation.js';

describe('calculateParkingFee (UT-01)', () => {
  test('zero minutes costs zero', () => expect(calculateParkingFee(0, 30)).toBe(0));
  test('a positive duration under one hour costs one hourly rate', () => expect(calculateParkingFee(1, 30)).toBe(30));
  test('exactly one hour costs one hourly rate', () => expect(calculateParkingFee(60, 30)).toBe(30));
  test('one minute over an hour rounds up to two hours', () => expect(calculateParkingFee(61, 30)).toBe(60));
  test('three hours and a minute rounds up to four hours', () => expect(calculateParkingFee(181, 25)).toBe(100));
  test('rejects negative duration', () => expect(() => calculateParkingFee(-1, 30)).toThrow());
  test('rejects invalid rate', () => expect(() => calculateParkingFee(60, -1)).toThrow());
});
