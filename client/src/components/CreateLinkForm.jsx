import { useState } from 'react';
import { api } from '../api.js';

export default function CreateLinkForm({ onCreated }) {
  const [form, setForm] = useState({ url: '', slug: '', title: '', expiresAt: '', password: '' });
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = { ...form };
      // datetime-local gives "2026-11-01T10:30" (local time) -> convert to a full ISO string
      body.expiresAt = form.expiresAt ? new Date(form.expiresAt).toISOString() : '';
      const link = await api.createLink(body);
      setForm({ url: '', slug: '', title: '', expiresAt: '', password: '' });
      onCreated(link);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input className="input flex-1" value={form.url} onChange={set('url')} placeholder="Paste a long link… https://example.com/very/long/page" required />
        <input className="input sm:w-48" value={form.slug} onChange={set('slug')} placeholder="custom-slug (optional)" />
        <button className="btn sm:w-32" disabled={busy}>{busy ? 'Creating…' : 'Shorten'}</button>
      </div>

      <button type="button" onClick={() => setMore(!more)} className="mt-3 text-xs font-medium text-slate-400 hover:text-white">
        {more ? '− Hide options' : '+ More options (title, expiry, password)'}
      </button>

      {more && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder="Instagram bio link" />
          </div>
          <div>
            <label className="label">Expires at</label>
            <input className="input" type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="text" value={form.password} onChange={set('password')} placeholder="Optional" />
          </div>
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
    </form>
  );
}
