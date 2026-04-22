import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { apiFetch } from '../../lib/apiFetch';
import { resolveAssetUrl } from '../../lib/assets';

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

export default function InstructorLibrary() {
  const navigate = useNavigate();
  const [items, setItems] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [busyId, setBusyId] = React.useState('');

  async function load(nextPage = page, nextSearch = search) {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch(
        `/instructor/library-courses${qs({
          page: nextPage,
          limit: 12,
          search: nextSearch || ''
        })}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load library courses');
      setItems(data?.items || []);
      setPage(data?.page || nextPage);
      setTotalPages(data?.totalPages || 1);
    } catch (e) {
      setError(e.message || 'Failed to load library courses');
      setItems([]);
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
    await load(1, search);
  }

  async function cloneCourse(courseId) {
    if (!courseId) return;
    setBusyId(courseId);
    try {
      const res = await apiFetch(`/instructor/library-courses/${courseId}/clone`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to clone course');
      navigate(`/instructor/courses/${data?.course?._id}`);
    } catch (e) {
      alert(e.message || 'Failed to clone course');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Course Library</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Clone a published course into your draft, then edit and request approval.</p>
        </div>
      </div>

      <Card className="space-y-3">
        <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title, category, description..." />
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                load(1, '').catch(() => null);
              }}
              disabled={loading}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {error ? <Card className="border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">{error}</Card> : null}

      {loading ? <Card className="text-sm text-slate-600 dark:text-slate-300">Loading library courses…</Card> : null}

      {!loading && !error ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((c) => (
            <Card key={c._id} className="flex gap-4">
              <div className="h-20 w-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30">
                {c.thumbnailUrl ? <img src={resolveAssetUrl(c.thumbnailUrl)} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-extrabold text-slate-900 dark:text-slate-100" title={c.title}>
                      {c.title}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{c.description || 'No description'}</div>
                  </div>
                  <Button onClick={() => cloneCourse(c._id)} disabled={busyId === c._id}>
                    {busyId === c._id ? 'Cloning…' : 'Clone'}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{c.category || 'General'}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{c.level || 'Beginner'}</span>
                  {c.skillPath?.title ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{c.skillPath.title}</span> : null}
                </div>
              </div>
            </Card>
          ))}
          {items.length === 0 ? (
            <Card>
              <div className="text-sm text-slate-600 dark:text-slate-300">No library courses found.</div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => load(Math.max(1, page - 1), search)} disabled={loading || page <= 1}>
              Prev
            </Button>
            <Button variant="outline" onClick={() => load(Math.min(totalPages, page + 1), search)} disabled={loading || page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

