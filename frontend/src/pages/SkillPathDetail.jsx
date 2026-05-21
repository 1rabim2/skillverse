import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
  );
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function displayLevel(level, t) {
  const key = normalizeKey(level);
  if (key === 'beginner') return t('meta.level.beginner');
  if (key === 'intermediate') return t('meta.level.intermediate');
  if (key === 'advanced') return t('meta.level.advanced');
  return String(level || '').trim() || t('meta.level.beginner');
}

function displayCategory(category, t) {
  const key = normalizeKey(category);
  if (key === 'web_fundamentals') return t('meta.category.web_fundamentals');
  if (key === 'frontend') return t('meta.category.frontend');
  if (key === 'backend') return t('meta.category.backend');
  if (key === 'database') return t('meta.category.database');
  if (key === 'tools') return t('meta.category.tools');
  if (key === 'general') return t('meta.category.general');
  return String(category || '').trim() || t('meta.category.general');
}

function progressFor(user, courseId) {
  const id = String(courseId || '');
  const list = Array.isArray(user?.progress) ? user.progress : [];
  const entry = list.find((p) => String(p?.course) === id || String(p?.course?._id) === id);
  return entry || null;
}

function isCompleted(entry) {
  const percent = Number(entry?.percent || 0);
  return !!entry?.completedAt || percent >= 100;
}

function enrolledIds(user) {
  const list = Array.isArray(user?.enrolledCourses) ? user.enrolledCourses : [];
  return new Set(list.map((c) => String(c?._id || c)).filter(Boolean));
}

async function enrollIfNeeded({ courseId, enrolled }) {
  if (!courseId) return;
  if (enrolled.has(String(courseId))) return;
  const res = await apiFetch('/user/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to enroll');
}

export default function SkillPathDetail() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [path, setPath] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [authed, setAuthed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const [pathRes, meRes] = await Promise.all([
          apiFetch(`/skill-paths/${encodeURIComponent(id)}`),
          apiFetch('/user/me')
        ]);

        const pathData = await pathRes.json().catch(() => ({}));
        if (!pathRes.ok) throw new Error(pathData?.error || t('skillPathDetail.couldNotLoad'));

        const meData = await meRes.json().catch(() => null);

        if (!mounted) return;
        setPath(pathData);
        if (meRes.ok && meData?.user) {
          setAuthed(true);
          setUser(meData.user);
        } else {
          setAuthed(false);
          setUser(null);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e.message);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const courses = Array.isArray(path?.courses) ? path.courses : [];
  const enrolled = enrolledIds(user);
  const anyEnrolled = courses.some((c) => enrolled.has(String(c?._id || c?.id)));
  const nextCourse = courses.find((c) => !isCompleted(progressFor(user, c?._id || c?.id))) || courses[0] || null;
  const nextIndex = nextCourse ? courses.findIndex((c) => String(c?._id || c?.id) === String(nextCourse?._id || nextCourse?.id)) : -1;

  async function startOrContinue() {
    setActionError('');
    if (!nextCourse?._id) return;
    if (!authed) {
      window.location.href = '/login';
      return;
    }
    try {
      setBusy(true);
      await enrollIfNeeded({ courseId: nextCourse._id, enrolled });
      window.location.href = `/courses/${encodeURIComponent(nextCourse._id)}`;
    } catch (e) {
      setActionError(e?.message || 'Failed to start path');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-5">
        <div className="text-sm text-slate-600 dark:text-slate-300">{t('skillPathDetail.loading')}</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
        <div className="text-sm font-semibold text-red-800 dark:text-red-200">{t('skillPathDetail.couldNotLoad')}</div>
        <div className="mt-2 text-sm text-red-700 dark:text-red-200">{error}</div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => (window.location.href = '/skill-paths')}>
            {t('skillPathDetail.backToPaths')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{path?.title || 'Skill Path'}</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{path?.description || t('skillPathDetail.followOrder')}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>{t('skillPathDetail.coursesCount', { count: courses.length })}</Chip>
            {nextIndex >= 0 ? <Chip>{t('skillPathDetail.nextStep', { step: nextIndex + 1 })}</Chip> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => (window.location.href = '/skill-paths')}>
            {t('common.back')}
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = `/courses?skillPath=${encodeURIComponent(id)}`)}>
            {t('skillPathDetail.viewInCourses')}
          </Button>
          <Button variant="primary" disabled={busy || courses.length === 0} onClick={startOrContinue}>
            {authed ? (anyEnrolled ? t('skillPaths.continuePath') : t('skillPaths.startPath')) : t('skillPaths.signInToStart')}
          </Button>
        </div>
      </div>

      {actionError ? (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="text-sm text-red-700 dark:text-red-200">{actionError}</div>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">{t('skillPathDetail.courseOrder')}</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('skillPathDetail.unlockNext')}</div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {courses.map((c, idx) => {
            const cid = c?._id || c?.id;
            const entry = progressFor(user, cid);
            const done = isCompleted(entry);
            const pct = Math.max(0, Math.min(100, Number(entry?.percent || 0)));
            const isNext = nextCourse && String(cid) === String(nextCourse?._id || nextCourse?.id);
            return (
              <div
                key={cid || `${idx}`}
                className={[
                  'rounded-2xl border p-4',
                  isNext ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-900/40 dark:bg-indigo-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/20'
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('skillPaths.step', { step: idx + 1 })}</div>
                    <div className="mt-1 truncate text-sm font-extrabold text-slate-900 dark:text-white">{c?.title || t('searchBox.untitledCourse')}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Chip>{displayLevel(c?.level, t)}</Chip>
                      <Chip>{displayCategory(c?.category, t)}</Chip>
                      {done ? <Chip>{t('skillPathDetail.completed')}</Chip> : pct > 0 ? <Chip>{pct}%</Chip> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      variant={done ? 'outline' : 'primary'}
                      onClick={async () => {
                        if (!cid) return;
                        if (!authed) {
                          window.location.href = '/login';
                          return;
                        }
                        try {
                          setBusy(true);
                          await enrollIfNeeded({ courseId: cid, enrolled });
                          window.location.href = `/courses/${encodeURIComponent(cid)}`;
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {done ? t('skillPathDetail.review') : isNext ? t('common.continue') : t('common.open')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300 md:col-span-2">
              {t('skillPaths.noCoursesInPath')}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
