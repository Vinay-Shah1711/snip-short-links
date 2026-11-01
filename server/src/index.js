import 'express-async-errors'; // lets Express 4 catch errors thrown inside async route handlers
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import linkRoutes from './routes/links.js';
import { buildRedirectRouter } from './routes/redirect.js';
import { createSocketServer } from './socket.js';
import { createClickQueue } from './services/queue.js';
import { processClick } from './services/clickProcessor.js';
import { cacheMode } from './services/cache.js';

async function main() {
  await mongoose.connect(config.mongoUri);
  console.log('[mongo] connected');

  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '10kb' }));

  const server = http.createServer(app);
  const io = createSocketServer(server);
  const queue = createClickQueue((data) => processClick(data, io));

  app.get('/api/health', (req, res) =>
    res.json({ ok: true, cache: cacheMode, queue: queue.mode, mongo: mongoose.connection.readyState === 1 })
  );
  app.use('/api/auth', authRoutes);
  app.use('/api/links', linkRoutes);
  app.use('/', buildRedirectRouter(queue)); // must stay LAST: it owns /:slug

  // Central error handler (async errors reach here thanks to express-async-errors)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  server.listen(config.port, () => {
    console.log(`[http] listening on ${config.baseUrl}  (cache: ${cacheMode}, queue: ${queue.mode})`);
  });

  const shutdown = async () => {
    console.log('\nShutting down...');
    await queue.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));

main().catch((e) => {
  console.error('Failed to start:', e.message);
  process.exit(1);
});
