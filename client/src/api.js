// In dev, requests go to the Vite proxy ("" base). In production set VITE_API_URL.
export const API_URL = import.meta.env.VITE_API_URL || '';

export const getToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};
export const setToken = (t) => {
  try {
    t ? localStorage.setItem('token', t) : localStorage.removeItem('token');
  } catch {
    /* ignore */
  }
};

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  signup: (b) => request('/api/auth/signup', { method: 'POST', body: b }),
  login: (b) => request('/api/auth/login', { method: 'POST', body: b }),
  me: () => request('/api/auth/me'),
  listLinks: () => request('/api/links'),
  createLink: (b) => request('/api/links', { method: 'POST', body: b }),
  getLink: (id) => request(`/api/links/${id}`),
  deleteLink: (id) => request(`/api/links/${id}`, { method: 'DELETE' }),
  getStats: (id, range) => request(`/api/links/${id}/stats?range=${range}`),
};
