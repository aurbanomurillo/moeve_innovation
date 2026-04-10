/* ── SENTINEL · API Helper ── */

const BASE = '';

export function getToken() {
  return localStorage.getItem('sentinel_token') || '';
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(BASE + path, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });
  
  if (res.status === 401) {
    localStorage.removeItem('sentinel_token');
    localStorage.removeItem('sentinel_user');
    window.location.reload();
    return null;
  }
  
  return res.json();
}

export function apiGet(path) {
  return api(path);
}

export function apiPost(path, body) {
  return api(path, { method: 'POST', body });
}

export function apiPut(path, body) {
  return api(path, { method: 'PUT', body });
}

export function apiDelete(path) {
  return api(path, { method: 'DELETE' });
}
