import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Logo } from '../components/Layout.jsx';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignup) await signup(form.name, form.email, form.password);
      else await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-bold">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-1 text-sm text-slate-400">Short links with a live click dashboard.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          {isSignup && (
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={set('name')} placeholder="Vinay" required />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} placeholder="At least 6 characters" required />
          </div>
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button className="btn w-full" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}</button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <Link className="font-semibold text-acid" to={isSignup ? '/login' : '/signup'}>
            {isSignup ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
}
