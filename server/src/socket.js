import { Server } from 'socket.io';
import { config } from './config.js';
import { verifyToken } from './middleware/auth.js';

/**
 * Each logged-in user joins a private room "user:<id>".
 * The click worker emits to that room, so you only ever see your own clicks.
 */
export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.userId = verifyToken(token).sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
  });

  return io;
}
