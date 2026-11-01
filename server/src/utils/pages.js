const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const shell = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0f14;color:#e8edf2;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .card{width:min(92vw,380px);padding:32px;border:1px solid #1f2a36;border-radius:16px;background:#111821;text-align:center}
  h1{margin:0 0 8px;font-size:22px} p{margin:0 0 20px;color:#8b9aab;font-size:14px}
  input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid #2a3748;background:#0b0f14;color:#fff;font-size:15px;margin-bottom:12px}
  button{width:100%;padding:12px;border:0;border-radius:10px;background:#c6ff3d;color:#10150a;font-weight:700;font-size:15px;cursor:pointer}
  .err{color:#ff7a7a;font-size:13px;margin:-4px 0 12px} .big{font-size:44px;margin-bottom:8px}
</style></head><body><div class="card">${body}</div></body></html>`;

export const notFoundPage = () =>
  shell('Link not found', `<div class="big">🔎</div><h1>Link not found</h1><p>This short link doesn't exist or was deleted.</p>`);

export const expiredPage = () =>
  shell('Link expired', `<div class="big">⌛</div><h1>Link expired</h1><p>The owner set this link to stop working.</p>`);

export const passwordPage = (slug, error = '') =>
  shell(
    'Protected link',
    `<div class="big">🔒</div><h1>Protected link</h1><p>Enter the password to continue.</p>
     <form method="POST" action="/${esc(slug)}/unlock">
       <input type="password" name="password" placeholder="Password" required autofocus>
       ${error ? `<div class="err">${esc(error)}</div>` : ''}
       <button type="submit">Open link</button>
     </form>`
  );
