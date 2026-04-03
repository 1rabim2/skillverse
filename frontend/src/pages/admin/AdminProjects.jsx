import React from 'react';
import adminApi from '../../lib/adminApi';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'needs_changes', label: 'Needs changes' },
  { value: 'approved', label: 'Approved' },
  { value: 'draft', label: 'Draft' }
];

export default function AdminProjects() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [editing, setEditing] = React.useState(null);
  const [feedback, setFeedback] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function load(nextPage = page) {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.get('/project-submissions', {
        params: { page: nextPage, limit: 20, status: status || '', search: search.trim() || '' }
      });
      setItems(res.data?.items || []);
      setPage(res.data?.page || nextPage);
      setTotalPages(res.data?.totalPages || 1);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load(1).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyFilters(e) {
    e.preventDefault();
    await load(1);
  }

  function openEdit(item) {
    setEditing(item);
    setFeedback(item?.feedback || '');
  }

  async function saveReview(nextStatus) {
    if (!editing?.id) return;
    try {
      setSaving(true);
      await adminApi.patch(`/project-submissions/${editing.id}`, { status: nextStatus, feedback });
      setEditing(null);
      setFeedback('');
      await load(page);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Review</p>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Project submissions</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Approve projects or request changes.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40 md:col-span-3"
            placeholder="Search by user, course, or lesson..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700">
            Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">Loading submissions...</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">{error}</div>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Lesson</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{it.user?.name || 'Student'}</div>
                    <div className="text-xs text-slate-500">{it.user?.email || ''}</div>
                  </td>
                  <td className="px-4 py-3">{it.course?.title || '-'}</td>
                  <td className="px-4 py-3">{it.lessonTitle || it.lessonId}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {it.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{it.updatedAt ? new Date(it.updatedAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                      onClick={() => openEdit(it)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-sm text-slate-600 dark:text-slate-300">
                    No submissions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold">Review submission</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {editing.user?.email} • {editing.course?.title} • {editing.lessonTitle}
                </div>
              </div>
              <button className="text-sm font-semibold text-slate-600 dark:text-slate-300" onClick={() => setEditing(null)}>
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              {editing.repoUrl ? (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Repo</div>
                  <a className="font-semibold text-indigo-600" href={editing.repoUrl} target="_blank" rel="noreferrer">
                    {editing.repoUrl}
                  </a>
                </div>
              ) : null}
              {editing.demoUrl ? (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Demo</div>
                  <a className="font-semibold text-indigo-600" href={editing.demoUrl} target="_blank" rel="noreferrer">
                    {editing.demoUrl}
                  </a>
                </div>
              ) : null}
              {editing.notes ? (
                <div>
                  <div className="text-xs font-semibold text-slate-500">Notes</div>
                  <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/30">
                    {editing.notes}
                  </pre>
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500">Feedback</div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                placeholder="Give feedback or request changes..."
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                disabled={saving}
                onClick={() => saveReview('needs_changes')}
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
              >
                Needs changes
              </button>
              <button
                disabled={saving}
                onClick={() => saveReview('approved')}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200"
              >
                Approve
              </button>
              <button
                disabled={saving}
                onClick={() => saveReview(editing.status || 'submitted')}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
              >
                Save only
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

