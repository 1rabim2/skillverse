import React from 'react';
import { apiFetch } from '../../lib/apiFetch';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'needs_changes', label: 'Needs changes' },
  { value: 'approved', label: 'Approved' },
  { value: 'draft', label: 'Draft' }
];

function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v == null) return;
    const s = String(v).trim();
    if (!s) return;
    sp.set(k, s);
  });
  const out = sp.toString();
  return out ? `?${out}` : '';
}

export default function InstructorProjects() {
  const [courses, setCourses] = React.useState([]);
  const [courseId, setCourseId] = React.useState('');
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

  React.useEffect(() => {
    apiFetch('/courses/mine')
      .then((res) => res.json())
      .then((data) => {
        const list = data?.items || [];
        setCourses(list);
        if (!courseId && list[0]?._id) setCourseId(list[0]._id);
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(nextPage = page) {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(
        `/instructor/project-submissions${qs({
          page: nextPage,
          limit: 20,
          status: status || '',
          search: search || '',
          courseId: courseId || ''
        })}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load submissions');
      setItems(data?.items || []);
      setPage(data?.page || nextPage);
      setTotalPages(data?.totalPages || 1);
    } catch (e) {
      setError(e.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load(1).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

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
      const res = await apiFetch(`/instructor/project-submissions/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, feedback })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save review');
      setEditing(null);
      setFeedback('');
      await load(page);
    } catch (e) {
      alert(e.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Review</p>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Project submissions</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Approve projects or request changes for your courses.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={applyFilters} className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 md:col-span-2"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40 md:col-span-3"
            placeholder="Search by student or lesson..."
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
          <button className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 md:col-span-6">
            Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">Loading submissions...</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Lesson</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Updated</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{it.user?.name || 'Student'}</div>
                      <div className="text-xs text-slate-500">{it.user?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{it.lessonTitle || 'Project'}</div>
                      <div className="text-xs text-slate-500">{it.repoUrl ? 'Repo attached' : it.demoUrl ? 'Demo attached' : '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{it.status || 'draft'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {it.updatedAt ? new Date(it.updatedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(it)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      No submissions found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
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
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold">Review submission</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {editing.user?.email} • {editing.course?.title || ''} • {editing.lessonTitle}
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

