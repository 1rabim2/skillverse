import React from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../lib/apiBase';

function Card({ title, children, right }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        {right || null}
      </div>
      {children}
    </section>
  );
}

export default function Portfolio() {
  const token = localStorage.getItem('token');

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/user/me/portfolio`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        if (!res.ok) {
          const msg = result?.error || 'Failed to load portfolio';
          if (res.status === 404 && msg.toLowerCase().includes('user not found')) localStorage.removeItem('token');
          if (res.status === 401 || res.status === 403) localStorage.removeItem('token');
          throw new Error(msg);
        }
        if (mounted) setData(result);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-[70vh] grid place-items-center p-6">
        <div className="max-w-xl rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold">Portfolio</h1>
          <p className="mt-2 text-slate-600">Login as a student to view your portfolio.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/login" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              Go to Login
            </Link>
            <Link to="/" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              Back home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6">Loading portfolio...</div>;
  if (error) return <div className="p-6">Could not load portfolio: {error}</div>;

  const user = data?.user || {};
  const stats = data?.stats || {};
  const completedCourses = data?.completedCourses || [];
  const certificates = data?.certificates || [];

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">My Portfolio</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              A shareable view of what you’ve completed.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Back to Dashboard
            </Link>
            <Link
              to="/certificates"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
            >
              Certificates
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Profile">
            <div className="text-sm text-slate-700 dark:text-slate-200">
              <div className="font-semibold">{user.name || 'Student'}</div>
              <div className="text-slate-500">{user.email || ''}</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Enrolled', value: stats.enrolledCourses || 0 },
                { label: 'Completed', value: stats.completedCourses || 0 },
                { label: 'Certificates', value: stats.certificates || 0 }
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-950/30">
                  <div className="text-2xl font-extrabold">{s.value}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="lg:col-span-2 grid grid-cols-1 gap-4">
            <Card
              title="Completed Courses"
              right={
                <Link to="/courses" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                  Browse courses
                </Link>
              }
            >
              <div className="space-y-2">
                {completedCourses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.title}</div>
                      <div className="text-xs text-slate-500">{c.category} • {c.level}</div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.completedAt ? new Date(c.completedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                ))}
                {completedCourses.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
                    No completed courses yet. Complete lessons/quizzes to build your portfolio.
                  </div>
                )}
              </div>
            </Card>

            <Card title="Certificates">
              <div className="space-y-2">
                {certificates.map((c) => (
                  <div key={c.certificateId || c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.course?.title || 'Course'}</div>
                      <div className="text-xs text-slate-500">{c.certificateId}</div>
                    </div>
                    <div className="text-xs text-slate-500">{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : ''}</div>
                  </div>
                ))}
                {certificates.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
                    No certificates yet.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

