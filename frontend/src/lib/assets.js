import { SERVER_BASE } from './apiBase';

export function resolveAssetUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/')) return `${SERVER_BASE}${raw}`;
  return raw;
}

