import React from 'react';
import { Eye, GripVertical, Plus, Trash2 } from 'lucide-react';
import adminApi from '../../lib/adminApi';

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
                  <img src={form.thumbnailUrl} alt="Thumbnail preview" className="h-36 w-full object-cover" />
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
    if (!window.confirm('Delete this course?')) return;
    await adminApi.delete(`/courses/${id}`);
    await load();
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
    const base64 = await fileToBase64(file);
    setForm((prev) => ({ ...prev, thumbnailUrl: base64 }));
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
                            <img src={form.thumbnailUrl} alt="Thumbnail preview" className="h-full w-full object-cover" />
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

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400">Video URL</label>
                          <input
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-indigo-900/40"
                            placeholder="https://..."
                            value={ls.videoUrl}
                            onChange={(e) => updateLesson(ls.id, { videoUrl: e.target.value })}
                          />
                        </div>

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

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-2 py-3">Title</th>
                    <th className="px-2 py-3">Category</th>
                    <th className="px-2 py-3">Level</th>
                    <th className="px-2 py-3">Skill Path</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="px-2 py-3">Created</th>
                    <th className="px-2 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id} className="border-b border-slate-100 dark:border-slate-800/70">
                      <td className="px-2 py-3 font-semibold text-slate-900 dark:text-slate-100">{item.title}</td>
                      <td className="px-2 py-3 text-slate-600 dark:text-slate-300">{item.category || '-'}</td>
                      <td className="px-2 py-3 text-slate-600 dark:text-slate-300">{item.level || '-'}</td>
                      <td className="px-2 py-3 text-slate-600 dark:text-slate-300">{item.skillPath?.title || '-'}</td>
                      <td className="px-2 py-3">
                        <StatusBadge status={item.status || 'draft'} />
                      </td>
                      <td className="px-2 py-3 text-slate-600 dark:text-slate-300">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-2 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => edit(item)} className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600">Edit</button>
                          <button onClick={() => remove(item._id)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td className="px-2 py-6 text-slate-500" colSpan={7}>
                        No courses found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
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
