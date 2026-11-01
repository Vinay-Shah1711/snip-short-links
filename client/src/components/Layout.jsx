import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-acid text-ink-950">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12h16M13 5l7 7-7 7" />
        </svg>
      </span>
      Snip
    </span>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-ink-700 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-400 sm:inline">{user.name}</span>
            <button onClick={logout} className="btn-ghost">Log out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
