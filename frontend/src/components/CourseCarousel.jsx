import React from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiFetch';
import Card from './ui/Card';
import Button from './ui/Button';
import CourseThumb from './CourseThumb';
import { resolveAssetUrl } from '../lib/assets';

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
  );
}

function MentorLine({ mentor }) {
  if (!mentor) return null;
  const name = String(mentor?.name || 'Mentor');
  const avatar = resolveAssetUrl(mentor?.avatarUrl || '');
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <div className="mt-3 flex items-center gap-2">
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800"
        />
      ) : (
        <div className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {initial || 'M'}
        </div>
      )}
      <div className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{name}</div>
    </div>
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

export default function CourseCarousel({ courses: providedCourses = null }) {
  const { t } = useTranslation();
  const [courses, setCourses] = React.useState(Array.isArray(providedCourses) ? providedCourses : []);
  const [loading, setLoading] = React.useState(providedCourses === null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (Array.isArray(providedCourses)) {
      setCourses(providedCourses);
      setLoading(false);
      setError('');
      return;
    }

    let mounted = true;

    async function loadCourses() {
      try {
        setLoading(true);
        setError('');
        const res = await apiFetch('/courses?page=1&limit=12');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load courses');
        if (mounted) setCourses(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCourses();
    return () => {
      mounted = false;
    };
  }, [providedCourses]);

  if (loading) {
    return <div className="text-sm text-slate-600 dark:text-slate-300">{t('course.loadingCourses')}</div>;
  }

  if (error) {
    return (
      <div className="text-sm text-red-700 dark:text-red-300">
        {t('course.couldNotLoadCourses', { error })}
      </div>
    );
  }

  if (courses.length === 0) {
    return <div className="text-sm text-slate-600 dark:text-slate-300">{t('course.noCoursesYet')}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => {
        const courseId = c._id || c.id;
        const progress = Number(c.progress || 0);
        return (
          <Card key={courseId} className="overflow-hidden p-0">
            <div className="border-b border-slate-200 dark:border-slate-800">
              <CourseThumb course={c} className="h-32" />
            </div>
            <div className="p-4">
              <div className="text-base font-extrabold tracking-tight">{c.title}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip>{displayLevel(c.level, t)}</Chip>
                <Chip>{displayCategory(c.category, t)}</Chip>
              </div>

              <MentorLine mentor={c.mentor || c.instructorId || null} />

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{t('course.progress')}</span>
                  <span className="font-semibold">{Math.min(100, Math.max(0, progress))}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (courseId) window.location.href = `/courses/${courseId}`;
                  }}
                >
                  {progress > 0 ? t('course.continue') : t('course.start')}
                </Button>
                {c.skillPath?.title ? <Chip>{c.skillPath.title}</Chip> : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
