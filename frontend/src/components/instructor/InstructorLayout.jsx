import React from 'react';
import { Outlet } from 'react-router-dom';
import InstructorSidebar from './InstructorSidebar';
import InstructorTopbar from './InstructorTopbar';
import { apiFetch } from '../../lib/apiFetch';

export default function InstructorLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    apiFetch('/auth/me')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok || !data?.user) {
          window.location.href = '/login';
          return;
        }
        setUser(data.user);
      })
      .catch(() => {
        window.location.href = '/login';
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <InstructorSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <InstructorTopbar user={user} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="mx-auto w-full max-w-7xl p-4 lg:p-6 2xl:max-w-[1440px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
