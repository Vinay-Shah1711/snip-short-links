// k6 load test for the redirect hot path.
//
// 1. Create a short link in the app and copy its slug (for example "menu-demo").
// 2. Run:   k6 run -e SLUG=menu-demo loadtest/redirect.js
//    Other URL:  k6 run -e BASE=http://localhost:5000 -e SLUG=abc123 loadtest/redirect.js
//
// Put the numbers k6 prints (req/s, p95 latency) on your resume ONLY if you ran this yourself.
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:5000';
const SLUG = __ENV.SLUG || 'menu-demo';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { target: 500, duration: '20s' },
        { target: 1500, duration: '30s' },
        { target: 1500, duration: '30s' },
        { target: 0, duration: '10s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<100'], // 95% of redirects under 100 ms
  },
};

export default function () {
  // redirects: 0 -> measure OUR response, not the destination website
  const res = http.get(`${BASE}/${SLUG}`, {
    redirects: 0,
    headers: { 'User-Agent': 'Mozilla/5.0 (k6 load test) Chrome/120' },
  });
  check(res, { 'is 302': (r) => r.status === 302 });
}
