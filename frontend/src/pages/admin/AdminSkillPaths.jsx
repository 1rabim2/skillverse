import React from 'react';
import adminApi from '../../lib/adminApi';

const initialForm = { title: '', description: '', courses: [] };

export default function AdminSkillPaths() {
  const [paths, setPaths] = React.useState([]);
  const [courses, setCourses] = React.useState([]);
  const [form, setForm] = React.useState(initialForm);
  const [editingId, setEditingId] = React.useState('');

  async function load() {
    const [pathsRes, coursesRes] = await Promise.all([
      adminApi.get('/skill-paths'),
      adminApi.get('/courses', { params: { page: 1, limit: 200 } })
    ]);
    setPaths(pathsRes.data);
    setCourses(coursesRes.data.items);
  }

  React.useEffect(() => {
    load().catch(() => null);
  }, []);

  function toggleCourse(courseId) {
    setForm((prev) => ({
      ...prev,
      courses: prev.courses.includes(courseId) ? prev.courses.filter((id) => id !== courseId) : [...prev.courses, courseId]
    }));
  }

  function edit(path) {
    setEditingId(path._id);
    setForm({
      title: path.title || '',
      description: path.description || '',
      courses: (path.courses || []).map((c) => c._id)
    });
  }

  async function save(e) {
    e.preventDefault();
    if (editingId) await adminApi.put(`/skill-paths/${editingId}`, form);
    else await adminApi.post('/skill-paths', form);
    setEditingId('');
    setForm(initialForm);
    await load();
  }

  async function reorder(pathId, courseIds, from, to) {
    if (to < 0 || to >= courseIds.length) return;
    const next = [...courseIds];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    await adminApi.put(`/skill-paths/${pathId}/reorder`, { courses: next });
    await load();
  }

  async function removePath(id) {
    if (!window.confirm('Delete this skill path?')) return;
    await adminApi.delete(`/skill-paths/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">{editingId ? 'Edit Skill Path' : 'Create Skill Path'}</h3>
        <form onSubmit={save} className="space-y-3">
          <input className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" placeholder="Skill Path Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <textarea className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <div>
            <p className="mb-2 text-sm font-medium">Link Courses (multi-select)</p>
            <div className="max-h-44 space-y-2 overflow-y-auto rounded border border-slate-200 p-2 dark:border-slate-800">
              {courses.map((course) => (
                <label key={course._id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.courses.includes(course._id)} onChange={() => toggleCourse(course._id)} />
                  <span>{course.title}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded bg-slate-900 px-4 py-2 text-white dark:bg-slate-100 dark:text-slate-900">{editingId ? 'Update Path' : 'Create Path'}</button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(''); setForm(initialForm); }} className="rounded border border-slate-300 px-4 py-2 dark:border-slate-700">
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">Skill Paths</h3>
        <div className="space-y-4">
          {paths.map((path) => (
            <div key={path._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{path.title}</p>
                  <p className="text-sm text-slate-500">{path.description}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => edit(path)} className="rounded bg-amber-500 px-2 py-1 text-xs text-white">Edit</button>
                  <button onClick={() => removePath(path._id)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Delete</button>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {(path.courses || []).map((course, idx) => (
                  <div key={course._id} className="flex items-center justify-between rounded bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
                    <span>{idx + 1}. {course.title}</span>
                    <div className="flex gap-1">
                      <button onClick={() => reorder(path._id, path.courses.map((c) => c._id), idx, idx - 1)} className="rounded border border-slate-300 px-2 dark:border-slate-700">Up</button>
                      <button onClick={() => reorder(path._id, path.courses.map((c) => c._id), idx, idx + 1)} className="rounded border border-slate-300 px-2 dark:border-slate-700">Down</button>
                    </div>
                  </div>
                ))}
                {(path.courses || []).length === 0 && <p className="text-sm text-slate-500">No courses linked.</p>}
              </div>
            </div>
          ))}
          {paths.length === 0 && <p className="text-sm text-slate-500">No skill paths yet.</p>}
        </div>
      </section>
    </div>
  );
}
