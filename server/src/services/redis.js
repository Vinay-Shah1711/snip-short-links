import IORedis from 'ioredis';
import { config } from '../config.js';

// Two separate connections on purpose:
// 1. cache  -> fails fast so a Redis outage never blocks a redirect
// 2. queue  -> BullMQ requires maxRetriesPerRequest: null
export function createCacheClient() {
  if (!config.redisUrl) return null;
  const client = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });
  client.on('error', (e) => console.warn('[redis:cache]', e.message));
  return client;
}

export function createQueueConnection() {
  const client = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  client.on('error', (e) => console.warn('[redis:queue]', e.message));
  return client;
}
