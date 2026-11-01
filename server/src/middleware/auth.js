import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    req.userId = verifyToken(token).sub;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}
