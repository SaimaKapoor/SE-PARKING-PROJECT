import { MongoMemoryServer } from 'mongodb-memory-server';

console.log('Starting local MongoDB server for development and manual verification...');

try {
  const mongo = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'vehicle_parking',
    },
  });

  console.log(`\n========================================`);
  console.log(`MongoDB local server ready on port 27017`);
  console.log(`URI: mongodb://127.0.0.1:27017/vehicle_parking`);
  console.log(`========================================\n`);
  console.log('Press Ctrl+C to terminate MongoDB.');

  const shutdown = async () => {
    console.log('\nStopping local MongoDB server...');
    await mongo.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Failed to start local MongoDB:', error.message);
  process.exit(1);
}
