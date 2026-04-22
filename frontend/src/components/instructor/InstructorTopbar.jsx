import React from 'react';
import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

export default function InstructorTopbar({ user, onToggleSidebar }) {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));

  function toggleDarkMode() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('instructorTheme', next ? 'dark' : 'light');
  }

  function logout() {
    apiFetch('/auth/logout', { method: 'POST' })
      .catch(() => null)
      .finally(() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      });
  }

  React.useEffect(() => {
    const saved = localStorage.getItem('instructorTheme');
    if (saved) {
      const isDark = saved === 'dark';
      setDark(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, []);

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
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Instructor</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Welcome, {user?.name || 'Instructor'}
          </h2>
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

