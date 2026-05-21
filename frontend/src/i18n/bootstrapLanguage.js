import i18n, { getSavedLanguage, persistLanguage, SUPPORTED_LANGUAGES } from './index';
import { API_BASE } from '../lib/apiBase';

export async function bootstrapLanguage() {
  const saved = getSavedLanguage();
  if (saved) return;

  try {
    const res = await fetch(`${String(API_BASE).replace(/\/+$/, '')}/settings/localization`, { credentials: 'include' });
    const data = await res.json().catch(() => null);
    const next = String(data?.defaultLanguage || '').trim().toLowerCase();
    if (res.ok && SUPPORTED_LANGUAGES.includes(next)) {
      persistLanguage(next);
      await i18n.changeLanguage(next);
    }
  } catch {
    // ignore
  }
}
