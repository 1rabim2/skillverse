import React from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/apiFetch';
import VideoEmbed from '../components/VideoEmbed';
import ResourceEmbed from '../components/ResourceEmbed';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { uploadUserVideo } from '../lib/uploads';
import { resolveAssetUrl } from '../lib/assets';
import { API_BASE } from '../lib/apiBase';

function getCurriculum(course) {
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  const normalized = chapters
    .map((ch) => ({
      ...ch,
      lessons: Array.isArray(ch.lessons) ? ch.lessons : []
    }))
    .filter((ch) => ch.title || (ch.lessons && ch.lessons.length));
  const hasLessons = normalized.some((ch) => (ch.lessons || []).length > 0);
  return { chapters: normalized, hasLessons };
}

function firstLessonId(chapters) {
  for (const ch of chapters || []) {
    for (const ls of ch.lessons || []) {
      if (ls?._id) return String(ls._id);
    }
  }
  return '';
}

function findLesson(chapters, lessonId) {
  for (const ch of chapters || []) {
    for (const ls of ch.lessons || []) {
      if (String(ls._id) === String(lessonId)) return { chapter: ch, lesson: ls };
    }
  }
  return null;
}

function totalLessons(chapters) {
  return (chapters || []).reduce((sum, ch) => sum + ((ch.lessons || []).length), 0);
}

function formatBytes(bytes) {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  const value = b / Math.pow(1024, idx);
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function CourseDetail() {
  const { id } = useParams();
  const [authed, setAuthed] = React.useState(false);
  const [authChecked, setAuthChecked] = React.useState(false);

  const [course, setCourse] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [videosLocked, setVideosLocked] = React.useState(false);
  const [enrolled, setEnrolled] = React.useState(false);
  const [actionMsg, setActionMsg] = React.useState('');
  const [updating, setUpdating] = React.useState(false);
  const [progress, setProgress] = React.useState({ percent: 0, completedLessonIds: [], latestQuizByLessonId: {} });
  const [selectedLessonId, setSelectedLessonId] = React.useState('');
  const [quizAnswers, setQuizAnswers] = React.useState([]);
  const [quizResult, setQuizResult] = React.useState(null);
  const [quizSubmitting, setQuizSubmitting] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const [noteBusy, setNoteBusy] = React.useState(false);
  const [noteMsg, setNoteMsg] = React.useState('');
  const [projectSub, setProjectSub] = React.useState({ repoUrl: '', demoUrl: '', notes: '', status: 'draft', feedback: '', attachments: [], submittedAt: null, reviewedAt: null });
  const [projectBusy, setProjectBusy] = React.useState(false);
  const [projectMsg, setProjectMsg] = React.useState('');

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await apiFetch(`/courses/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load course');
        if (mounted) {
          setCourse(data.course);
          setVideosLocked(!!data?.meta?.videosLocked);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  React.useEffect(() => {
    let mounted = true;

    async function loadEnrollment() {
      try {
        const res = await apiFetch('/user/me');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (mounted) {
            setAuthed(false);
            setEnrolled(false);
          }
          return;
        }
        if (mounted) setAuthed(true);
        const ids = (data.user?.enrolledCourses || []).map((c) => c?._id || c?.id).filter(Boolean);
        if (mounted) setEnrolled(ids.includes(id));
      } catch {
        if (mounted) {
          setAuthed(false);
          setEnrolled(false);
        }
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    loadEnrollment();
    return () => {
      mounted = false;
    };
  }, [id]);

  React.useEffect(() => {
    if (!course) return;
    const { chapters, hasLessons } = getCurriculum(course);
    if (!hasLessons) return;
    setSelectedLessonId((prev) => prev || firstLessonId(chapters));
  }, [course]);

  React.useEffect(() => {
    if (!authed) return;
    if (!course) return;
    const lessonId = selectedLesson?._id ? String(selectedLesson._id) : '';

    let mounted = true;
    async function loadNote() {
      try {
        setNoteMsg('');
        setNoteBusy(true);
        const res = await apiFetch(
          `/user/notes?courseId=${encodeURIComponent(course._id)}&lessonId=${encodeURIComponent(lessonId)}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (mounted) setNoteText(String(data?.note?.text || ''));
      } catch {
        // ignore
      } finally {
        if (mounted) setNoteBusy(false);
      }
    }

    loadNote();
    return () => {
      mounted = false;
    };
  }, [authed, course, selectedLessonId]);

  React.useEffect(() => {
    if (!authed) return;
    if (!course) return;
    if (!selectedLesson?._id) return;
    if (String(selectedLesson?.type || '') !== 'project') return;

    let mounted = true;
    async function loadProject() {
      try {
        setProjectMsg('');
        setProjectBusy(true);
        const res = await apiFetch(
          `/user/course/${encodeURIComponent(course._id)}/projects/${encodeURIComponent(String(selectedLesson._id))}`
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (!mounted) return;
        setProjectSub({
          repoUrl: String(data?.submission?.repoUrl || ''),
          demoUrl: String(data?.submission?.demoUrl || ''),
          notes: String(data?.submission?.notes || ''),
          status: String(data?.submission?.status || 'draft'),
          feedback: String(data?.submission?.feedback || ''),
          attachments: Array.isArray(data?.submission?.attachments) ? data.submission.attachments : [],
          submittedAt: data?.submission?.submittedAt || null,
          reviewedAt: data?.submission?.reviewedAt || null
        });
      } catch {
        // ignore
      } finally {
        if (mounted) setProjectBusy(false);
      }
    }

    loadProject();
    return () => {
      mounted = false;
    };
  }, [authed, course, selectedLessonId]);

  async function submitProject() {
    if (!authed || !course || !selectedLesson?._id) return;
    try {
      setProjectMsg('');
      setProjectBusy(true);
      const res = await apiFetch(
        `/user/course/${encodeURIComponent(course._id)}/projects/${encodeURIComponent(String(selectedLesson._id))}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoUrl: projectSub.repoUrl,
            demoUrl: projectSub.demoUrl,
            notes: projectSub.notes
          })
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to submit project');
      setProjectSub((p) => ({
        ...p,
        status: String(data?.submission?.status || 'submitted'),
        submittedAt: data?.submission?.submittedAt || new Date().toISOString()
      }));
      setProjectMsg('Submitted');
      setTimeout(() => setProjectMsg(''), 1600);
    } catch (err) {
      setProjectMsg(err?.message || 'Failed to submit');
    } finally {
      setProjectBusy(false);
    }
  }

  async function onDemoVideoPick(file) {
    if (!authed) return;
    if (!file) return;
    try {
      setProjectMsg('Uploading video...');
      setProjectBusy(true);
      const uploaded = await uploadUserVideo(file);
      const url = String(uploaded?.url || '');
      if (!url) throw new Error('Upload failed');
      setProjectSub((p) => ({ ...p, demoUrl: url }));
      setProjectMsg('Video uploaded');
      setTimeout(() => setProjectMsg(''), 1600);
    } catch (err) {
      setProjectMsg(err?.message || 'Failed to upload video');
    } finally {
      setProjectBusy(false);
    }
  }

  async function uploadProjectAttachment(file) {
    if (!authed || !course || !selectedLesson?._id) return;
    if (!file) return;
    try {
      setProjectMsg('Uploading file...');
      setProjectBusy(true);
      const res = await apiFetch(
        `/user/course/${encodeURIComponent(course._id)}/projects/${encodeURIComponent(String(selectedLesson._id))}/attachments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-Filename': file.name || 'attachment'
          },
          body: file
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to upload attachment');
      setProjectSub((p) => ({ ...p, attachments: Array.isArray(data?.attachments) ? data.attachments : p.attachments }));
      setProjectMsg('File uploaded');
      setTimeout(() => setProjectMsg(''), 1600);
    } catch (err) {
      setProjectMsg(err?.message || 'Failed to upload attachment');
    } finally {
      setProjectBusy(false);
    }
  }

  async function removeProjectAttachment(fileName) {
    if (!authed || !course || !selectedLesson?._id) return;
    if (!fileName) return;
    try {
      setProjectMsg('Removing...');
      setProjectBusy(true);
      const res = await apiFetch(
        `/user/course/${encodeURIComponent(course._id)}/projects/${encodeURIComponent(String(selectedLesson._id))}/attachments/${encodeURIComponent(String(fileName))}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to remove attachment');
      setProjectSub((p) => ({ ...p, attachments: Array.isArray(data?.attachments) ? data.attachments : p.attachments }));
      setProjectMsg('Removed');
      setTimeout(() => setProjectMsg(''), 1200);
    } catch (err) {
      setProjectMsg(err?.message || 'Failed to remove attachment');
    } finally {
      setProjectBusy(false);
    }
  }

  async function saveNote() {
    if (!authed || !course) return;
    const lessonId = selectedLesson?._id ? String(selectedLesson._id) : '';
    try {
      setNoteMsg('');
      setNoteBusy(true);
      const res = await apiFetch('/user/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: String(course._id), lessonId, text: noteText })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save notes');
      setNoteMsg('Saved');
      setTimeout(() => setNoteMsg(''), 1500);
    } catch (err) {
      setNoteMsg(err?.message || 'Failed to save');
    } finally {
      setNoteBusy(false);
    }
  }

  React.useEffect(() => {
    if (!authed) return;
    if (!course) return;
    const { hasLessons } = getCurriculum(course);
    if (!hasLessons) return;
    let mounted = true;

    async function loadProgress() {
      try {
        const res = await apiFetch(`/user/course/${encodeURIComponent(id)}/progress`);
        const data = await res.json();
        if (!res.ok) return;
        if (mounted) {
          setProgress({
            percent: data.progress?.percent || 0,
            completedLessonIds: data.progress?.completedLessonIds || [],
            latestQuizByLessonId: data.progress?.latestQuizByLessonId || {}
          });
        }
      } catch {
        // ignore
      }
    }

    loadProgress();
    return () => {
      mounted = false;
    };
  }, [authed, course, id]);

  async function enroll() {
    if (!authed) {
      window.location.href = '/login';
      return;
    }
    setUpdating(true);
    setActionMsg('');
    try {
      const res = await apiFetch('/user/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll');
      setEnrolled(true);
      setActionMsg(data.message || 'Enrolled');
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setUpdating(false);
    }
  }

  async function submitQuiz(lessonId) {
    if (!authed) {
      window.location.href = '/login';
      return;
    }
    setQuizSubmitting(true);
    setQuizResult(null);
    setActionMsg('');
    try {
      const res = await apiFetch(`/user/course/${encodeURIComponent(id)}/lessons/${encodeURIComponent(lessonId)}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: quizAnswers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit quiz');
      setQuizResult(data.result || null);
      if (data.progress) {
        setProgress((prev) => ({
          ...prev,
          percent: data.progress.percent || prev.percent,
          completedLessonIds: data.progress.completedLessonIds || prev.completedLessonIds
        }));
      }
      if (data.certificate?.certificateId) setActionMsg(`Certificate issued: ${data.certificate.certificateId}`);
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setQuizSubmitting(false);
    }
  }

  async function completeLesson(lessonId) {
    if (!authed) {
      window.location.href = '/login';
      return;
    }
    setUpdating(true);
    setActionMsg('');
    try {
      const res = await apiFetch(`/user/course/${encodeURIComponent(id)}/lessons/${encodeURIComponent(lessonId)}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete lesson');
      if (data.progress) {
        setProgress((prev) => ({
          ...prev,
          percent: data.progress.percent || prev.percent,
          completedLessonIds: data.progress.completedLessonIds || prev.completedLessonIds
        }));
      }
      if (data.certificate?.certificateId) {
        setActionMsg(`Certificate issued: ${data.certificate.certificateId}`);
      } else {
        setActionMsg('Lesson completed.');
      }
    } catch (err) {
      setActionMsg(err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-5">
        <div className="text-sm text-slate-600 dark:text-slate-300">Loading course...</div>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Could not load course</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</div>
      </Card>
    );
  }
  if (!course) {
    return (
      <Card className="p-5">
        <div className="text-sm text-slate-600 dark:text-slate-300">Course not found.</div>
      </Card>
    );
  }

  const curriculum = getCurriculum(course);
  const chapters = curriculum.chapters;
  const hasLessons = curriculum.hasLessons;
  const total = hasLessons ? totalLessons(chapters) : 0;
  const completedSet = new Set((progress.completedLessonIds || []).map(String));
  const selected = hasLessons ? findLesson(chapters, selectedLessonId) : null;
  const selectedLesson = selected?.lesson || null;
  const selectedQuiz = selectedLesson?.quiz?.questions?.length ? selectedLesson.quiz : null;
  const selectedQuizQuestions = selectedQuiz?.questions || [];
  const isLessonCompleted = selectedLesson?._id ? completedSet.has(String(selectedLesson._id)) : false;
  const latestQuiz = selectedLesson?._id ? progress.latestQuizByLessonId?.[String(selectedLesson._id)] : null;
  const quizPassed = !!(quizResult?.passed || latestQuiz?.passed);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{course.title}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {(course.level || 'Beginner')} • {(course.category || 'General')}
            {course.skillPath?.title ? ` • Skill Path: ${course.skillPath.title}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>Back to Dashboard</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/certificates')}>My Certificates</Button>
        </div>
      </div>

        {hasLessons ? (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">Curriculum</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {completedSet.size} / {total} lessons completed
                  </div>
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">{Math.min(100, progress.percent || 0)}%</div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600"
                  style={{ width: `${Math.min(100, progress.percent || 0)}%` }}
                />
              </div>

              {authChecked && !authed && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
                  Sign in to enroll, take quizzes, and track progress.
                </div>
              )}
              {authed && !enrolled && (
                <Button
                  variant="primary"
                  className="mt-4 w-full bg-emerald-600 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 focus-visible:outline-emerald-600"
                  disabled={updating}
                  onClick={enroll}
                >
                  {updating ? 'Enrolling...' : 'Enroll in Course'}
                </Button>
              )}

              <div className="mt-5">
                {chapters
                  .slice()
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((ch) => (
                    <div key={ch._id || ch.title} className="mt-4">
                      <div className="mb-2 text-sm font-extrabold text-slate-900 dark:text-white">{ch.title || 'Chapter'}</div>
                      <div className="flex flex-col gap-2">
                        {(ch.lessons || [])
                          .slice()
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((ls) => {
                            const done = completedSet.has(String(ls._id));
                            const active = String(ls._id) === String(selectedLessonId);
                            return (
                              <button
                                key={ls._id}
                                onClick={() => {
                                  setSelectedLessonId(String(ls._id));
                                  setQuizResult(null);
                                  setQuizAnswers([]);
                                }}
                                className={[
                                  'w-full rounded-2xl border px-3 py-3 text-left transition-colors',
                                  active
                                    ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/20'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
                                ].join(' ')}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{ls.title || 'Lesson'}</div>
                                  </div>
                                  <div className={['text-xs font-semibold', done ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'].join(' ')}>
                                    {done ? 'Done' : (ls.type || 'reading')}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">{selectedLesson?.title || course.title}</h3>
              {selected?.chapter?.title && (
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {selected.chapter.title}
                </div>
              )}
              {course.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {course.description}
                </p>
              )}

              {selectedLesson?.content && (
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                  {selectedLesson.content}
                </div>
              )}

              {videosLocked && String(selectedLesson?.type || '') === 'video' && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  <div className="font-extrabold">Video locked</div>
                  <div className="mt-1 text-amber-800/90 dark:text-amber-200/90">
                    Subscribe to unlock hosted course videos and continue learning.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button as="a" href="/subscribe">
                      Go to subscription
                    </Button>
                  </div>
                </div>
              )}

              {(selectedLesson?.videoUrl || selectedLesson?.resourceLink) && (
                <div className="mt-4 space-y-4">
                  {selectedLesson?.videoUrl && (
                    <>
                      <VideoEmbed url={resolveAssetUrl(selectedLesson.videoUrl)} title={selectedLesson?.title || 'Lesson video'} />
                      <div className="flex flex-wrap gap-2">
                        <Button as="a" variant="outline" href={resolveAssetUrl(selectedLesson.videoUrl)} target="_blank" rel="noreferrer">
                          Open video link
                        </Button>
                      </div>
                    </>
                  )}
                  {selectedLesson?.resourceLink && (
                    <div className={selectedLesson?.videoUrl ? 'mt-4' : ''}>
                      <ResourceEmbed url={selectedLesson.resourceLink} title={selectedLesson?.title || 'Lesson resource'} />
                      <div className="flex flex-wrap gap-2">
                        <Button as="a" variant="outline" href={selectedLesson.resourceLink} target="_blank" rel="noreferrer">
                          Open resource link
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">My Notes</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {noteMsg && (
                      <div
                        className={[
                          'text-xs font-semibold',
                          noteMsg === 'Saved' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'
                        ].join(' ')}
                      >
                        {noteMsg}
                      </div>
                    )}
                    <Button type="button" variant="outline" disabled={!authed || noteBusy} onClick={saveNote}>
                      {noteBusy ? 'Saving...' : 'Save notes'}
                    </Button>
                  </div>
                </div>
                {authChecked && !authed && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
                    Sign in to write notes for this lesson.
                  </div>
                )}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write what you learned, questions, your own links, code snippets..."
                  rows={6}
                  disabled={!authed}
                  className={[
                    'mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm',
                    'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                    'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40'
                  ].join(' ')}
                />
              </div>

              {selectedQuiz && (
                <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Quiz</h4>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pass: {selectedQuiz.passPercent || 60}%</div>
                  </div>

                  {authChecked && !authed && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
                      Sign in to submit this quiz.
                    </div>
                  )}

                  {authed && (
                    <div className="mt-3 flex flex-col gap-4">
                      {selectedQuizQuestions.map((q, idx) => (
                        <div
                          key={q._id || idx}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-100"
                        >
                          <div className="mb-3 text-sm font-semibold">
                            {idx + 1}. {q.prompt}
                          </div>
                          <div className="grid gap-2">
                            {(q.options || []).map((opt, oIdx) => (
                              <label
                                key={`${idx}-${oIdx}`}
                                className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                              >
                                <input
                                  type="radio"
                                  name={`q-${idx}`}
                                  checked={Number(quizAnswers[idx]) === oIdx}
                                  onChange={() => {
                                    setQuizAnswers((prev) => {
                                      const next = [...prev];
                                      next[idx] = oIdx;
                                      return next;
                                    });
                                  }}
                                  className="mt-0.5 h-4 w-4 accent-indigo-600"
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="flex flex-wrap items-center gap-2">
                        <Button disabled={quizSubmitting || !enrolled} onClick={() => submitQuiz(String(selectedLesson._id))}>
                          {quizSubmitting ? 'Submitting...' : enrolled ? 'Submit quiz' : 'Enroll to submit'}
                        </Button>
                        <Button
                          variant={isLessonCompleted ? 'primary' : 'outline'}
                          className={isLessonCompleted ? 'bg-emerald-600 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 focus-visible:outline-emerald-600' : ''}
                          disabled={updating || !enrolled || isLessonCompleted || (selectedQuizQuestions.length > 0 && !quizPassed)}
                          onClick={() => completeLesson(String(selectedLesson._id))}
                        >
                          {isLessonCompleted ? 'Lesson completed' : updating ? 'Saving...' : selectedQuizQuestions.length > 0 ? 'Complete (pass quiz)' : 'Mark lesson complete'}
                        </Button>
                      </div>

                      {(quizResult || latestQuiz) && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-100">
                          <div
                            className={[
                              'text-sm font-extrabold',
                              (quizResult?.passed || latestQuiz?.passed) ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                            ].join(' ')}
                          >
                            {(quizResult?.passed || latestQuiz?.passed) ? 'Passed' : 'Not passed yet'}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Score: {(quizResult?.scorePercent ?? latestQuiz?.scorePercent ?? 0)}% ({(quizResult?.correct ?? latestQuiz?.correct ?? 0)}/{(quizResult?.total ?? latestQuiz?.total ?? 0)} correct)
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!selectedQuiz && selectedLesson?._id && (
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    variant={isLessonCompleted ? 'primary' : 'secondary'}
                    className={
                      isLessonCompleted
                        ? 'bg-emerald-600 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 focus-visible:outline-emerald-600'
                        : 'bg-sky-600 hover:bg-sky-700 focus-visible:outline-sky-600'
                    }
                    disabled={updating || !authed || !enrolled || isLessonCompleted}
                    onClick={() => completeLesson(String(selectedLesson._id))}
                  >
                    {isLessonCompleted ? 'Lesson completed' : updating ? 'Saving...' : 'Mark lesson complete'}
                  </Button>
                </div>
              )}

              {selectedLesson?._id && String(selectedLesson?.type || '') === 'project' && (
                <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Project submission</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {projectMsg && (
                        <div
                          className={[
                            'text-xs font-semibold',
                            projectMsg === 'Submitted' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'
                          ].join(' ')}
                        >
                          {projectMsg}
                        </div>
                      )}
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Status: <span className="font-extrabold text-slate-900 dark:text-slate-100">{projectSub.status || 'draft'}</span>
                      </div>
                      <Button type="button" disabled={!authed || projectBusy} onClick={submitProject}>
                        {projectBusy ? 'Submitting...' : 'Submit project'}
                      </Button>
                    </div>
                  </div>

                  {authChecked && !authed && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
                      Sign in to submit your project.
                    </div>
                  )}

                  {authed && (
                    <div className="mt-3 grid gap-3 lg:max-w-3xl">
                      <div className="grid gap-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">GitHub repo URL (recommended)</label>
                        <Input
                          value={projectSub.repoUrl}
                          onChange={(e) => setProjectSub((p) => ({ ...p, repoUrl: e.target.value }))}
                          placeholder="https://github.com/username/project"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Live demo URL (optional)</label>
                        <Input
                          value={projectSub.demoUrl}
                          onChange={(e) => setProjectSub((p) => ({ ...p, demoUrl: e.target.value }))}
                          placeholder="https://your-demo.vercel.app"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            Upload demo video
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              disabled={projectBusy}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                onDemoVideoPick(file || null);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {projectSub.demoUrl ? (
                            <a
                              href={resolveAssetUrl(projectSub.demoUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                            >
                              Open
                            </a>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notes (what you built, how to run, issues)</label>
                        <textarea
                          value={projectSub.notes}
                          onChange={(e) => setProjectSub((p) => ({ ...p, notes: e.target.value }))}
                          rows={4}
                          placeholder="Features completed, how to run, username/password for demo, screenshots, etc."
                          className={[
                            'w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-sm',
                            'placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200',
                            'disabled:cursor-not-allowed disabled:opacity-60',
                            'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40'
                          ].join(' ')}
                        />
                      </div>

                      {projectSub.feedback ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-100">
                          <div className="mb-1 text-sm font-extrabold">Feedback</div>
                          <div className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{projectSub.feedback}</div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {actionMsg && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-100">
                  {actionMsg}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="p-5">
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">About this course</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{course.description || 'No description yet.'}</p>

              {course.videoUrl && (
                <div className="mt-5">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Video</h4>
                  <VideoEmbed url={resolveAssetUrl(course.videoUrl)} title={course?.title || 'Course video'} />
                  <div className="mt-2">
                    <Button as="a" variant="outline" href={resolveAssetUrl(course.videoUrl)} target="_blank" rel="noreferrer">
                      Open video link
                    </Button>
                  </div>
                </div>
              )}

              {course.resourceLink && (
                <div className="mt-5">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Resources</h4>
                  <ResourceEmbed url={course.resourceLink} title={course?.title || 'Course resource'} />
                  <div className="mt-2">
                    <Button as="a" variant="outline" href={course.resourceLink} target="_blank" rel="noreferrer">
                      Open resource link
                    </Button>
                  </div>
                </div>
              )}
            </Card>

              <Card className="p-5">
                <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Actions</h3>
              {authChecked && !authed && (
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
                  Login as a student to enroll and track progress.
                </p>
              )}
              {authed && !enrolled && (
                <Button
                  variant="primary"
                  className="mt-3 w-full bg-emerald-600 shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 focus-visible:outline-emerald-600"
                  disabled={updating}
                  onClick={enroll}
                >
                  {updating ? 'Enrolling...' : 'Enroll in Course'}
                </Button>
              )}
              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                This course has no curriculum yet. Add chapters/lessons/quizzes from the admin panel to enable lesson tracking.
              </div>
              {actionMsg && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-100">
                  {actionMsg}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
  );
}
