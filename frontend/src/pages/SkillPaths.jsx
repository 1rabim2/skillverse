import React from 'react';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
  );
}

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

export default function SkillPaths() {
  const [items, setItems] = React.useState([]);
  const [user, setUser] = React.useState(null);
  const [authed, setAuthed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [openId, setOpenId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [busyId, setBusyId] = React.useState('');
  const [actionError, setActionError] = React.useState('');

  function progressFor(courseId) {
    const id = String(courseId || '');
    const list = Array.isArray(user?.progress) ? user.progress : [];
    return list.find((p) => String(p?.course) === id || String(p?.course?._id) === id) || null;
  }

  function isCompleted(entry) {
    const percent = Number(entry?.percent || 0);
    return !!entry?.completedAt || percent >= 100;
  }

  function enrolledSet() {
    const list = Array.isArray(user?.enrolledCourses) ? user.enrolledCourses : [];
    return new Set(list.map((c) => String(c?._id || c)).filter(Boolean));
  }

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [pathsRes, meRes] = await Promise.all([apiFetch('/skill-paths'), apiFetch('/user/me')]);

      const pathsData = await pathsRes.json().catch(() => ({}));
      if (!pathsRes.ok) throw new Error(pathsData?.error || 'Failed to load skill paths');
      setItems(Array.isArray(pathsData) ? pathsData : []);

      const meData = await meRes.json().catch(() => null);
      if (meRes.ok && meData?.user) {
        setAuthed(true);
        setUser(meData.user);
      } else {
        setAuthed(false);
        setUser(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load().catch(() => null);
  }, []);

  const q = normalize(search);
  const filtered = (items || []).filter((p) => {
    if (!q) return true;
    const t = normalize(p?.title);
    const d = normalize(p?.description);
    const courseHit = Array.isArray(p?.courses)
      ? p.courses.some((c) => normalize(c?.title).includes(q) || normalize(c?.category).includes(q) || normalize(c?.level).includes(q))
      : false;
    return t.includes(q) || d.includes(q) || courseHit;
  });

  async function startOrContinuePath(path) {
    setActionError('');
    const pathId = path?._id;
    const courses = Array.isArray(path?.courses) ? path.courses : [];
    if (!pathId) return;
    if (!authed) {
      window.location.href = '/login';
      return;
    }
    const enrolled = enrolledSet();
    const next = courses.find((c) => !isCompleted(progressFor(c?._id || c?.id))) || courses[0] || null;
    const courseId = next?._id || next?.id || '';
    if (!courseId) return;
    try {
      setBusyId(pathId);
      if (!enrolled.has(String(courseId))) {
        const res = await apiFetch('/user/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to enroll');
      }
      window.location.href = `/courses/${encodeURIComponent(courseId)}`;
    } catch (e) {
      setActionError(e?.message || 'Failed to start path');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Skill Paths</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Choose a path and follow the recommended order.
          </div>
        </div>
        <div className="w-full max-w-md">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search paths or courses..." />
        </div>
      </div>

      {loading ? (
        <Card className="p-5">
          <div className="text-sm text-slate-600 dark:text-slate-300">Loading skill paths...</div>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="text-sm font-semibold text-red-800 dark:text-red-200">Could not load skill paths</div>
          <div className="mt-2 text-sm text-red-700 dark:text-red-200">{error}</div>
          <div className="mt-4">
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {actionError ? (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="text-sm text-red-700 dark:text-red-200">{actionError}</div>
        </Card>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-4">
          {filtered.map((p) => {
            const id = p?._id;
            const isOpen = id && openId === id;
            const courses = Array.isArray(p?.courses) ? p.courses : [];
            const enrolled = enrolledSet();
            const anyEnrolled = courses.some((c) => enrolled.has(String(c?._id || c?.id)));
            const next = courses.find((c) => !isCompleted(progressFor(c?._id || c?.id))) || courses[0] || null;
            const nextIdx = next ? courses.findIndex((c) => String(c?._id || c?.id) === String(next?._id || next?.id)) : -1;
            return (
              <Card key={id} className="p-0">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 p-5 text-left"
                  onClick={() => setOpenId((prev) => (prev === id ? '' : id))}
                >
                  <div className="min-w-0">
                    <div className="truncate text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {p?.title || 'Untitled path'}
                    </div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {p?.description || 'No description yet.'}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Chip>{courses.length} courses</Chip>
                      {nextIdx >= 0 ? <Chip>Next: Step {nextIdx + 1}</Chip> : null}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {isOpen ? 'Hide' : 'View'}
                    </span>
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t border-slate-200 p-5 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">Course order</div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => (window.location.href = `/skill-paths/${encodeURIComponent(id)}`)}>
                          Open path
                        </Button>
                        <Button variant="outline" onClick={() => (window.location.href = `/courses?skillPath=${encodeURIComponent(id)}`)}>
                          View in Courses
                        </Button>
                        <Button
                          variant="primary"
                          disabled={busyId === id || courses.length === 0}
                          onClick={() => startOrContinuePath(p)}
                        >
                          {authed ? (anyEnrolled ? 'Continue path' : 'Start path') : 'Sign in to start'}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {courses.map((c, idx) => (
                        <div
                          key={c?._id || `${id}-${idx}`}
                          className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Step {idx + 1}
                              </div>
                              <div className="mt-1 truncate text-sm font-extrabold text-slate-900 dark:text-white">
                                {c?.title || 'Untitled course'}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Chip>{c?.level || 'Beginner'}</Chip>
                                <Chip>{c?.category || 'General'}</Chip>
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              onClick={() => {
                                const courseId = c?._id || c?.id;
                                if (courseId) window.location.href = `/courses/${encodeURIComponent(courseId)}`;
                              }}
                            >
                              Open
                            </Button>
                          </div>
                        </div>
                      ))}
                      {courses.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300 md:col-span-2">
                          No published courses linked to this path yet.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}

          {filtered.length === 0 ? (
            <Card className="p-5">
              <div className="text-sm text-slate-600 dark:text-slate-300">No skill paths found.</div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
