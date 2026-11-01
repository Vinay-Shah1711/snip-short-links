import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import CreateLinkForm from '../components/CreateLinkForm.jsx';
import { useLiveClicks } from '../hooks/useLiveClicks.js';
import { shortHost } from '../utils.js';

function LinkRow({ link, flash, onDelete }) {
  const [copied, setCopied] = useState(false);
  const expired = link.expiresAt && new Date(link.expiresAt) < new Date();

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
    <div className={`card flex flex-col gap-3 p-4 transition sm:flex-row sm:items-center ${flash ? 'border-acid' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/links/${link.id}`} className="font-mono text-base font-semibold text-acid hover:underline">
            {link.shortUrl.replace(/^https?:\/\//, '')}
          </Link>
          {link.hasPassword && <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-[11px] text-slate-300">🔒 protected</span>}
          {expired && <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[11px] text-red-300">expired</span>}
          {link.expiresAt && !expired && (
            <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-[11px] text-slate-300">
              ⌛ until {new Date(link.expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm text-slate-400">
          {link.title ? <span className="text-slate-200">{link.title} · </span> : null}
          {shortHost(link.url)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="min-w-[72px] text-right">
          <div className={`text-2xl font-bold tabular-nums ${flash ? 'text-acid' : ''}`}>{link.clickCount}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-500">clicks</div>
        </div>
        <button onClick={copy} className="btn-ghost">{copied ? 'Copied ✓' : 'Copy'}</button>
        <Link to={`/links/${link.id}`} className="btn-ghost">Analytics</Link>
        <button
          onClick={() => window.confirm('Delete this link and all its click data?') && onDelete(link.id)}
          className="btn-ghost hover:!border-red-400 hover:!text-red-300"
          title="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function Links() {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState('');
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    api.listLinks().then(setLinks).catch((e) => setError(e.message));
  }, []);

  // Live: when a click arrives, bump that link's counter instantly
  const live = useLiveClicks((click) => {
    setLinks((prev) => prev && prev.map((l) => (l.id === click.linkId ? { ...l, clickCount: l.clickCount + 1 } : l)));
    setFlashId(click.linkId);
    setTimeout(() => setFlashId((cur) => (cur === click.linkId ? null : cur)), 900);
  });

  const total = links?.reduce((s, l) => s + l.clickCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Your links</h1>
          <p className="text-sm text-slate-400">
            {links ? `${links.length} links · ${total.toLocaleString()} total clicks` : 'Loading…'}
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-ink-700 px-3 py-1 text-xs text-slate-300">
          <span className={`h-2 w-2 rounded-full ${live ? 'pulse-dot bg-acid' : 'bg-slate-600'}`} />
          {live ? 'LIVE' : 'connecting…'}
        </span>
      </div>

      <CreateLinkForm onCreated={(l) => setLinks((prev) => [l, ...(prev || [])])} />

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="space-y-3">
        {links?.length === 0 && (
          <div className="card p-10 text-center text-slate-400">
            No links yet. Paste a long URL above and hit <b className="text-acid">Shorten</b>.
          </div>
        )}
        {links?.map((l) => (
          <LinkRow
            key={l.id}
            link={l}
            flash={flashId === l.id}
            onDelete={async (id) => {
              await api.deleteLink(id);
              setLinks((prev) => prev.filter((x) => x.id !== id));
            }}
          />
        ))}
      </div>
    </div>
  );
}
