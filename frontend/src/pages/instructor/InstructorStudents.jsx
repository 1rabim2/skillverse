import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { apiFetch } from '../../lib/apiFetch';

export default function InstructorStudents() {
  const [courses, setCourses] = React.useState([]);
  const [courseId, setCourseId] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [out, setOut] = React.useState('');
  const [isError, setIsError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

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

  async function load() {
    if (!courseId) return;
    setLoading(true);
    setOut('');
    setIsError(false);
    try {
      const res = await apiFetch(`/courses/${courseId}/students`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load students');
      setItems(data.items || []);
    } catch (e) {
      setIsError(true);
      setOut(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Student Progress</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">View enrollments and completion status per course.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={load} disabled={!courseId || loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {out && (
        <Card className={isError ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300' : ''}>
          {out}
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Progress</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.email}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{Math.round(Number(s.percent || 0))}%</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No enrollments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

