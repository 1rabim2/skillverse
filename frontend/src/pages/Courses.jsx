import React from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../lib/apiBase';

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
  );
}

export default function Courses() {
  const token = localStorage.getItem('token');

  const [items, setItems] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [level, setLevel] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  async function load(nextPage = page) {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', '12');
      if (search.trim()) params.set('search', search.trim());
      if (category) params.set('category', category);
      if (level) params.set('level', level);

      const res = await fetch(`${API_BASE}/courses?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load courses');
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || nextPage);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load(1).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearch(e) {
    e.preventDefault();
    await load(1);
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Browse Courses</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Discover published courses and start learning.
            </p>
            {!token && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Sign in to enroll and track progress.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={onSearch} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40 md:col-span-2"
              placeholder="Search by title, category, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              <option value="Web Fundamentals">Web Fundamentals</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Database">Database</option>
              <option value="Tools">Tools</option>
              <option value="General">General</option>
            </select>
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">All levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-2">
              <button className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700">
                Search
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSearch('');
                  setCategory('');
                  setLevel('');
                  await load(1);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {loading && <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">Loading courses...</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <div key={c._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30">
                  {c.thumbnailUrl ? (
                    <img src={c.thumbnailUrl} alt={c.title} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-50 text-sm font-semibold text-slate-600 dark:from-indigo-950/30 dark:to-slate-950/30 dark:text-slate-300">
                      SkillVerse
                    </div>
                  )}
                </div>
                <h3 className="text-base font-extrabold tracking-tight">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {c.description || 'No description yet.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip>{c.category || 'General'}</Chip>
                  <Chip>{c.level || 'Beginner'}</Chip>
                  {c.skillPath?.title ? <Chip>{c.skillPath.title}</Chip> : null}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link
                    to={`/courses/${c._id}`}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
                  >
                    Open course
                  </Link>
                  <span className="text-xs text-slate-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:col-span-2 lg:col-span-3">
                No published courses found.
              </div>
            )}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {page} / {totalPages}</p>
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
        )}
      </div>
    </div>
  );
}

