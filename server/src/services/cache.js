import { createCacheClient } from './redis.js';

const redis = createCacheClient();
const memory = new Map(); // fallback when REDIS_URL is empty
const TTL_SECONDS = 60 * 60;

export const cacheMode = redis ? 'redis' : 'memory';

const key = (slug) => `link:${slug}`;

export async function cacheGet(slug) {
  try {
    if (redis) {
      const raw = await redis.get(key(slug));
      return raw ? JSON.parse(raw) : null;
    }
    const hit = memory.get(slug);
    if (!hit) return null;
    if (hit.exp < Date.now()) {
      memory.delete(slug);
      return null;
    }
    return hit.value;
  } catch {
    return null; // cache problems must never break a redirect
  }
}

export async function cacheSet(slug, value) {
  try {
    if (redis) await redis.set(key(slug), JSON.stringify(value), 'EX', TTL_SECONDS);
    else memory.set(slug, { value, exp: Date.now() + TTL_SECONDS * 1000 });
  } catch {
    /* ignore */
  }
}

export async function cacheDel(slug) {
  try {
    if (redis) await redis.del(key(slug));
    else memory.delete(slug);
  } catch {
    /* ignore */
  }
}
