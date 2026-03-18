import React from 'react';
import { Bell, LogOut, Menu, Moon, Sun } from 'lucide-react';
import adminApi from '../../lib/adminApi';

export default function AdminTopbar({ admin, onToggleSidebar }) {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [unread, setUnread] = React.useState(0);
  const dropdownRef = React.useRef(null);

  function toggleDarkMode() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('adminTheme', next ? 'dark' : 'light');
  }

  function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    window.location.href = '/admin/login';
  }

  React.useEffect(() => {
    const saved = localStorage.getItem('adminTheme');
    if (saved) {
      const isDark = saved === 'dark';
      setDark(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, []);

  React.useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function loadNotifications() {
    try {
      const res = await adminApi.get('/notifications', { params: { limit: 8 } });
      setItems(res.data.items || []);
      setUnread(res.data.unreadCount || 0);
    } catch {
      // ignore
    }
  }

  async function markRead(id) {
    try {
      await adminApi.patch(`/notifications/${id}/read`);
      await loadNotifications();
    } catch {
      // ignore
    }
  }

  async function markUnread(id) {
    try {
      await adminApi.patch(`/notifications/${id}/unread`);
      await loadNotifications();
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await adminApi.post('/notifications/read-all');
      await loadNotifications();
    } catch {
      // ignore
    }
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-md border border-slate-300 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200 lg:hidden"
        >
          <Menu size={18} />
        </button>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Admin Panel</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Welcome, {admin?.name || 'Admin'}</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="rounded-md border border-slate-300 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200"
          title="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={async () => {
              const next = !open;
              setOpen(next);
              if (next) await loadNotifications();
            }}
            className="relative rounded-md border border-slate-300 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200"
            title="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-bold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
                <button
                  onClick={markAllRead}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[360px] overflow-auto">
                {items.map((n) => {
                  const isUnread = !n.readAt;
                  return (
                    <div
                      key={n._id}
                      className={`w-full px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        isUnread ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <button
                        onClick={() => markRead(n._id)}
                        className="w-full text-left"
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title || 'Notification'}</p>
                            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{n.message}</p>
                            <p className="mt-1 text-xs text-slate-500">{new Date(n.createdAt).toLocaleString()}</p>
                          </div>
                          {isUnread && <span className="mt-1 h-2 w-2 rounded-full bg-indigo-600" />}
                        </div>
                      </button>
                      {!isUnread && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => markUnread(n._id)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                          >
                            Mark unread
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="px-3 py-6 text-sm text-slate-500">No notifications yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
