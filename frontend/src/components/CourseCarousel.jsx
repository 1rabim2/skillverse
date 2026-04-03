import React from 'react';
import { apiFetch } from '../lib/apiFetch';
import Card from './ui/Card';
import Button from './ui/Button';
import CourseThumb from './CourseThumb';

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      {children}
    </span>
  );
}

export default function CourseCarousel({ courses: providedCourses = null }) {
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
    return <div className="text-sm text-slate-600 dark:text-slate-300">Loading courses...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-700 dark:text-red-300">Could not load courses: {error}</div>;
  }

  if (courses.length === 0) {
    return <div className="text-sm text-slate-600 dark:text-slate-300">No courses available yet.</div>;
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
                <Chip>{c.level || 'Beginner'}</Chip>
                <Chip>{c.category || 'General'}</Chip>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Progress</span>
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
                  {progress > 0 ? 'Continue' : 'Start course'}
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
