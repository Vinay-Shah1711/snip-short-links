import crypto from 'node:crypto';
import { isbot } from 'isbot';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { Click } from '../models/Click.js';
import { Link } from '../models/Link.js';
import { config } from '../config.js';

const DEMO_COUNTRIES = ['IN', 'IN', 'IN', 'US', 'US', 'GB', 'DE', 'AE', 'SG', 'CA', 'AU', 'FR', 'BR', 'JP'];

function normalizeIp(ip = '') {
  return ip.replace(/^::ffff:/, '');
}

function isPrivateIp(ip) {
  return (
    !ip ||
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('fc') ||
    ip.startsWith('fd')
  );
}

export function hashIp(ip) {
  return crypto.createHash('sha256').update(config.ipSalt + ip).digest('hex').slice(0, 32);
}

function referrerHost(ref) {
  if (!ref) return 'Direct';
  try {
    return new URL(ref).hostname.replace(/^www\./, '') || 'Direct';
  } catch {
    return 'Direct';
  }
}

/**
 * Runs inside the worker. Enriches a raw click event and stores it.
 * Returns the saved click (public fields only) or null for bots.
 */
export async function processClick(data, io) {
  const { linkId, userId, ua = '', referrer, ts } = data;

  if (isbot(ua)) return null; // skip crawlers / link-preview bots

  const ip = normalizeIp(data.ip);
  let country = 'Unknown';
  let city = '';
  const geo = geoip.lookup(ip);
  if (geo) {
    country = geo.country || 'Unknown';
    city = geo.city || '';
  } else if (isPrivateIp(ip)) {
    country = config.demoGeo
      ? DEMO_COUNTRIES[Math.floor(Math.random() * DEMO_COUNTRIES.length)]
      : 'Unknown';
  }

  const parsed = new UAParser(ua).getResult();
  const device = parsed.device.type === 'mobile' || parsed.device.type === 'tablet' ? parsed.device.type : 'desktop';

  const click = await Click.create({
    linkId,
    userId,
    ts: ts ? new Date(ts) : new Date(),
    country,
    city,
    device,
    browser: parsed.browser.name || 'Other',
    os: parsed.os.name || 'Other',
    referrer: referrerHost(referrer),
    ipHash: hashIp(ip),
  });

  await Link.updateOne({ _id: linkId }, { $inc: { clickCount: 1 } });

  const payload = {
    linkId: String(linkId),
    ts: click.ts,
    country: click.country,
    city: click.city,
    device: click.device,
    browser: click.browser,
    os: click.os,
    referrer: click.referrer,
  };
  if (io) io.to(`user:${userId}`).emit('click', payload); // live dashboard update
  return payload;
}
