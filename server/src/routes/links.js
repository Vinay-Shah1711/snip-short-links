import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';
import { Link } from '../models/Link.js';
import { Click } from '../models/Click.js';
import { requireAuth } from '../middleware/auth.js';
import { createLinkLimiter } from '../middleware/rateLimit.js';
import { cacheDel } from '../services/cache.js';
import { config } from '../config.js';

const router = Router();
router.use(requireAuth);

const makeSlug = customAlphabet('abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', 7);
const RESERVED = new Set(['api', 'health', 'login', 'signup', 'admin', 'static', 'assets']);

const createSchema = z.object({
  url: z
    .string()
    .trim()
    .url('Enter a full URL, for example https://example.com')
    .refine((u) => /^https?:\/\//i.test(u), 'Only http and https links are allowed'),
  slug: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]{3,32}$/, 'Slug: 3-32 letters, numbers, - or _')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  title: z.string().trim().max(100).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional().or(z.literal('').transform(() => undefined)),
  password: z.string().min(4, 'Password needs at least 4 characters').max(100).optional().or(z.literal('').transform(() => undefined)),
});

const present = (l) => ({
  id: l._id,
  slug: l.slug,
  shortUrl: `${config.baseUrl}/${l.slug}`,
  url: l.url,
  title: l.title,
  clickCount: l.clickCount,
  hasPassword: !!l.passwordHash,
  expiresAt: l.expiresAt,
  createdAt: l.createdAt,
});

const validId = (id) => mongoose.isValidObjectId(id);

router.post('/', createLinkLimiter, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { url, slug, title, expiresAt, password } = parsed.data;

  if (slug && RESERVED.has(slug.toLowerCase())) return res.status(400).json({ error: 'That slug is reserved' });
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    return res.status(400).json({ error: 'Expiry must be in the future' });
  }

  const base = {
    userId: req.userId,
    url,
    title: title || '',
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    passwordHash: password ? await bcrypt.hash(password, 10) : null,
  };

  try {
    if (slug) {
      const link = await Link.create({ ...base, slug });
      return res.status(201).json(present(link));
    }
    // random slug: retry a few times if we hit a duplicate (very rare)
    for (let i = 0; i < 5; i++) {
      try {
        const link = await Link.create({ ...base, slug: makeSlug() });
        return res.status(201).json(present(link));
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
    }
    res.status(500).json({ error: 'Could not generate a slug, try again' });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'That slug is already taken' });
    throw e;
  }
});

router.get('/', async (req, res) => {
  const links = await Link.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
  res.json(links.map(present));
});

router.get('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Link not found' });
  const link = await Link.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!link) return res.status(404).json({ error: 'Link not found' });
  res.json(present(link));
});

router.delete('/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Link not found' });
  const link = await Link.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!link) return res.status(404).json({ error: 'Link not found' });
  await Click.deleteMany({ linkId: link._id });
  await cacheDel(link.slug); // otherwise the deleted link would keep redirecting from cache
  res.status(204).end();
});

// ---------- analytics ----------
const RANGES = { '24h': 24 * 3600e3, '7d': 7 * 24 * 3600e3, '30d': 30 * 24 * 3600e3 };

router.get('/:id/stats', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Link not found' });
  const link = await Link.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const range = RANGES[req.query.range] ? req.query.range : '7d';
  const hourly = range === '24h';
  const since = new Date(Date.now() - RANGES[range]);
  const top = (field) => [
    { $group: { _id: `$${field}`, clicks: { $sum: 1 } } },
    { $sort: { clicks: -1 } },
    { $limit: 8 },
  ];

  const [r] = await Click.aggregate([
    { $match: { linkId: link._id, ts: { $gte: since } } },
    {
      $facet: {
        total: [{ $count: 'n' }],
        unique: [{ $group: { _id: '$ipHash' } }, { $count: 'n' }],
        series: [
          {
            $group: {
              _id: { $dateToString: { format: hourly ? '%Y-%m-%dT%H:00' : '%Y-%m-%d', date: '$ts' } },
              clicks: { $sum: 1 },
            },
          },
        ],
        countries: top('country'),
        devices: top('device'),
        browsers: top('browser'),
        referrers: top('referrer'),
        recent: [{ $sort: { ts: -1 } }, { $limit: 15 }, { $project: { _id: 0, ts: 1, country: 1, city: 1, device: 1, browser: 1, os: 1, referrer: 1 } }],
      },
    },
  ]);

  // Fill empty buckets with 0 so the chart line is continuous
  const counts = new Map(r.series.map((s) => [s._id, s.clicks]));
  const series = [];
  const step = hourly ? 3600e3 : 86400e3;
  const startMs = Math.floor(since.getTime() / step) * step;
  for (let t = startMs; t <= Date.now(); t += step) {
    const iso = new Date(t).toISOString();
    const bucket = hourly ? `${iso.slice(0, 13)}:00` : iso.slice(0, 10);
    series.push({ bucket, clicks: counts.get(bucket) || 0 });
  }

  const rename = (arr) => arr.map((x) => ({ name: x._id, clicks: x.clicks }));
  res.json({
    range,
    total: r.total[0]?.n || 0,
    unique: r.unique[0]?.n || 0,
    series,
    countries: rename(r.countries),
    devices: rename(r.devices),
    browsers: rename(r.browsers),
    referrers: rename(r.referrers),
    recent: r.recent,
  });
});

export default router;
