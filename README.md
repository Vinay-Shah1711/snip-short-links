# Snip — short links with live analytics (MERN)

A link shortener where every click shows up on a dashboard **live**: country, device, browser and referrer, streamed over WebSockets. Built with the MERN stack plus Redis, a job queue and Socket.IO.

> Paste a long link → get `yourdomain.com/abc1234` → watch clicks appear in real time.

<!-- Add a screenshot or GIF of the dashboard here: docs/dashboard.png -->

## Features  

mongodb+srv://vinayshah1711_db_user:daXB7HQs5PWwVX1h@cluster0.qdpx7j0.mongodb.net/
=======
- Sign up / log in (JWT, bcrypt)
- Create short links with an optional **custom slug**, **expiry date** and **password protection**
- Fast redirect: slug → URL is served from a **Redis cache**; MongoDB is only hit on a cache miss
- Clicks are **queued (BullMQ)** and processed by a worker, so a redirect never waits for the database
- Worker enriches each click: country (GeoIP), device, browser, OS, referrer. Bots are skipped
- Dashboard: total & unique clicks, clicks over time, top countries, devices, browsers, referrers
- **Live click feed** over Socket.IO (private room per user)
- QR code per link (download as PNG)
- Privacy: raw IPs are never stored, only a salted SHA-256 hash
- Rate limiting on login, signup, link creation and password attempts
- k6 load-test script and Docker Compose for MongoDB + Redis

## Architecture

```
Visitor ── GET /abc ──▶ Express redirect ──▶ Redis (slug → URL)   [miss → MongoDB, then cache]
                              │
                              ├── 302 redirect straight away
                              └── click event ──▶ BullMQ queue ──▶ Worker
                                                                   ├─ GeoIP + User-Agent parsing
                                                                   ├─ save Click in MongoDB
                                                                   └─ Socket.IO ──▶ React dashboard (live)
```

| Layer | Tech |
|-------|------|
| Frontend | React (Vite), Tailwind CSS, Recharts, socket.io-client |
| Backend | Node.js, Express |
| Database | MongoDB + Mongoose |
| Cache / Queue | Redis, BullMQ |
| Realtime | Socket.IO |
| Extras | geoip-lite, ua-parser-js, isbot, zod, helmet, k6, Docker Compose |

## Run it locally

You need Node.js 18+ and either Docker Desktop **or** a MongoDB Atlas connection string.

```bash
# 1. databases (Docker)
docker compose up -d

# 2. backend
cd server
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm run seed                # optional: demo account + fake clicks
npm run dev                 # http://localhost:5000

# 3. frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Demo login after seeding: `demo@example.com` / `demo1234`.

No Redis? Leave `REDIS_URL=` empty in `server/.env`. The app falls back to an in-memory cache and an in-process queue.

## API

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signup` · `/api/auth/login` | returns `{ token, user }` |
| GET | `/api/auth/me` | current user |
| POST | `/api/links` | create link (`url`, `slug?`, `title?`, `expiresAt?`, `password?`) |
| GET | `/api/links` | list my links |
| GET | `/api/links/:id` | one link |
| GET | `/api/links/:id/stats?range=24h\|7d\|30d` | analytics |
| DELETE | `/api/links/:id` | delete link + its clicks |
| GET | `/:slug` | **redirect** (302) |
| GET | `/api/health` | shows cache and queue mode |

## Load test

```bash
k6 run -e SLUG=menu-demo loadtest/redirect.js
```

Record your own result here after running it:

| Date | Machine | Peak req/s | p95 latency | Errors |
|------|---------|-----------|-------------|--------|
|      |         |           |             |        |

## Design decisions

- **302 not 301.** Browsers cache 301s, so repeat clicks would never reach the server and would not be counted.
- **Fire-and-forget tracking.** The redirect handler adds the click to a queue without awaiting it.
- **Cache failure never breaks redirects.** Any Redis error falls back to MongoDB.
- **Deleting a link clears its cache key**, otherwise it would keep redirecting.
- **Hashed IPs.** Unique visitors are counted from a salted hash. The raw address is discarded.
- **Index on `slug` (unique)** and on `{ linkId, ts }` for analytics queries.

## What broke and what I learned

_Fill this in as you build. Interviewers love this section._

- 

## Roadmap

Kafka/Redpanda pipeline, ClickHouse for analytics, custom domains, link-in-bio page.
