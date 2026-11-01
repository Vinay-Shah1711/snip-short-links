import { countryName, flag, timeAgo } from '../utils.js';

const deviceIcon = { mobile: '📱', tablet: '📟', desktop: '💻' };

export default function LiveFeed({ clicks, live }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Live click feed</h3>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <span className={`h-2 w-2 rounded-full ${live ? 'pulse-dot bg-acid' : 'bg-slate-600'}`} />
          {live ? 'listening' : 'connecting…'}
        </span>
      </div>

      {clicks.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Waiting for clicks… open your short link in another tab or on your phone.
        </p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {clicks.map((c, i) => (
            <li key={`${c.ts}-${i}`} className={`flex items-center gap-3 rounded-xl bg-ink-800 px-3 py-2 text-sm ${i === 0 && c.live ? 'slidein' : ''}`}>
              <span className="text-xl">{flag(c.country)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {c.city ? `${c.city}, ` : ''}
                  {countryName(c.country)}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {deviceIcon[c.device] || '💻'} {c.browser} · {c.os} · from {c.referrer}
                </div>
              </div>
              <span className="whitespace-nowrap text-xs text-slate-500">{timeAgo(c.ts)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
