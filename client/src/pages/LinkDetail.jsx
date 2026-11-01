import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api.js';
import { useLiveClicks } from '../hooks/useLiveClicks.js';
import LiveFeed from '../components/LiveFeed.jsx';
import QRBox from '../components/QRBox.jsx';
import { countryName, flag, shortHost } from '../utils.js';

const RANGES = [
  ['24h', 'Last 24 hours'],
  ['7d', '7 days'],
  ['30d', '30 days'],
];
const COLORS = ['#c6ff3d', '#5eead4', '#60a5fa', '#f472b6', '#fbbf24'];
const tooltipStyle = { background: '#18212c', border: '1px solid #2f4054', borderRadius: 12, color: '#e8edf2', fontSize: 12 };

function Stat({ label, value, hint }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-1 truncate text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function BarList({ title, items, render }) {
  const max = Math.max(1, ...items.map((i) => i.clicks));
  return (
    <div className="card p-5">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No data yet</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((i) => (
            <li key={i.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate">{render ? render(i.name) : i.name}</span>
                <span className="ml-2 tabular-nums text-slate-400">{i.clicks}</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-700">
                <div className="h-1.5 rounded-full bg-acid" style={{ width: `${(i.clicks / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const fmtBucket = (b, range) => {
  if (range === '24h') return b.slice(11, 16);
  const d = new Date(`${b}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export default function LinkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState(null);
  const [range, setRange] = useState('7d');
  const [stats, setStats] = useState(null);
  const [feed, setFeed] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const feedReady = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    api.getLink(id).then(setLink).catch((e) => setError(e.message));
  }, [id]);

  const loadStats = useCallback(() => {
    api
      .getStats(id, range)
      .then((s) => {
        setStats(s);
        // The feed starts from the latest saved clicks; after that, socket events are prepended
        if (!feedReady.current) {
          setFeed(s.recent);
          feedReady.current = true;
        }
      })
      .catch((e) => setError(e.message));
  }, [id, range]);

  useEffect(loadStats, [loadStats]);

  const live = useLiveClicks((click) => {
    if (click.linkId !== id) return;
    setFeed((f) => [{ ...click, live: true }, ...f].slice(0, 30));
    setLink((l) => l && { ...l, clickCount: l.clickCount + 1 });
    // Refresh charts shortly after (debounced so a burst of clicks = one refetch)
    clearTimeout(timer.current);
    timer.current = setTimeout(loadStats, 700);
  });

  if (error) return <p className="rounded-lg bg-red-500/10 px-3 py-2 text-red-300">{error} — <Link className="underline" to="/">back</Link></p>;
  if (!link || !stats) return <p className="text-slate-400">Loading…</p>;

  const topCountry = stats.countries[0];
  const topRef = stats.referrers[0];

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy this link:', link.shortUrl);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-slate-400 hover:text-white">← All links</Link>

      <div className="card flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {link.title && <p className="text-sm text-slate-400">{link.title}</p>}
          <a href={link.shortUrl} target="_blank" rel="noreferrer" className="font-mono text-2xl font-bold text-acid hover:underline">
            {link.shortUrl.replace(/^https?:\/\//, '')}
          </a>
          <p className="mt-1 truncate text-sm text-slate-400">→ {shortHost(link.url)}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={copy} className="btn-ghost">{copied ? 'Copied ✓' : 'Copy link'}</button>
            <button
              onClick={async () => {
                if (!window.confirm('Delete this link and all its click data?')) return;
                await api.deleteLink(id);
                navigate('/');
              }}
              className="btn-ghost hover:!border-red-400 hover:!text-red-300"
            >
              Delete
            </button>
          </div>
        </div>
        <QRBox value={link.shortUrl} name={link.slug} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className="flex rounded-xl border border-ink-600 p-0.5">
          {RANGES.map(([v, label]) => (
            <button
              key={v}
              onClick={() => setRange(v)}
              className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${range === v ? 'bg-acid text-ink-950' : 'text-slate-300 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Clicks (range)" value={stats.total.toLocaleString()} hint={`${link.clickCount.toLocaleString()} all time`} />
        <Stat label="Unique visitors" value={stats.unique.toLocaleString()} hint="by hashed IP" />
        <Stat label="Top country" value={topCountry ? `${flag(topCountry.name)} ${topCountry.name}` : '—'} hint={topCountry ? countryName(topCountry.name) : 'no data'} />
        <Stat label="Top source" value={topRef ? topRef.name : '—'} hint={topRef ? `${topRef.clicks} clicks` : 'no data'} />
      </div>

      <div className="card p-5">
        <h3 className="mb-4 font-semibold">Clicks over time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.series} margin={{ left: -20, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c6ff3d" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#c6ff3d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#223041" vertical={false} />
              <XAxis dataKey="bucket" tickFormatter={(b) => fmtBucket(b, range)} stroke="#64748b" fontSize={11} tickLine={false} minTickGap={24} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(b) => fmtBucket(b, range)} formatter={(v) => [v, 'clicks']} />
              <Area type="monotone" dataKey="clicks" stroke="#c6ff3d" strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">Devices</h3>
          {stats.devices.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No data yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.devices} dataKey="clicks" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="none">
                      {stats.devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 text-sm">
                {stats.devices.map((d, i) => (
                  <li key={d.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 capitalize">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {d.name}
                    </span>
                    <span className="tabular-nums text-slate-400">{d.clicks}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <BarList title="Top countries" items={stats.countries} render={(c) => `${flag(c)}  ${countryName(c)}`} />
        <BarList title="Browsers" items={stats.browsers} />
        <BarList title="Referrers" items={stats.referrers} />
      </div>

      <LiveFeed clicks={feed} live={live} />
    </div>
  );
}
