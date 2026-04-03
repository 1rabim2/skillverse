import React from 'react';
import { apiFetch } from '../lib/apiFetch';
import { API_BASE } from '../lib/apiBase';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Certificates() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [blocked, setBlocked] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        setBlocked(false);
        const res = await apiFetch('/user/me/certificates');
        const data = await res.json();
        if (!res.ok) {
          const msg = data?.error || 'Failed to load certificates';
          if (res.status === 404 && msg.toLowerCase().includes('user not found')) {
            throw new Error('Session expired. Please login again.');
          }
          if (res.status === 401 || res.status === 403) {
            if (mounted) setBlocked(true);
            return;
          }
          throw new Error(msg);
        }
        if (mounted) setItems(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (blocked) {
    return (
      <div className="grid min-h-[70vh] place-items-center p-4">
        <Card className="w-full max-w-xl p-6">
          <div className="text-lg font-extrabold tracking-tight">My Certificates</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            You are not logged in as a student. Sign in to view your certificates.
          </p>
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

  if (loading) {
    return (
      <Card className="p-5">
        <div className="text-sm text-slate-600 dark:text-slate-300">Loading certificates...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Could not load certificates</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">My Certificates</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Certificates issued after completing courses.
          </div>
        </div>
        <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          Back to dashboard
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">Certificate ID</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3 text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {items.map((c) => (
              <tr key={c._id || c.certificateId} className="text-sm">
                <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{c.certificateId}</td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{c.course?.title || 'Course'}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {typeof c.scorePercent === 'number'
                    ? `${c.scorePercent}%${typeof c.passPercent === 'number' ? ` (pass ${c.passPercent}%)` : ''}`
                    : '-'}
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {c.issuedAt ? new Date(c.issuedAt).toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.certificateId ? (
                    <Button
                      as="a"
                      variant="outline"
                      href={`${API_BASE}/user/me/certificates/${encodeURIComponent(String(c.certificateId))}/download`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500">-</span>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-sm text-slate-600 dark:text-slate-300">
                  No certificates yet. Complete a course to generate one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
