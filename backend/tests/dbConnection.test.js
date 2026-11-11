import './setupMongo.js';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

describe('connectDB', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('retries failed initial connections and resolves when MongoDB becomes available', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    jest.useFakeTimers();
    const connection = { connection: { host: 'localhost' } };
    const connect = jest.spyOn(mongoose, 'connect')
      .mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockResolvedValueOnce(connection);

    const resultPromise = connectDB();
    await jest.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe(connection);
    expect(connect).toHaveBeenCalledTimes(3);
    expect(connect).toHaveBeenLastCalledWith('mongodb://localhost:27017/test', {
      serverSelectionTimeoutMS: 5000,
    });
  });

  test('stops retrying after the bounded attempt count', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    jest.useFakeTimers();
    const failure = new Error('database unavailable');
    const connect = jest.spyOn(mongoose, 'connect').mockRejectedValue(failure);

    const resultPromise = connectDB();
    const assertion = expect(resultPromise).rejects.toBe(failure);
    await jest.runAllTimersAsync();
    await assertion;

    expect(connect).toHaveBeenCalledTimes(5);
  });
});
