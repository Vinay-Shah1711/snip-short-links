import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shortlinks',
  redisUrl: (process.env.REDIS_URL || '').trim(),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  ipSalt: process.env.IP_SALT || 'dev-salt',
  baseUrl: (process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, ''),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  demoGeo: process.env.DEMO_GEO === 'true',
  trustProxy: process.env.TRUST_PROXY === '1',
};
