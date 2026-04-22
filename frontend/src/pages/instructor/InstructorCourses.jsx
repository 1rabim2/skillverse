import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { apiFetch } from '../../lib/apiFetch';

function badge(course) {
  const approved = course?.isApproved || course?.createdBy;
  const label = approved ? 'Approved' : 'Pending';
  const cls = approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  return <span className={`rounded-full px-2 py-1 text-xs font-bold ${cls}`}>{label}</span>;
}

export default function InstructorCourses() {
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState('');
  const [deletingId, setDeletingId] = React.useState('');

  async function load() {
    setError('');
    try {
      const res = await apiFetch('/courses/mine');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load courses');
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeCourse(id) {
    if (!id) return;
    const ok = window.confirm('Delete this draft course? This cannot be undone.');
    if (!ok) return;
    try {
      setDeletingId(id);
      const res = await apiFetch(`/courses/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to delete course');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId('');
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">My Courses</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Draft courses require admin approval to publish.</p>
        </div>
        <Button as={Link} to="/instructor/courses/new">
          Create Course
        </Button>
      </div>

      {error && <Card className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20">{error}</Card>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((c) => (
          <Card key={c._id} className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{c.title}</h2>
                {badge(c)}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{c.description || 'No description'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{c.category || 'General'}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{c.level || 'Beginner'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button as={Link} to={`/instructor/courses/${c._id}`} variant="outline">
                Edit
              </Button>
              <Button as={Link} to={`/courses/${c._id}`} variant="ghost">
                Preview
              </Button>
              {String(c.status || 'draft') !== 'published' ? (
                <Button variant="danger" disabled={deletingId === c._id} onClick={() => removeCourse(c._id)}>
                  {deletingId === c._id ? 'Deleting…' : 'Delete'}
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600 dark:text-slate-300">No courses yet. Create your first course.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
