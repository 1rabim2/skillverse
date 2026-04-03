import React from 'react';
import ProgressOverview from '../components/ProgressOverview';
import CourseCarousel from '../components/CourseCarousel';
import Achievements from '../components/Achievements';
import MotivationBanner from '../components/MotivationBanner';
import { adminFetch, apiFetch } from '../lib/apiFetch';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

function AccessMessage({ isAdminOnly, onReset }) {
  return (
    <div className="grid min-h-[70vh] place-items-center p-4">
      <Card className="w-full max-w-xl p-6">
        <div className="text-lg font-extrabold tracking-tight">Dashboard Access</div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {isAdminOnly
            ? 'You are logged in as admin. The student dashboard requires a student session.'
            : 'You are not logged in as a student. Sign in to access your dashboard.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!isAdminOnly ? (
            <Button variant="primary" onClick={() => (window.location.href = '/login')}>
              Go to student login
            </Button>
          ) : (
            <Button variant="primary" onClick={() => (window.location.href = '/admin/dashboard')}>
              Go to admin dashboard
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              onReset();
            }}
          >
            Reset session
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [blocked, setBlocked] = React.useState(null); // null | { isAdminOnly: boolean }

  React.useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');
        setBlocked(null);
        const res = await apiFetch('/user/me/dashboard');
        const result = await res.json();
        if (!res.ok) {
          const msg = result?.error || 'Failed to load dashboard';
          if (res.status === 404 && msg.toLowerCase().includes('user not found')) {
            throw new Error('Session expired. Please login again.');
          }
          if (res.status === 401 || res.status === 403) {
            let isAdminOnly = false;
            try {
              const adminRes = await adminFetch('/auth/me');
              isAdminOnly = adminRes.ok;
            } catch {
              // ignore
            }
            if (mounted) setBlocked({ isAdminOnly });
            return;
          }
          throw new Error(msg);
        }
        if (mounted) setData(result);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  async function resetSession() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    try {
      await adminFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('token'); // legacy cleanup
    localStorage.removeItem('adminToken'); // legacy cleanup
    localStorage.removeItem('adminData');
    window.location.href = '/login';
  }

  if (blocked) return <AccessMessage isAdminOnly={blocked.isAdminOnly} onReset={resetSession} />;

  if (loading) {
    return (
      <Card className="p-5">
        <div className="text-sm text-slate-600 dark:text-slate-300">Loading dashboard...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Could not load dashboard</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/login')}>
            Go to login
          </Button>
          <Button variant="outline" onClick={resetSession}>
            Reset session
          </Button>
        </div>
      </Card>
    );
  }

  const user = data?.user || { name: 'Student' };
  const stats = data?.stats || {};
  const badges = data?.badges || [];
  const courses = data?.courses || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.name || 'Student'}
          </div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Continue where you left off.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => (window.location.href = '/courses')}>
            Browse courses
          </Button>
          <Button variant="secondary" onClick={() => (window.location.href = '/profile')}>
            Profile
          </Button>
        </div>
      </div>

      <ProgressOverview stats={stats} />

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold">Continue learning</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Pick up a course and keep moving.</div>
          </div>
          <Button variant="ghost" onClick={() => (window.location.href = '/courses')}>
            View all
          </Button>
        </div>
        <div className="mt-4">
          <CourseCarousel courses={courses} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Achievements badges={badges} />
        </div>
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold">Recent activity</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">A quick view of what changed.</div>
            </div>
            <Button variant="outline" onClick={() => (window.location.href = '/community')}>
              Community
            </Button>
          </div>
          <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/20">
            {recentActivity.map((item, idx) => (
              <div key={`${item.type}-${idx}`} className="p-4 text-sm text-slate-700 dark:text-slate-200">
                {item.message}
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-300">No recent activity yet.</div>
            )}
          </div>
        </Card>
      </div>

      <MotivationBanner />
    </div>
  );
}
