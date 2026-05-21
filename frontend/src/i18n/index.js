import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import ne from './locales/ne/translation.json';

export const SUPPORTED_LANGUAGES = ['en', 'ne'];
export const LANGUAGE_STORAGE_KEY = 'sv_lang';

export function getSavedLanguage() {
  try {
    const v = String(localStorage.getItem(LANGUAGE_STORAGE_KEY) || '').trim().toLowerCase();
    return SUPPORTED_LANGUAGES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

export function persistLanguage(lang) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, String(lang || '').trim().toLowerCase());
  } catch {
    // ignore
  }
}

export function getLocaleForLanguage(lang) {
  return String(lang || '').toLowerCase() === 'ne' ? 'ne-NP' : 'en-US';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ne: { translation: ne }
  },
  lng: getSavedLanguage() || 'ne',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
