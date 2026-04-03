import React from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function StatusPill({ status }) {
  const s = String(status || 'draft');
  const cls =
    s === 'approved'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
      : s === 'needs_changes'
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
        : s === 'submitted'
          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${cls}`}>{s}</span>;
}

export default function MyProjects() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [blocked, setBlocked] = React.useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      setBlocked(false);
      const res = await apiFetch('/user/me/projects');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setBlocked(true);
          return;
        }
        throw new Error(data?.error || 'Failed to load projects');
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  if (blocked) {
    return (
      <div className="grid min-h-[70vh] place-items-center p-4">
        <Card className="w-full max-w-xl p-6">
          <div className="text-lg font-extrabold tracking-tight">My Projects</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Sign in as a student to view your project submissions.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => (window.location.href = '/login')}>
              Go to student login
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
              Back to dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">My Projects</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Track your submissions and review feedback.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" as={Link} to="/dashboard">
            Dashboard
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-5">
          <div className="text-sm text-slate-600 dark:text-slate-300">Loading…</div>
        </Card>
      ) : error ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Could not load projects</div>
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Lesson</th>
                    <th className="px-4 py-3">Files</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3 text-right">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {items.map((p) => (
                    <tr key={p.id} className="align-top">
                      <td className="px-4 py-3">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{p.course?.title || 'Course'}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{p.lessonTitle || 'Project'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.attachmentCount || 0}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {p.course?.id && p.lessonId ? (
                          <Button as={Link} to={`/courses/${encodeURIComponent(p.course.id)}?lesson=${encodeURIComponent(String(p.lessonId))}`} variant="outline">
                            View
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-sm text-slate-600 dark:text-slate-300">
                        No project submissions yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

