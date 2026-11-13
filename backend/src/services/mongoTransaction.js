import mongoose from 'mongoose';

let transactionsSupported = null;

if (mongoose.connection) {
  mongoose.connection.on('disconnected', () => {
    transactionsSupported = null;
  });
}

/**
 * Run related MongoDB writes atomically.
 * Uses replica set ACID multi-document transactions when available.
 * If running on a standalone MongoDB instance (common in local single-node setups),
 * gracefully falls back to direct execution without transaction wrappers.
 */
export async function runInTransaction(operation) {
  if (transactionsSupported === false) {
    return await operation(null);
  }

  let session = null;
  try {
    session = await mongoose.startSession();
  } catch {
    transactionsSupported = false;
    return await operation(null);
  }

  try {
    let result;
    await session.withTransaction(async () => {
      result = await operation(session);
    }, {
      readPreference: 'primary',
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });
    transactionsSupported = true;
    return result;
  } catch (err) {
    const isUnsupported =
      err?.message?.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
      err?.code === 20;

    if (isUnsupported) {
      transactionsSupported = false;
      return await operation(null);
    }
    throw err;
  } finally {
    try {
      await session.endSession();
    } catch {
      // Ignore session teardown errors
    }
  }
}

export function transactionError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
