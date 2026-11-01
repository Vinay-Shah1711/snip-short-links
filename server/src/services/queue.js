import { Queue, Worker } from 'bullmq';
import { config } from '../config.js';
import { createQueueConnection } from './redis.js';

/**
 * Click queue.
 * - With REDIS_URL  -> BullMQ (durable, retries, concurrency)
 * - Without it      -> tiny in-process queue so the project still runs anywhere
 *
 * The redirect handler only calls add() and does NOT await the database.
 * That is the whole point: a redirect never waits for analytics.
 */
export function createClickQueue(handler) {
  if (config.redisUrl) {
    const queue = new Queue('clicks', {
      connection: createQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      },
    });
    const worker = new Worker('clicks', (job) => handler(job.data), {
      connection: createQueueConnection(),
      concurrency: 25,
    });
    worker.on('failed', (job, err) => console.warn('[worker] job failed:', err.message));
    return {
      mode: 'bullmq',
      add: (data) => queue.add('click', data),
      close: async () => {
        await worker.close();
        await queue.close();
      },
    };
  }

  return {
    mode: 'in-memory',
    add: async (data) => {
      setImmediate(() => handler(data).catch((e) => console.warn('[worker] failed:', e.message)));
    },
    close: async () => {},
  };
}
