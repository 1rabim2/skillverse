import React from 'react';
import Card from '../../components/ui/Card';
import { apiFetch } from '../../lib/apiFetch';

export default function InstructorDashboard() {
  const [stats, setStats] = React.useState({ total: 0, published: 0, draft: 0 });
  const [libraryTotal, setLibraryTotal] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    apiFetch('/courses/mine')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        const items = data?.items || [];
        const published = items.filter((c) => c.status === 'published').length;
        const draft = items.filter((c) => c.status === 'draft').length;
        setStats({ total: items.length, published, draft });
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    apiFetch('/instructor/library-courses?limit=1&page=1')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok) return;
        setLibraryTotal(Number(data?.total || 0));
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card>
        <div className="text-sm font-semibold text-slate-500">My Courses</div>
        <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.total}</div>
      </Card>
      <Card>
        <div className="text-sm font-semibold text-slate-500">Published</div>
        <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.published}</div>
      </Card>
      <Card>
        <div className="text-sm font-semibold text-slate-500">Draft</div>
        <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.draft}</div>
      </Card>
      <Card className="lg:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-500">Course Library</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {libraryTotal ? `${libraryTotal} published courses available to clone.` : 'Browse published courses to clone into your drafts.'}
            </div>
          </div>
          <a href="/instructor/library" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Open Library
          </a>
        </div>
      </Card>
    </div>
  );
}
