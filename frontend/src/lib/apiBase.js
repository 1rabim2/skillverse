const raw = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Normalize trailing slashes and prevent accidentally passing /admin as the base.
let base = String(raw).replace(/\/+$/, '');
if (base.endsWith('/admin')) base = base.slice(0, -'/admin'.length);

export const API_BASE = base;
export const ADMIN_API_BASE = `${base}/admin`;

