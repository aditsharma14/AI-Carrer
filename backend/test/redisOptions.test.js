import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const env = require('../src/config/env');
const { buildOptions } = require('../src/config/redisOptions');

describe('redis connection options', () => {

  it('is plain by default and always keeps the setting BullMQ requires', () => {
    const options = buildOptions();
    expect(options.tls).toBeUndefined();
    expect(options.maxRetriesPerRequest).toBeNull();
  });

  it('enables TLS with the right server name when REDIS_TLS is set', () => {
    env.redis.tls = true;
    env.redis.host = 'eu1-example.upstash.io';
    try {
      expect(buildOptions().tls).toEqual({ servername: 'eu1-example.upstash.io' });
    } finally {
      env.redis.tls = false;
      env.redis.host = 'localhost';
    }
  });
});
