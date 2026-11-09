import mongoose from 'mongoose';

/** Run related MongoDB writes atomically. Requires a replica set or sharded cluster. */
export async function runInTransaction(operation) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operation(session);
    }, {
      readPreference: 'primary',
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export function transactionError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
