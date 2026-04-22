import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { apiFetch } from '../../lib/apiFetch';
import { uploadUserImage } from '../../lib/uploads';

function emptyLesson(type = 'reading') {
  return {
    title: '',
    type,
    content: '',
    videoUrl: '',
    resourceLink: '',
    durationMin: 0,
    order: 0,
    quiz: { passPercent: 60, questions: [] }
  };
}

function emptyQuestion() {
  return { prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' };
}

export default function InstructorEditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = React.useState(null);
  const [skillPaths, setSkillPaths] = React.useState([]);
  const [out, setOut] = React.useState('');
  const [isError, setIsError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [requesting, setRequesting] = React.useState(false);
  const [thumbUploading, setThumbUploading] = React.useState(false);

  async function load() {
    setOut('');
    setIsError(false);
    const res = await apiFetch(`/courses/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to load course');
    setCourse(data.course);
  }

  React.useEffect(() => {
    load().catch((e) => {
      setIsError(true);
      setOut(e.message);
    });
  }, [id]);

  React.useEffect(() => {
    let mounted = true;
    apiFetch('/skill-paths')
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        setSkillPaths(Array.isArray(data) ? data : []);
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, []);

  function updateCourse(patch) {
    setCourse((c) => ({ ...(c || {}), ...(patch || {}) }));
  }

  function updateChapter(chapterIndex, patch) {
    setCourse((c) => {
      const chapters = Array.isArray(c?.chapters) ? [...c.chapters] : [];
      chapters[chapterIndex] = { ...(chapters[chapterIndex] || {}), ...(patch || {}) };
      return { ...c, chapters };
    });
  }

  function addChapter() {
    setCourse((c) => {
      const chapters = Array.isArray(c?.chapters) ? [...c.chapters] : [];
      chapters.push({ title: `Chapter ${chapters.length + 1}`, order: chapters.length, lessons: [] });
      return { ...c, chapters };
    });
  }

  function removeChapter(chapterIndex) {
    setCourse((c) => {
      const chapters = Array.isArray(c?.chapters) ? [...c.chapters] : [];
      chapters.splice(chapterIndex, 1);
      return { ...c, chapters };
    });
  }

  function addLesson(chapterIndex, type) {
    setCourse((c) => {
      const chapters = Array.isArray(c?.chapters) ? [...c.chapters] : [];
      const ch = { ...(chapters[chapterIndex] || {}) };
      const lessons = Array.isArray(ch.lessons) ? [...ch.lessons] : [];
      lessons.push(emptyLesson(type));
      ch.lessons = lessons;
      chapters[chapterIndex] = ch;
      return { ...c, chapters };
    });
  }

  function removeLesson(chapterIndex, lessonIndex) {
    setCourse((c) => {
      const chapters = Array.isArray(c?.chapters) ? [...c.chapters] : [];
      const ch = { ...(chapters[chapterIndex] || {}) };
      const lessons = Array.isArray(ch.lessons) ? [...ch.lessons] : [];
      lessons.splice(lessonIndex, 1);
      ch.lessons = lessons;
      chapters[chapterIndex] = ch;
      return { ...c, chapters };
    });
  }

  function updateLesson(chapterIndex, lessonIndex, patch) {
    setCourse((c) => {
      const chapters = Array.isArray(c?.chapters) ? [...c.chapters] : [];
      const ch = { ...(chapters[chapterIndex] || {}) };
      const lessons = Array.isArray(ch.lessons) ? [...ch.lessons] : [];
      lessons[lessonIndex] = { ...(lessons[lessonIndex] || {}), ...(patch || {}) };
      ch.lessons = lessons;
      chapters[chapterIndex] = ch;
      return { ...c, chapters };
    });
  }

  function addQuestion(chapterIndex, lessonIndex) {
    setCourse((c) => {
      const chapters = Array.isArray(c?.chapters) ? [...c.chapters] : [];
      const ch = { ...(chapters[chapterIndex] || {}) };
      const lessons = Array.isArray(ch.lessons) ? [...ch.lessons] : [];
      const lesson = { ...(lessons[lessonIndex] || {}) };
      const quiz = { ...(lesson.quiz || {}) };
      const questions = Array.isArray(quiz.questions) ? [...quiz.questions] : [];
      questions.push(emptyQuestion());
      quiz.questions = questions;
      lesson.quiz = quiz;
      lessons[lessonIndex] = lesson;
      ch.lessons = lessons;
      chapters[chapterIndex] = ch;
      return { ...c, chapters };
    });
  }

  function updateQuestion(chapterIndex, lessonIndex, qIndex, patch) {
    setCourse((c) => {
      const chapters = Array.isArray(c?.chapters) ? [...c.chapters] : [];
      const ch = { ...(chapters[chapterIndex] || {}) };
      const lessons = Array.isArray(ch.lessons) ? [...ch.lessons] : [];
      const lesson = { ...(lessons[lessonIndex] || {}) };
      const quiz = { ...(lesson.quiz || {}) };
      const questions = Array.isArray(quiz.questions) ? [...quiz.questions] : [];
      questions[qIndex] = { ...(questions[qIndex] || {}), ...(patch || {}) };
      quiz.questions = questions;
      lesson.quiz = quiz;
      lessons[lessonIndex] = lesson;
      ch.lessons = lessons;
      chapters[chapterIndex] = ch;
      return { ...c, chapters };
    });
  }

  function removeQuestion(chapterIndex, lessonIndex, qIndex) {
    setCourse((c) => {
      const chapters = Array.isArray(c?.chapters) ? [...c.chapters] : [];
      const ch = { ...(chapters[chapterIndex] || {}) };
      const lessons = Array.isArray(ch.lessons) ? [...ch.lessons] : [];
      const lesson = { ...(lessons[lessonIndex] || {}) };
      const quiz = { ...(lesson.quiz || {}) };
      const questions = Array.isArray(quiz.questions) ? [...quiz.questions] : [];
      questions.splice(qIndex, 1);
      quiz.questions = questions;
      lesson.quiz = quiz;
      lessons[lessonIndex] = lesson;
      ch.lessons = lessons;
      chapters[chapterIndex] = ch;
      return { ...c, chapters };
    });
  }

  async function save() {
    setSaving(true);
    setOut('');
    setIsError(false);
    try {
      const skillPathId =
        typeof course.skillPath === 'string'
          ? course.skillPath
          : course.skillPath && typeof course.skillPath === 'object'
            ? course.skillPath._id
            : '';
      const payload = {
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        thumbnailUrl: course.thumbnailUrl,
        videoUrl: course.videoUrl,
        resourceLink: course.resourceLink,
        skillPath: skillPathId || null,
        chapters: course.chapters || []
      };
      const res = await apiFetch(`/courses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save course');
      setCourse(data.course);
      setOut('Saved. This course remains a draft until approved by an admin.');
    } catch (e) {
      setIsError(true);
      setOut(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function requestApproval() {
    if (!course?._id) return;
    setRequesting(true);
    setOut('');
    setIsError(false);
    try {
      const res = await apiFetch(`/courses/${id}/request-approval`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to request approval');
      setCourse((c) => ({ ...(c || {}), approvalRequestedAt: data?.course?.approvalRequestedAt || new Date().toISOString() }));
      setOut('Approval requested. An admin will review and publish your course.');
    } catch (e) {
      setIsError(true);
      setOut(e.message);
    } finally {
      setRequesting(false);
    }
  }

  async function onPickThumbnail(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setThumbUploading(true);
    setOut('');
    setIsError(false);
    try {
      const up = await uploadUserImage(file);
      updateCourse({ thumbnailUrl: up?.url || '' });
      setOut('Thumbnail uploaded.');
    } catch (err) {
      setIsError(true);
      setOut(err.message || 'Upload failed');
    } finally {
      setThumbUploading(false);
      if (e?.target) e.target.value = '';
    }
  }

  if (!course) {
    return (
      <Card>
        <div className="text-sm text-slate-600 dark:text-slate-300">{out || 'Loading…'}</div>
      </Card>
    );
  }

  const chapters = Array.isArray(course.chapters) ? course.chapters : [];
  const approved = !!(course?.isApproved || course?.createdBy);
  const requestedAt = course?.approvalRequestedAt ? new Date(course.approvalRequestedAt).toLocaleString() : '';
  const skillPathId =
    typeof course.skillPath === 'string'
      ? course.skillPath
      : course.skillPath && typeof course.skillPath === 'object'
        ? course.skillPath._id
        : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Course</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {approved ? 'Approved and published by an admin.' : requestedAt ? `Approval requested: ${requestedAt}` : 'Draft: build lessons, then request approval.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/instructor/courses')}>
            Back
          </Button>
          <Button variant="outline" onClick={requestApproval} disabled={approved || requesting}>
            {requesting ? 'Requesting…' : 'Request Approval'}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {out && (
        <Card className={isError ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'}>
          {out}
        </Card>
      )}

      <Card className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Title</label>
            <Input value={course.title || ''} onChange={(e) => updateCourse({ title: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Category</label>
            <Input value={course.category || ''} onChange={(e) => updateCourse({ category: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Level</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
              value={course.level || 'Beginner'}
              onChange={(e) => updateCourse({ level: e.target.value })}
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Thumbnail</label>
            <div className="flex gap-2">
              <Input
                value={course.thumbnailUrl || ''}
                onChange={(e) => updateCourse({ thumbnailUrl: e.target.value })}
                placeholder="Paste image URL or upload"
              />
              <label
                className={`inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${
                  thumbUploading ? 'opacity-60' : ''
                }`}
              >
                {thumbUploading ? 'Uploading…' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={onPickThumbnail} disabled={thumbUploading} />
              </label>
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Skill Path (optional)</label>
          <select
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
            value={skillPathId || ''}
            onChange={(e) => updateCourse({ skillPath: e.target.value || null })}
          >
            <option value="">No Skill Path</option>
            {skillPaths.map((sp) => (
              <option key={sp._id} value={sp._id}>
                {sp.title}
              </option>
            ))}
          </select>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Skill paths are managed by admins. You can attach your course to an existing one.</div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Description</label>
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
            value={course.description || ''}
            onChange={(e) => updateCourse({ description: e.target.value })}
          />
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chapters & Lessons</h2>
        <Button variant="outline" onClick={addChapter}>
          Add Chapter
        </Button>
      </div>

      <div className="space-y-4">
        {chapters.map((ch, chIndex) => (
          <Card key={ch._id || chIndex} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Chapter Title</label>
                <Input value={ch.title || ''} onChange={(e) => updateChapter(chIndex, { title: e.target.value })} />
              </div>
              <Button variant="danger" onClick={() => removeChapter(chIndex)}>
                Remove
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => addLesson(chIndex, 'reading')}>
                Add Reading
              </Button>
              <Button variant="outline" onClick={() => addLesson(chIndex, 'video')}>
                Add Video
              </Button>
              <Button variant="outline" onClick={() => addLesson(chIndex, 'quiz')}>
                Add Quiz
              </Button>
            </div>

            <div className="space-y-4">
              {(ch.lessons || []).map((ls, lsIndex) => (
                <Card key={ls._id || lsIndex} className="border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Lesson Title</label>
                      <Input
                        value={ls.title || ''}
                        onChange={(e) => updateLesson(chIndex, lsIndex, { title: e.target.value })}
                        placeholder="Lesson title"
                      />
                    </div>
                    <div className="min-w-[160px]">
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Type</label>
                      <select
                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                        value={ls.type || 'reading'}
                        onChange={(e) => updateLesson(chIndex, lsIndex, { type: e.target.value })}
                      >
                        <option value="reading">reading</option>
                        <option value="video">video</option>
                        <option value="quiz">quiz</option>
                        <option value="project">project</option>
                      </select>
                    </div>
                    <Button variant="danger" onClick={() => removeLesson(chIndex, lsIndex)}>
                      Remove
                    </Button>
                  </div>

                  {(ls.type === 'reading' || ls.type === 'project') && (
                    <div className="mt-3">
                      <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Notes / Content</label>
                      <textarea
                        className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                        value={ls.content || ''}
                        onChange={(e) => updateLesson(chIndex, lsIndex, { content: e.target.value })}
                        placeholder="Lesson notes, steps, links…"
                      />
                    </div>
                  )}

                  {ls.type === 'video' && (
                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Video URL</label>
                        <Input
                          value={ls.videoUrl || ''}
                          onChange={(e) => updateLesson(chIndex, lsIndex, { videoUrl: e.target.value })}
                          placeholder="https://…"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Resources</label>
                        <Input
                          value={ls.resourceLink || ''}
                          onChange={(e) => updateLesson(chIndex, lsIndex, { resourceLink: e.target.value })}
                          placeholder="https://…"
                        />
                      </div>
                    </div>
                  )}

                  {ls.type === 'quiz' && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                        <div className="lg:col-span-1">
                          <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Pass %</label>
                          <Input
                            type="number"
                            value={ls.quiz?.passPercent ?? 60}
                            onChange={(e) =>
                              updateLesson(chIndex, lsIndex, {
                                quiz: { ...(ls.quiz || {}), passPercent: Number(e.target.value || 0) }
                              })
                            }
                          />
                        </div>
                        <div className="lg:col-span-2 flex items-end justify-end">
                          <Button variant="outline" onClick={() => addQuestion(chIndex, lsIndex)}>
                            Add Question
                          </Button>
                        </div>
                      </div>

                      {(ls.quiz?.questions || []).map((q, qIndex) => (
                        <Card key={q._id || qIndex} className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Question {qIndex + 1}</div>
                            <Button variant="danger" onClick={() => removeQuestion(chIndex, lsIndex, qIndex)}>
                              Remove
                            </Button>
                          </div>
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Prompt</label>
                              <Input
                                value={q.prompt || ''}
                                onChange={(e) => updateQuestion(chIndex, lsIndex, qIndex, { prompt: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                              {(q.options || ['', '', '', '']).slice(0, 4).map((opt, i) => (
                                <div key={i}>
                                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Option {i + 1}</label>
                                  <Input
                                    value={opt || ''}
                                    onChange={(e) => {
                                      const options = Array.isArray(q.options) ? [...q.options] : ['', '', '', ''];
                                      while (options.length < 4) options.push('');
                                      options[i] = e.target.value;
                                      updateQuestion(chIndex, lsIndex, qIndex, { options });
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Correct Answer</label>
                                <select
                                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                                  value={Number.isFinite(Number(q.correctIndex)) ? Number(q.correctIndex) : 0}
                                  onChange={(e) => updateQuestion(chIndex, lsIndex, qIndex, { correctIndex: Number(e.target.value) })}
                                >
                                  <option value={0}>Option 1</option>
                                  <option value={1}>Option 2</option>
                                  <option value={2}>Option 3</option>
                                  <option value={3}>Option 4</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">Explanation (optional)</label>
                                <Input
                                  value={q.explanation || ''}
                                  onChange={(e) => updateQuestion(chIndex, lsIndex, qIndex, { explanation: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
              {(ch.lessons || []).length === 0 && <div className="text-sm text-slate-500">No lessons in this chapter yet.</div>}
            </div>
          </Card>
        ))}
        {chapters.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600 dark:text-slate-300">No chapters yet. Add a chapter to start building content.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
