import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

// Creating links: 30 per minute per IP
export const createLinkLimiter = make(60_000, 30, 'Too many links created, slow down a little');
// Login / signup: 20 per 15 minutes per IP (slows password guessing)
export const authLimiter = make(15 * 60_000, 20, 'Too many attempts, try again later');
// Password-protected link unlock attempts: 10 per 10 minutes
export const unlockLimiter = make(10 * 60_000, 10, 'Too many attempts, try again later');
