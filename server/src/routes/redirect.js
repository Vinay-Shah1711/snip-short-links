import { Router } from 'express';
import express from 'express';
import bcrypt from 'bcryptjs';
import { Link } from '../models/Link.js';
import { cacheGet, cacheSet } from '../services/cache.js';
import { unlockLimiter } from '../middleware/rateLimit.js';
import { notFoundPage, expiredPage, passwordPage } from '../utils/pages.js';

const SLUG_RE = /^[a-zA-Z0-9_-]{3,32}$/;

/**
 * The hot path. Every click on a short link goes through here, so it must be fast:
 *   1. look the slug up in the cache (Redis)
 *   2. on a miss, read MongoDB once and fill the cache
 *   3. push a click event to the queue WITHOUT awaiting it
 *   4. answer with a 302 redirect immediately
 *
 * 302 (not 301) is deliberate: browsers cache 301s, so repeat clicks would never reach us.
 */
export function buildRedirectRouter(queue) {
  const router = Router();

  const track = (req, link) => {
    queue
      .add({
        linkId: link.id,
        userId: link.userId,
        ip: req.ip,
        ua: req.get('user-agent') || '',
        referrer: req.get('referer') || '',
        ts: Date.now(),
      })
      .catch((e) => console.warn('[queue] could not enqueue click:', e.message));
  };

  async function resolve(slug) {
    let link = await cacheGet(slug);
    if (link) return link;
    const doc = await Link.findOne({ slug }).lean();
    if (!doc) return null;
    link = {
      id: String(doc._id),
      userId: String(doc.userId),
      url: doc.url,
      exp: doc.expiresAt ? new Date(doc.expiresAt).getTime() : null,
      pw: !!doc.passwordHash,
    };
    await cacheSet(slug, link);
    return link;
  }

  router.get('/:slug', async (req, res) => {
    const { slug } = req.params;
    if (!SLUG_RE.test(slug)) return res.status(404).send(notFoundPage());

    const link = await resolve(slug);
    if (!link) return res.status(404).send(notFoundPage());
    if (link.exp && link.exp < Date.now()) return res.status(410).send(expiredPage());
    if (link.pw) return res.send(passwordPage(slug));

    track(req, link); // fire and forget
    res.redirect(302, link.url);
  });

  router.post('/:slug/unlock', unlockLimiter, express.urlencoded({ extended: false }), async (req, res) => {
    const { slug } = req.params;
    if (!SLUG_RE.test(slug)) return res.status(404).send(notFoundPage());

    const doc = await Link.findOne({ slug }).lean();
    if (!doc) return res.status(404).send(notFoundPage());
    if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) return res.status(410).send(expiredPage());

    const ok = doc.passwordHash && (await bcrypt.compare(String(req.body.password || ''), doc.passwordHash));
    if (!ok) return res.status(401).send(passwordPage(slug, 'Wrong password'));

    track(req, { id: String(doc._id), userId: String(doc.userId) });
    res.redirect(302, doc.url);
  });

  return router;
}
