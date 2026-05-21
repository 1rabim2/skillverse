import React from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiFetch';
import CourseSearchBox from './CourseSearchBox';
import i18n, { getLocaleForLanguage, persistLanguage, SUPPORTED_LANGUAGES } from '../i18n';

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  );
}

export default function HeaderBar({ user, onLogout }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const initials = (user?.name || 'SV')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [notifOpen, setNotifOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [userOpen, setUserOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [unread, setUnread] = React.useState(0);
  const notifRef = React.useRef(null);
  const mobileRef = React.useRef(null);
  const userRef = React.useRef(null);

  React.useEffect(() => {
    // Keep the header search in sync when navigating back/forward on /courses.
    if (!location.pathname.startsWith('/courses')) return;
    const params = new URLSearchParams(location.search);
    setSearch(params.get('search') || '');
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    function onDocClick(e) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (mobileOpen && mobileRef.current && !mobileRef.current.contains(e.target)) setMobileOpen(false);
      if (userOpen && userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [notifOpen, mobileOpen, userOpen]);

  async function loadNotifications() {
    if (!user?.email) return;
    try {
      const res = await apiFetch('/user/notifications?limit=8');
      const data = await res.json();
      if (!res.ok) return;
      setItems(data.items || []);
      setUnread(data.unreadCount || 0);
    } catch {
      // ignore
    }
  }

  async function markRead(id) {
    if (!user?.email) return;
    try {
      await apiFetch(`/user/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
      await loadNotifications();
    } catch {
      // ignore
    }
  }

  async function markUnread(id) {
    if (!user?.email) return;
    try {
      await apiFetch(`/user/notifications/${encodeURIComponent(id)}/unread`, { method: 'PATCH' });
      await loadNotifications();
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    if (!user?.email) return;
    try {
      await apiFetch('/user/notifications/read-all', { method: 'POST' });
      await loadNotifications();
    } catch {
      // ignore
    }
  }

  async function setLanguage(nextLang) {
    const lang = String(nextLang || '').trim().toLowerCase();
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    persistLanguage(lang);
    await i18n.changeLanguage(lang);
  }

  const currentLang = String(i18n.language || 'en').toLowerCase();
  const currentLocale = getLocaleForLanguage(currentLang);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-6 2xl:max-w-[1440px]">
        <div className="flex items-center gap-3">
          <div className="relative" ref={mobileRef}>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 md:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              title={t('header.menu')}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {mobileOpen && (
              <div className="absolute left-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 p-2 dark:border-slate-800">
                  <CourseSearchBox
                    value={search}
                    onChange={setSearch}
                    placeholder={t('header.searchCoursesPlaceholder')}
                    onSubmit={(q) => {
                      const next = String(q || '').trim();
                      setMobileOpen(false);
                      if (!next) navigate('/courses');
                      else navigate(`/courses?search=${encodeURIComponent(next)}`);
                    }}
                    onPickCourse={(id) => {
                      setMobileOpen(false);
                      navigate(`/courses/${encodeURIComponent(id)}`);
                    }}
                  />
                </div>

                <div className="space-y-1 p-2">
                  <NavItem to="/dashboard" onClick={() => setMobileOpen(false)}>
                    {t('nav.dashboard')}
                  </NavItem>
                  <NavItem to="/skill-paths" onClick={() => setMobileOpen(false)}>
                    {t('nav.paths')}
                  </NavItem>
                  <NavItem to="/courses" onClick={() => setMobileOpen(false)}>
                    {t('nav.courses')}
                  </NavItem>
                  <NavItem to="/community" onClick={() => setMobileOpen(false)}>
                    {t('nav.community')}
                  </NavItem>
                  <NavItem to="/portfolio" onClick={() => setMobileOpen(false)}>
                    {t('nav.portfolio')}
                  </NavItem>
                  <NavItem to="/game/quiz" onClick={() => setMobileOpen(false)}>
                    {t('nav.game')}
                  </NavItem>
                  <NavItem to="/projects" onClick={() => setMobileOpen(false)}>
                    {t('nav.projects')}
                  </NavItem>
                  <NavItem to="/profile" onClick={() => setMobileOpen(false)}>
                    {t('nav.profile')}
                  </NavItem>
                  <NavItem to="/subscribe" onClick={() => setMobileOpen(false)}>
                    {t('nav.subscribe')}
                  </NavItem>
                  <div className="pt-1">
                    <label className="block px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t('header.language')}
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      value={currentLang}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="ne">नेपाली</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
                    onClick={() => {
                      setMobileOpen(false);
                      onLogout();
                    }}
                  >
                    {t('header.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <a href="/dashboard" className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            Skill<span className="text-indigo-600 dark:text-indigo-400">Verse</span>
          </a>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <NavItem to="/dashboard">{t('nav.dashboard')}</NavItem>
          <NavItem to="/skill-paths">{t('nav.paths')}</NavItem>
          <NavItem to="/courses">{t('nav.courses')}</NavItem>
          <NavItem to="/community">{t('nav.community')}</NavItem>
          <NavItem to="/portfolio">{t('nav.portfolio')}</NavItem>
          <NavItem to="/game/quiz">{t('nav.game')}</NavItem>
          <NavItem to="/projects">{t('nav.projects')}</NavItem>
          <NavItem to="/profile">{t('nav.profile')}</NavItem>
          <NavItem to="/subscribe">{t('nav.subscribe')}</NavItem>
        </nav>

        <div className="hidden w-[420px] max-w-[42vw] md:block">
          <CourseSearchBox
            value={search}
            onChange={setSearch}
            onSubmit={(q) => {
              const next = String(q || '').trim();
              if (!next) navigate('/courses');
              else navigate(`/courses?search=${encodeURIComponent(next)}`);
            }}
            onPickCourse={(id) => navigate(`/courses/${encodeURIComponent(id)}`)}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <select
              aria-label={t('header.language')}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              value={currentLang}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">EN</option>
              <option value="ne">ने</option>
            </select>
          </div>
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              title={t('header.notifications')}
              onClick={async () => {
                const next = !notifOpen;
                setNotifOpen(next);
                if (next) await loadNotifications();
              }}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-extrabold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="text-sm font-extrabold">{t('header.notifications')}</div>
                  <button
                    type="button"
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    onClick={markAllRead}
                  >
                    {t('header.markAllRead')}
                  </button>
                </div>
                <div className="max-h-[360px] overflow-auto">
                  {items.map((n) => (
                    <div
                      key={n._id}
                      className={[
                        'border-b border-slate-100 p-4 dark:border-slate-800',
                        n.readAt ? '' : 'bg-indigo-50/60 dark:bg-indigo-950/20'
                      ].join(' ')}
                    >
                      <button type="button" className="w-full text-left" onClick={() => markRead(n._id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-extrabold">{n.title || t('header.notificationFallbackTitle')}</div>
                          {!n.readAt && <span className="mt-1 inline-block h-2 w-2 rounded-full bg-indigo-600" />}
                        </div>
                        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{n.message}</div>
                        <div className="mt-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString(currentLocale)}</div>
                      </button>
                      {n.readAt && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                            onClick={() => markUnread(n._id)}
                          >
                            {t('header.markUnread')}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="p-4 text-sm text-slate-600 dark:text-slate-300">{t('header.noNotifications')}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userRef}>
            <button
              type="button"
              className="inline-flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-left shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              title={t('header.account')}
              onClick={() => setUserOpen((v) => !v)}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-extrabold text-white">
                {initials}
              </span>
              <span className="hidden max-w-[180px] flex-col md:flex">
                <span className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                  {user?.name || 'Student'}
                </span>
                <span className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || ''}</span>
              </span>
            </button>

            {userOpen && (
              <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="truncate text-sm font-extrabold">{user?.name || 'Student'}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || ''}</div>
                </div>
                <div className="p-2">
                  <NavLink
                    to="/profile"
                    onClick={() => setUserOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {t('nav.profile')}
                  </NavLink>
                  <button
                    type="button"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/30"
                    onClick={() => {
                      setUserOpen(false);
                      onLogout();
                    }}
                  >
                    {t('header.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
