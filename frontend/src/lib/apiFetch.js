import { API_BASE, ADMIN_API_BASE, getCSRFToken } from './apiBase';

function joinUrl(base, path) {
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '');
  if (/^https?:\/\//i.test(p)) return p;
  if (!p) return b;
  if (p.startsWith('/')) return `${b}${p}`;
  return `${b}/${p}`;
}

async function withCsrfIfNeeded(method, headers) {
  const m = String(method || 'GET').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return headers;
  const csrf = await getCSRFToken();
  if (csrf && !headers.has('X-XSRF-TOKEN')) headers.set('X-XSRF-TOKEN', csrf);
  return headers;
}

export async function apiFetch(path, options = {}) {
  const url = joinUrl(API_BASE, path);
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  await withCsrfIfNeeded(method, headers);

  return fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include'
  });
}

export async function adminFetch(path, options = {}) {
  const url = joinUrl(ADMIN_API_BASE, path);
  const method = String(options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  await withCsrfIfNeeded(method, headers);

  return fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include'
  });
}
