// Fills the database with a demo account + realistic fake clicks (last 14 days)
// so you can take dashboard screenshots without waiting for real traffic.
//   Login: demo@example.com / demo1234
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { User } from '../src/models/User.js';
import { Link } from '../src/models/Link.js';
import { Click } from '../src/models/Click.js';
import { hashIp } from '../src/services/clickProcessor.js';

const pick = (items) => {
  const total = items.reduce((s, i) => s + i[1], 0);
  let r = Math.random() * total;
  for (const [v, w] of items) if ((r -= w) <= 0) return v;
  return items[0][0];
};

const COUNTRIES = [['IN', 40], ['US', 18], ['GB', 8], ['AE', 7], ['DE', 6], ['SG', 5], ['CA', 5], ['AU', 4], ['FR', 3], ['JP', 2], ['BR', 2]];
const DEVICES = [['mobile', 62], ['desktop', 33], ['tablet', 5]];
const BROWSERS = [['Chrome', 55], ['Mobile Safari', 18], ['Safari', 8], ['Firefox', 7], ['Edge', 7], ['Samsung Browser', 5]];
const OS = [['Android', 40], ['Windows', 25], ['iOS', 20], ['macOS', 10], ['Linux', 5]];
const REFERRERS = [['instagram.com', 35], ['Direct', 25], ['whatsapp.com', 20], ['t.co', 8], ['linkedin.com', 7], ['google.com', 5]];

const LINKS = [
  { slug: 'menu-demo', title: 'Restaurant menu (Instagram bio)', url: 'https://example.com/menu', clicks: 900 },
  { slug: 'diwali-offer', title: 'Diwali offer campaign', url: 'https://example.com/offers/diwali', clicks: 450 },
  { slug: 'my-portfolio', title: 'Portfolio website', url: 'https://example.com/portfolio', clicks: 180 },
];

await mongoose.connect(config.mongoUri);

let user = await User.findOne({ email: 'demo@example.com' });
if (!user) {
  user = await User.create({ name: 'Demo User', email: 'demo@example.com', passwordHash: await bcrypt.hash('demo1234', 10) });
}

for (const spec of LINKS) {
  const link =
    (await Link.findOne({ slug: spec.slug })) ||
    (await Link.create({ userId: user._id, slug: spec.slug, url: spec.url, title: spec.title }));
  await Click.deleteMany({ linkId: link._id });

  const now = Date.now();
  const docs = [];
  for (let i = 0; i < spec.clicks; i++) {
    // More recent days get more traffic, with a little noise
    const daysAgo = Math.floor(Math.pow(Math.random(), 1.6) * 14);
    const ts = new Date(now - daysAgo * 86400e3 - Math.random() * 86400e3);
    if (ts.getTime() > now) continue;
    docs.push({
      linkId: link._id,
      userId: user._id,
      ts,
      country: pick(COUNTRIES),
      device: pick(DEVICES),
      browser: pick(BROWSERS),
      os: pick(OS),
      referrer: pick(REFERRERS),
      ipHash: hashIp(`10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 120)}`),
    });
  }
  await Click.insertMany(docs);
  await Link.updateOne({ _id: link._id }, { clickCount: docs.length });
  console.log(`Seeded ${docs.length} clicks for /${spec.slug}`);
}

console.log('\nDone. Login with demo@example.com / demo1234');
await mongoose.disconnect();
