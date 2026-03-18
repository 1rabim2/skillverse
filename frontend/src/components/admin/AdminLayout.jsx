import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import adminApi from '../../lib/adminApi';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [admin, setAdmin] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminData') || 'null');
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    adminApi
      .get('/auth/me')
      .then((res) => {
        setAdmin(res.data.admin);
        localStorage.setItem('adminData', JSON.stringify(res.data.admin));
      })
      .catch(() => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        window.location.href = '/admin/login';
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <AdminTopbar admin={admin} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
