import React from 'react';
import { Eye, GripVertical, Plus, Trash2 } from 'lucide-react';
import adminApi from '../../lib/adminApi';
import { uploadAdminImage, uploadAdminVideo } from '../../lib/uploads';
import { resolveAssetUrl } from '../../lib/assets';

function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function safeString(value) {
  return String(value == null ? '' : value);
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeLessonsFromCourse(course) {
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  const orderedChapters = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
  const lessons = [];
  for (const chapter of orderedChapters) {
    const orderedLessons = [...(chapter.lessons || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const ls of orderedLessons) {
      lessons.push({
        id: uid('ls'),
        title: safeString(ls.title) || 'Lesson',
        type: safeString(ls.type) || 'reading',
        videoUrl: safeString(ls.videoUrl),
        resourceLink: safeString(ls.resourceLink),
        durationMin: toNumber(ls.durationMin, 0),
        content: safeString(ls.content),
        quiz: {
          passPercent: toNumber(ls?.quiz?.passPercent, 60),
          questions: Array.isArray(ls?.quiz?.questions)
            ? ls.quiz.questions.map((q) => ({
                id: uid('q'),
                prompt: safeString(q.prompt),
                options: Array.isArray(q.options) ? q.options.map(safeString) : [],
                correctIndex: toNumber(q.correctIndex, 0),
                explanation: safeString(q.explanation)
              }))
            : []
        }
      });
    }
  }
  return lessons;
}

function toCourseChapters(lessons) {
  const normalized = (Array.isArray(lessons) ? lessons : []).map((ls, idx) => ({
    title: safeString(ls.title).trim(),
    type: safeString(ls.type || 'reading'),
    videoUrl: safeString(ls.videoUrl).trim(),
    resourceLink: safeString(ls.resourceLink).trim(),
    durationMin: Math.max(0, toNumber(ls.durationMin, 0)),
    content: safeString(ls.content),
    order: idx + 1,
    ...(safeString(ls.type) === 'quiz'
      ? {
          quiz: {
            passPercent: Math.min(100, Math.max(0, toNumber(ls?.quiz?.passPercent, 60))),
            questions: (ls?.quiz?.questions || [])
              .map((q) => ({
                prompt: safeString(q.prompt).trim(),
                options: (Array.isArray(q.options) ? q.options : [])
                  .map(safeString)
                  .map((s) => s.trim())
                  .filter(Boolean),
                correctIndex: toNumber(q.correctIndex, 0),
                explanation: safeString(q.explanation).trim()
              }))
              .filter((q) => q.prompt && q.options.length >= 2)
              .map((q) => ({
                ...q,
                correctIndex: Math.min(Math.max(0, q.correctIndex), q.options.length - 1)
              }))
          }
        }
      : {})
  }));

  return [
    {
      title: 'Course Content',
      order: 1,
      lessons: normalized.filter((ls) => ls.title)
    }
  ];
}

const CATEGORY_OPTIONS = ['Web Fundamentals', 'Frontend', 'Backend', 'Database', 'Tools', 'General'];

const initialForm = {
  title: '',
  category: 'General',
  description: '',
  level: 'Beginner',
  skillPath: '',
  thumbnailUrl: '',
  status: 'draft'
};

function StatusToggle({ value, onChange }) {
  const isPublished = value === 'published';
  return (
    <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => onChange('draft')}
        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          !isPublished ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        Draft
      </button>
      <button
        type="button"
        onClick={() => onChange('published')}
        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          isPublished ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        Published
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = safeString(status || 'draft');
  const classes =
    s === 'published'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900'
      : 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${classes}`}>
      {s}
    </span>
  );
}

function PreviewModal({ open, onClose, form, lessons, skillPathTitle }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{form.title || 'Untitled course'}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
            Close
          </button>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">{form.description || 'No description yet.'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{form.category || 'General'}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{form.level || 'Beginner'}</span>
                {skillPathTitle ? <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{skillPathTitle}</span> : null}
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{form.status || 'draft'}</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-xs font-semibold text-slate-500">Thumbnail</p>
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                {form.thumbnailUrl ? (
                  <img src={resolveAssetUrl(form.thumbnailUrl)} alt="Thumbnail preview" className="h-36 w-full object-cover" />
                ) : (
                  <div className="flex h-36 items-center justify-center text-sm text-slate-500">No thumbnail</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Course Content</h4>
            <div className="mt-2 space-y-2">
              {lessons.length === 0 && <p className="text-sm text-slate-500">No lessons yet.</p>}
              {lessons.map((ls, idx) => (
                <div
                  key={ls.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {idx + 1}. {ls.title || 'Lesson'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(ls.type || 'reading')}
                      {ls.durationMin ? ` • ${ls.durationMin} min` : ''}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">{ls.videoUrl ? 'Video' : '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCourses() {
  const [items, setItems] = React.useState([]);
  const [skillPaths, setSkillPaths] = React.useState([]);

  const [search, setSearch] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('');
  const [filterLevel, setFilterLevel] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');

  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const [form, setForm] = React.useState(initialForm);
  const [editingId, setEditingId] = React.useState('');

  const [dragActive, setDragActive] = React.useState(false);
  const [lessons, setLessons] = React.useState([]);
  const [dragLessonId, setDragLessonId] = React.useState('');

  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [deleteModal, setDeleteModal] = React.useState({ open: false, id: '', title: '' });
  const [rowBusyId, setRowBusyId] = React.useState('');
  const [menuOpenId, setMenuOpenId] = React.useState('');

  React.useEffect(() => {
    function onDocClick(e) {
      if (!menuOpenId) return;
      const el = e.target;
      if (el && typeof el.closest === 'function' && el.closest('[data-course-menu]')) return;
      setMenuOpenId('');
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpenId]);

  async function load() {
    const res = await adminApi.get('/courses', {
      params: {
        page,
        search,
        category: filterCategory || undefined,
        level: filterLevel || undefined,
        status: filterStatus || undefined
      }
    });
    setItems(res.data.items || []);
    setTotalPages(res.data.totalPages || 1);
  }

  React.useEffect(() => {
    load().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  React.useEffect(() => {
    adminApi.get('/skill-paths').then((res) => setSkillPaths(res.data || [])).catch(() => null);
  }, []);

  function resetForm() {
    setForm(initialForm);
    setLessons([]);
    setEditingId('');
    setDragActive(false);
    setDragLessonId('');
  }

  function edit(item) {
    setEditingId(item._id);
    setForm({
      title: item.title || '',
      category: item.category || 'General',
      description: item.description || '',
      level: item.level || 'Beginner',
      skillPath: item.skillPath?._id || '',
      thumbnailUrl: item.thumbnailUrl || '',
      status: item.status || 'draft'
    });
    setLessons(normalizeLessonsFromCourse(item));
  }

  async function remove(id) {
    const item = items.find((x) => x && x._id === id);
    setDeleteModal({ open: true, id, title: item?.title || 'this course' });
  }

  async function confirmDelete() {
    const id = deleteModal.id;
    if (!id) return setDeleteModal({ open: false, id: '', title: '' });
    try {
      setRowBusyId(id);
      await adminApi.delete(`/courses/${id}`);
      setDeleteModal({ open: false, id: '', title: '' });
      setMenuOpenId('');
      await load();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to delete course';
      alert(msg);
    } finally {
      setRowBusyId('');
    }
  }

  async function togglePublish(item) {
    if (!item?._id) return;
    const nextStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      setRowBusyId(item._id);
      const res = await adminApi.put(`/courses/${item._id}`, { status: nextStatus });
      const updated = res.data;
      setItems((prev) => prev.map((x) => (x?._id === item._id ? { ...x, ...updated } : x)));
      setMenuOpenId('');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update course';
      alert(msg);
    } finally {
      setRowBusyId('');
    }
  }

  function addLesson() {
    setLessons((prev) => [
      ...prev,
      {
        id: uid('ls'),
        title: '',
        type: 'video',
        videoUrl: '',
        resourceLink: '',
        durationMin: 10,
        content: '',
        quiz: { passPercent: 60, questions: [] }
      }
    ]);
  }

  function updateLesson(lessonId, patch) {
    setLessons((prev) => prev.map((ls) => (ls.id === lessonId ? { ...ls, ...patch } : ls)));
  }

  function removeLesson(lessonId) {
    setLessons((prev) => prev.filter((ls) => ls.id !== lessonId));
  }

  function moveLesson(lessonId, dir) {
    setLessons((prev) => {
      const idx = prev.findIndex((x) => x.id === lessonId);
      if (idx < 0) return prev;
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function reorderByDrag(targetId) {
    if (!dragLessonId || dragLessonId === targetId) return;
    setLessons((prev) => {
      const fromIdx = prev.findIndex((x) => x.id === dragLessonId);
      const toIdx = prev.findIndex((x) => x.id === targetId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  }

  function addQuizQuestion(lessonId) {
    setLessons((prev) =>
      prev.map((ls) => {
        if (ls.id !== lessonId) return ls;
        const questions = [...(ls.quiz?.questions || [])];
        questions.push({ id: uid('q'), prompt: '', options: ['Option A', 'Option B'], correctIndex: 0, explanation: '' });
        return { ...ls, quiz: { ...(ls.quiz || { passPercent: 60 }), questions } };
      })
    );
  }

  function updateQuizQuestion(lessonId, questionId, patch) {
    setLessons((prev) =>
      prev.map((ls) => {
        if (ls.id !== lessonId) return ls;
        const questions = (ls.quiz?.questions || []).map((q) => (q.id === questionId ? { ...q, ...patch } : q));
        return { ...ls, quiz: { ...(ls.quiz || { passPercent: 60 }), questions } };
      })
    );
  }

  function removeQuizQuestion(lessonId, questionId) {
    setLessons((prev) =>
      prev.map((ls) => {
        if (ls.id !== lessonId) return ls;
        const questions = (ls.quiz?.questions || []).filter((q) => q.id !== questionId);
        return { ...ls, quiz: { ...(ls.quiz || { passPercent: 60 }), questions } };
      })
    );
  }

  async function onThumbnailPick(file) {
    if (!file) return;
    try {
      const uploaded = await uploadAdminImage(file);
      setForm((prev) => ({ ...prev, thumbnailUrl: String(uploaded.url || '') }));
    } catch (err) {
      alert(err?.message || 'Failed to upload image');
    }
  }

  async function onLessonVideoPick(lessonId, file) {
    if (!file) return;
    try {
      const uploaded = await uploadAdminVideo(file);
      updateLesson(lessonId, { videoUrl: String(uploaded.url || '') });
    } catch (err) {
      alert(err?.message || 'Failed to upload video');
    }
  }

  async function save(e) {
    e.preventDefault();

    const title = safeString(form.title).trim();
    if (!title) return alert('Title is required');
    if (lessons.length > 0 && lessons.some((ls) => safeString(ls.title).trim() === '')) {
      return alert('Every lesson needs a title (or remove the empty lesson).');
    }

    const payload = {
      title,
      category: safeString(form.category || 'General').trim() || 'General',
      description: safeString(form.description),
      level: form.level || 'Beginner',
      skillPath: form.skillPath || '',
      thumbnailUrl: form.thumbnailUrl || '',
      status: form.status === 'published' ? 'published' : 'draft',
      chapters: toCourseChapters(lessons)
    };

    try {
      if (editingId) await adminApi.put(`/courses/${editingId}`, payload);
      else await adminApi.post('/courses', payload);
      resetForm();
      await load();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save course';
      alert(msg);
    }
  }

  async function onSearch(e) {
    e.preventDefault();
    setPage(1);
    await load();
  }

  const skillPathTitle = skillPaths.find((sp) => sp._id === form.skillPath)?.title || '';

  return (
    <div className="space-y-6">
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} form={form} lessons={lessons} skillPathTitle={skillPathTitle} />
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Delete course</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                This will permanently delete <span className="font-semibold">{deleteModal.title}</span>.
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 p-5">
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700"
                onClick={() => setDeleteModal({ open: false, id: '', title: '' })}
                disabled={rowBusyId === deleteModal.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                onClick={confirmDelete}
                disabled={rowBusyId === deleteModal.id}
              >
                {rowBusyId === deleteModal.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Course Management</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingId ? 'Edit course' : 'Add course'}</h3>
              </div>
              {editingId && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
                  New course
                </button>
              )}
            </div>

            <form onSubmit={save} className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Course Info</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Title</label>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                      placeholder="e.g. HTML Fundamentals"
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Category</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Level</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                      value={form.level}
                      onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                    >
                      <option>Beginner</option>
                      <option>Intermediate</option>
                      <option>Advanced</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Description</label>
                    <textarea
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                      placeholder="Short, clear description for students."
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Skill Path (optional)</label>
                    <select
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                      value={form.skillPath}
                      onChange={(e) => setForm((p) => ({ ...p, skillPath: e.target.value }))}
                    >
                      <option value="">No Skill Path</option>
                      {skillPaths.map((sp) => (
                        <option key={sp._id} value={sp._id}>
                          {sp.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Status</label>
                    <StatusToggle value={form.status} onChange={(status) => setForm((p) => ({ ...p, status }))} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Thumbnail</label>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setDragActive(false);
                        const file = e.dataTransfer.files?.[0];
                        await onThumbnailPick(file);
                      }}
                      className={`flex items-center justify-between gap-3 rounded-2xl border-2 border-dashed p-4 transition ${
                        dragActive
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                          {form.thumbnailUrl ? (
                            <img src={resolveAssetUrl(form.thumbnailUrl)} alt="Thumbnail preview" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Preview</div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Drag & drop an image</p>
                          <p className="text-xs text-slate-500">PNG/JPG recommended (cover style)</p>
                        </div>
                      </div>

                      <label className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            await onThumbnailPick(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Course Content</p>
                    <p className="text-xs text-slate-500">Add lessons, then drag to reorder.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addLesson}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
                  >
                    <Plus size={16} /> Add Lesson
                  </button>
                </div>

                {lessons.length === 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
                    No lessons yet. Click <span className="font-semibold">Add Lesson</span>.
                  </div>
                )}

                <div className="space-y-3">
                  {lessons.map((ls, idx) => (
                    <div
                      key={ls.id}
                      draggable
                      onDragStart={() => setDragLessonId(ls.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        reorderByDrag(ls.id);
                      }}
                      onDragEnd={() => setDragLessonId('')}
                      className={`rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-slate-900 ${
                        dragLessonId === ls.id
                          ? 'border-indigo-400 shadow-indigo-500/10'
                          : 'border-slate-200 shadow-slate-200/40 dark:border-slate-800 dark:shadow-none'
                      }`}
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-950/30 dark:text-slate-300">
                            <GripVertical size={14} />
                            Lesson {idx + 1}
                          </div>
                          <select
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                            value={ls.type || 'video'}
                            onChange={(e) => updateLesson(ls.id, { type: e.target.value })}
                            title="Lesson type"
                          >
                            <option value="video">Video</option>
                            <option value="reading">Reading</option>
                            <option value="quiz">Quiz</option>
                            <option value="project">Project</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveLesson(ls.id, -1)}
                            disabled={idx === 0}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLesson(ls.id, 1)}
                            disabled={idx === lessons.length - 1}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLesson(ls.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                          >
                            <Trash2 size={16} /> Remove
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Lesson title</label>
                          <input
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                            placeholder="e.g. Flexbox layout basics"
                            value={ls.title}
                            onChange={(e) => updateLesson(ls.id, { title: e.target.value })}
                          />
                        </div>

                        {(ls.type || 'video') === 'video' && (
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Video URL</label>
                            <input
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                              placeholder="https://..."
                              value={ls.videoUrl}
                              onChange={(e) => updateLesson(ls.id, { videoUrl: e.target.value })}
                            />
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                Upload video
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    onLessonVideoPick(ls.id, file || null);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                              {ls.videoUrl ? (
                                <a
                                  href={resolveAssetUrl(ls.videoUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                                >
                                  Open
                                </a>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {['reading', 'project'].includes(ls.type || '') && (
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                              {ls.type === 'project' ? 'Project instructions' : 'Reading content'}
                            </label>
                            <textarea
                              rows={5}
                              className={[
                                'w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm',
                                'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200',
                                'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40'
                              ].join(' ')}
                              placeholder={ls.type === 'project' ? 'What should students build? What to submit?' : 'Write the lesson content here…'}
                              value={ls.content || ''}
                              onChange={(e) => updateLesson(ls.id, { content: e.target.value })}
                            />
                          </div>
                        )}

                        {(ls.type || 'video') !== 'quiz' && (
                          <>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Resource link (optional)</label>
                              <input
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                                placeholder="https://..."
                                value={ls.resourceLink}
                                onChange={(e) => updateLesson(ls.id, { resourceLink: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Duration (min)</label>
                              <input
                                type="number"
                                min="0"
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                                value={Number.isFinite(Number(ls.durationMin)) ? ls.durationMin : 0}
                                onChange={(e) => updateLesson(ls.id, { durationMin: toNumber(e.target.value, 0) })}
                              />
                            </div>
                          </>
                        )}

                        {(ls.type || '') === 'quiz' && (
                          <div className="md:col-span-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Quiz Builder</div>
                                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Add questions and mark the correct option.</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pass %</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
                                    value={Number.isFinite(Number(ls.quiz?.passPercent)) ? ls.quiz.passPercent : 60}
                                    onChange={(e) => updateLesson(ls.id, { quiz: { ...(ls.quiz || {}), passPercent: toNumber(e.target.value, 60) } })}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addQuizQuestion(ls.id)}
                                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
                                  >
                                    + Add question
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 space-y-4">
                                {(ls.quiz?.questions || []).map((q) => (
                                  <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Question</div>
                                      <button
                                        type="button"
                                        onClick={() => removeQuizQuestion(ls.id, q.id)}
                                        className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                                      >
                                        Remove
                                      </button>
                                    </div>

                                    <div className="mt-3 grid gap-2">
                                      <input
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        placeholder="Question prompt…"
                                        value={q.prompt || ''}
                                        onChange={(e) => updateQuizQuestion(ls.id, q.id, { prompt: e.target.value })}
                                      />
                                      <input
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                        placeholder="Explanation (optional)"
                                        value={q.explanation || ''}
                                        onChange={(e) => updateQuizQuestion(ls.id, q.id, { explanation: e.target.value })}
                                      />
                                    </div>

                                    <div className="mt-3 space-y-2">
                                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">Options</div>
                                      {(q.options || []).map((opt, optIdx) => (
                                        <div key={`${q.id}_${optIdx}`} className="flex items-center gap-2">
                                          <input
                                            type="radio"
                                            name={`correct_${ls.id}_${q.id}`}
                                            checked={Number(q.correctIndex) === optIdx}
                                            onChange={() => updateQuizQuestion(ls.id, q.id, { correctIndex: optIdx })}
                                          />
                                          <input
                                            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                            value={opt}
                                            onChange={(e) => {
                                              const next = [...(q.options || [])];
                                              next[optIdx] = e.target.value;
                                              updateQuizQuestion(ls.id, q.id, { options: next });
                                            }}
                                          />
                                          <button
                                            type="button"
                                            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
                                            onClick={() => {
                                              const next = (q.options || []).filter((_, i) => i !== optIdx);
                                              const nextCorrect = Math.min(Number(q.correctIndex) || 0, Math.max(0, next.length - 1));
                                              updateQuizQuestion(ls.id, q.id, { options: next, correctIndex: nextCorrect });
                                            }}
                                            disabled={(q.options || []).length <= 2}
                                            title={(q.options || []).length <= 2 ? 'Need at least 2 options' : 'Remove option'}
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ))}

                                      <div className="flex flex-wrap gap-2 pt-1">
                                        <button
                                          type="button"
                                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                          onClick={() => {
                                            const next = [...(q.options || []), `Option ${(q.options || []).length + 1}`];
                                            updateQuizQuestion(ls.id, q.id, { options: next });
                                          }}
                                        >
                                          + Add option
                                        </button>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 self-center">
                                          Select the radio button to mark the correct answer.
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {(ls.quiz?.questions || []).length === 0 ? (
                                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                    No questions yet. Click <span className="font-semibold">Add question</span> to start building this quiz.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Eye size={16} /> Preview Course
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
                >
                  {editingId ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="space-y-4 xl:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Courses</h3>
              <p className="text-xs text-slate-500">Search + filters</p>
            </div>

            <form onSubmit={onSearch} className="space-y-3">
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-1">
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                >
                  <option value="">All levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All status</option>
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900">
                  Search
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setSearch('');
                    setFilterCategory('');
                    setFilterLevel('');
                    setFilterStatus('');
                    setPage(1);
                    await load();
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Reset
                </button>
              </div>
            </form>
          </section>

          <section className="flex max-h-[72vh] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Posted Courses</h3>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{items.length} on this page</div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur dark:bg-slate-900/95">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="w-[86px] px-2 py-3">Thumb</th>
                    <th className="px-2 py-3">Title</th>
                    <th className="hidden w-[130px] px-2 py-3 lg:table-cell">Category</th>
                    <th className="hidden w-[110px] px-2 py-3 lg:table-cell">Level</th>
                    <th className="hidden w-[170px] px-2 py-3 xl:table-cell">Skill Path</th>
                    <th className="w-[110px] px-2 py-3">Status</th>
                    <th className="hidden w-[110px] px-2 py-3 sm:table-cell">Created</th>
                    <th className="w-[110px] px-2 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id} className="border-b border-slate-100 dark:border-slate-800/70">
                      <td className="px-2 py-3">
                        <div className="h-10 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30">
                          {item.thumbnailUrl ? (
                            <img src={resolveAssetUrl(item.thumbnailUrl)} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="truncate" title={item.title}>
                          {item.title}
                        </div>
                      </td>
                      <td className="hidden px-2 py-3 text-slate-600 dark:text-slate-300 lg:table-cell">
                        <div className="truncate" title={item.category || ''}>
                          {item.category || '-'}
                        </div>
                      </td>
                      <td className="hidden px-2 py-3 text-slate-600 dark:text-slate-300 lg:table-cell">
                        <div className="truncate" title={item.level || ''}>
                          {item.level || '-'}
                        </div>
                      </td>
                      <td className="hidden px-2 py-3 text-slate-600 dark:text-slate-300 xl:table-cell">
                        <div className="truncate" title={item.skillPath?.title || ''}>
                          {item.skillPath?.title || '-'}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <StatusBadge status={item.status || 'draft'} />
                      </td>
                      <td className="hidden px-2 py-3 text-slate-600 dark:text-slate-300 sm:table-cell">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-2 py-3">
                        <div className="relative flex items-center justify-end gap-2" data-course-menu>
                          <button
                            onClick={() => edit(item)}
                            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                            disabled={rowBusyId === item._id}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                            disabled={rowBusyId === item._id}
                            onClick={() => setMenuOpenId((v) => (v === item._id ? '' : item._id))}
                            title="More"
                          >
                            ...
                          </button>

                          {menuOpenId === item._id && (
                            <div className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                              <button
                                type="button"
                                className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                                onClick={() => {
                                  setMenuOpenId('');
                                  window.open(`/courses/${encodeURIComponent(item._id)}`, '_blank', 'noreferrer');
                                }}
                              >
                                View course
                              </button>
                              <button
                                type="button"
                                className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                                onClick={() => togglePublish(item)}
                              >
                                {rowBusyId === item._id ? 'Saving…' : item.status === 'published' ? 'Unpublish' : 'Publish'}
                              </button>
                              <button
                                type="button"
                                className="w-full px-4 py-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                                onClick={() => {
                                  setMenuOpenId('');
                                  remove(item._id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td className="px-2 py-6 text-slate-500" colSpan={8}>
                        No courses found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-2 border-t border-slate-200 bg-white/95 pt-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
              <p className="text-sm text-slate-500">
                Page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
