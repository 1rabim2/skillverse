import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import HeaderBar from './HeaderBar';
import { apiFetch } from '../lib/apiFetch';

export default function StudentLayout() {
  const location = useLocation();
  const [user, setUser] = React.useState({ name: 'Student', email: '' });

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('token'); // legacy cleanup
      window.location.href = '/login';
    }
  }

  React.useEffect(() => {
    let mounted = true;
    async function loadMe() {
      try {
        const res = await apiFetch('/user/me');
        const data = await res.json();
        if (!res.ok) {
          if (mounted) setUser({ name: 'Student', email: '' });
          return;
        }
        if (mounted && data?.user) setUser(data.user);
      } catch {
        if (mounted) setUser({ name: 'Student', email: '' });
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <HeaderBar user={user} onLogout={logout} />
      <main className="mx-auto w-full max-w-7xl p-4 lg:p-6 2xl:max-w-[1440px]">
        <Outlet />
      </main>
    </div>
  );
}
