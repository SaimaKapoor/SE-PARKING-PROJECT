import nodeCrypto from 'node:crypto';
import fs from 'node:fs';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Polyfill global crypto for Node 18 and Jest VM environments
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = nodeCrypto.webcrypto || nodeCrypto;
}

if (!globalThis.crypto.getRandomValues && nodeCrypto.webcrypto?.getRandomValues) {
  globalThis.crypto.getRandomValues = nodeCrypto.webcrypto.getRandomValues.bind(nodeCrypto.webcrypto);
}

if (!globalThis.crypto.randomUUID && nodeCrypto.randomUUID) {
  globalThis.crypto.randomUUID = nodeCrypto.randomUUID.bind(nodeCrypto);
}

if (typeof global !== 'undefined' && typeof global.crypto === 'undefined') {
  global.crypto = globalThis.crypto;
}

// If running locally on macOS with Homebrew mongod, use it to avoid downloading during local dev.
// On Linux/CI, this path does not exist, so mongodb-memory-server will automatically use/download the Linux binary.
if (!process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync('/opt/homebrew/bin/mongod')) {
  process.env.MONGOMS_SYSTEM_BINARY = '/opt/homebrew/bin/mongod';
  process.env.MONGOMS_VERSION = '7.0.23';
}

export async function createMongoServer() {
  return MongoMemoryServer.create();
}

export async function stopMongoServer(mongoServer) {
  if (mongoServer && typeof mongoServer.stop === 'function') {
    try {
      await mongoServer.stop();
    } catch {
      // Ignore cleanup error if already stopped
    }
  }
}

