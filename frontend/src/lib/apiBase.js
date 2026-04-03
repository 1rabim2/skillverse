const raw = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Normalize trailing slashes and prevent accidentally passing /admin as the base.
let base = String(raw).replace(/\/+$/, '');
if (base.endsWith('/admin')) base = base.slice(0, -'/admin'.length);

export const API_BASE = base;
export const ADMIN_API_BASE = `${base}/admin`;
export const SERVER_BASE = base.endsWith('/api') ? base.slice(0, -'/api'.length) : base;

// CSRF token management
let csrfToken = null;

export async function getCSRFToken() {
  if (csrfToken) return csrfToken;
  
  try {
    const response = await fetch(`${base}/csrf-token`, {
      credentials: 'include'
    });
    const data = await response.json();
    csrfToken = data.token;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
}

export function invalidateCSRFToken() {
  csrfToken = null;
}

export async function ensureCSRFToken() {
  if (!csrfToken) {
    await getCSRFToken();
  }
}
