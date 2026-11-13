import { MongoMemoryReplSet } from 'mongodb-memory-server';

console.log('Starting local MongoDB server for development and manual verification...');

try {
  const replSet = await MongoMemoryReplSet.create({
    instanceOpts: [
      {
        port: 27017,
      },
    ],
    replSet: {
      count: 1,
      dbName: 'vehicle_parking',
      storageEngine: 'wiredTiger',
    },
  });

  console.log(`\n========================================`);
  console.log(`MongoDB local replica set ready on port 27017`);
  console.log(`URI: mongodb://127.0.0.1:27017/vehicle_parking`);
  console.log(`ACID Multi-Document Transactions: ENABLED`);
  console.log(`========================================\n`);
  console.log('Press Ctrl+C to terminate MongoDB.');

  const shutdown = async () => {
    console.log('\nStopping local MongoDB server...');
    await replSet.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Failed to start local MongoDB:', error.message);
  process.exit(1);
}
