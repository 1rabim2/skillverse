import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/apiFetch';
import CourseSearchBox from '../components/CourseSearchBox';
import CourseThumb from '../components/CourseThumb';

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
  );
}

export default function Courses() {
  const location = useLocation();
  const navigate = useNavigate();

  const [items, setItems] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [level, setLevel] = React.useState('');
  const [skillPath, setSkillPath] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  async function load({ nextPage = page, nextSearch = search, nextCategory = category, nextLevel = level, nextSkillPath = skillPath } = {}) {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      params.set('page', String(nextPage));
      params.set('limit', '12');
      if (String(nextSearch || '').trim()) params.set('search', String(nextSearch || '').trim());
      if (nextCategory) params.set('category', nextCategory);
      if (nextLevel) params.set('level', nextLevel);
      if (nextSkillPath) params.set('skillPath', nextSkillPath);

      const res = await apiFetch(`/courses?${params.toString()}`);
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
    const params = new URLSearchParams(location.search);
    const nextSearch = params.get('search') || '';
    const nextCategory = params.get('category') || '';
    const nextLevel = params.get('level') || '';
    const nextSkillPath = params.get('skillPath') || '';
    const nextPageRaw = Number(params.get('page') || '1');
    const nextPage = Number.isFinite(nextPageRaw) && nextPageRaw > 0 ? nextPageRaw : 1;

    setSearch(nextSearch);
    setCategory(nextCategory);
    setLevel(nextLevel);
    setSkillPath(nextSkillPath);

    load({ nextPage, nextSearch, nextCategory, nextLevel, nextSkillPath }).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  function applyFilters({
    nextSearch = search,
    nextCategory = category,
    nextLevel = level,
    nextSkillPath = skillPath,
    nextPage = 1
  } = {}) {
    const params = new URLSearchParams();
    const s = String(nextSearch || '').trim();
    if (s) params.set('search', s);
    if (nextCategory) params.set('category', nextCategory);
    if (nextLevel) params.set('level', nextLevel);
    if (nextSkillPath) params.set('skillPath', nextSkillPath);
    if (Number(nextPage) > 1) params.set('page', String(nextPage));
    navigate(`/courses${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async function onSearch(e) {
    e.preventDefault();
    applyFilters();
  }

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Browse Courses</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Discover published courses and start learning.
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Sign in to enroll and track progress.</p>
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
            <CourseSearchBox
              className="md:col-span-2"
              value={search}
              onChange={setSearch}
              placeholder="Search by title, category, or description..."
              onSubmit={(q) => {
                const next = String(q || '');
                setSearch(next);
                applyFilters({ nextSearch: next });
              }}
              onPickCourse={(id) => navigate(`/courses/${encodeURIComponent(id)}`)}
            />
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={category}
              onChange={(e) => {
                const v = e.target.value;
                setCategory(v);
                applyFilters({ nextCategory: v, nextPage: 1 });
              }}
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
              onChange={(e) => {
                const v = e.target.value;
                setLevel(v);
                applyFilters({ nextLevel: v, nextPage: 1 });
              }}
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
                  setSkillPath('');
                  navigate('/courses');
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

      {skillPath ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Filtered by skill path</span>
          <Link
            to={`/skill-paths/${encodeURIComponent(skillPath)}`}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            View path
          </Link>
          <button
            type="button"
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => {
              setSkillPath('');
              applyFilters({ nextSkillPath: '', nextPage: 1 });
            }}
          >
            Clear
          </button>
        </div>
      ) : null}

        {loading && <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">Loading courses...</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <div key={c._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30">
                  <CourseThumb course={c} className="h-36" />
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
                onClick={() => {
                  const params = new URLSearchParams(location.search);
                  params.set('page', String(page - 1));
                  navigate(`/courses?${params.toString()}`);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  const params = new URLSearchParams(location.search);
                  params.set('page', String(page + 1));
                  navigate(`/courses?${params.toString()}`);
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900"
              >
                Next
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
