import React from 'react';
import { useParams } from 'react-router-dom';
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

export default function CourseDetail() {
  const { id } = useParams();
  const token = localStorage.getItem('token');

  const [course, setCourse] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [enrolled, setEnrolled] = React.useState(false);
  const [actionMsg, setActionMsg] = React.useState('');
  const [updating, setUpdating] = React.useState(false);
  const [progress, setProgress] = React.useState({ percent: 0, completedLessonIds: [], latestQuizByLessonId: {} });
  const [selectedLessonId, setSelectedLessonId] = React.useState('');
  const [quizAnswers, setQuizAnswers] = React.useState([]);
  const [quizResult, setQuizResult] = React.useState(null);
  const [quizSubmitting, setQuizSubmitting] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load course');
        if (mounted) setCourse(data.course);
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
    if (!token) return;
    let mounted = true;

    async function loadEnrollment() {
      try {
        const res = await fetch(`${API_BASE}/user/me`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) {
          const msg = data?.error || '';
          if (res.status === 404 && msg.toLowerCase().includes('user not found')) {
            localStorage.removeItem('token');
          }
          return;
        }
        const ids = (data.user?.enrolledCourses || []).map((c) => c?._id || c?.id).filter(Boolean);
        if (mounted) setEnrolled(ids.includes(id));
      } catch {
        // ignore
      }
    }

    loadEnrollment();
    return () => {
      mounted = false;
    };
  }, [id, token]);

  React.useEffect(() => {
    if (!course) return;
    const { chapters, hasLessons } = getCurriculum(course);
    if (!hasLessons) return;
    setSelectedLessonId((prev) => prev || firstLessonId(chapters));
  }, [course]);

  React.useEffect(() => {
    if (!token) return;
    if (!course) return;
    const { hasLessons } = getCurriculum(course);
    if (!hasLessons) return;
    let mounted = true;

    async function loadProgress() {
      try {
        const res = await fetch(`${API_BASE}/user/course/${encodeURIComponent(id)}/progress`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
  }, [course, id, token]);

  async function enroll() {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setUpdating(true);
    setActionMsg('');
    try {
      const res = await fetch(`${API_BASE}/user/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setQuizSubmitting(true);
    setQuizResult(null);
    setActionMsg('');
    try {
      const res = await fetch(`${API_BASE}/user/course/${encodeURIComponent(id)}/lessons/${encodeURIComponent(lessonId)}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setUpdating(true);
    setActionMsg('');
    try {
      const res = await fetch(`${API_BASE}/user/course/${encodeURIComponent(id)}/lessons/${encodeURIComponent(lessonId)}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
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

  if (loading) return <div style={{ padding: 24 }}>Loading course...</div>;
  if (error) return <div style={{ padding: 24 }}>Could not load course: {error}</div>;
  if (!course) return <div style={{ padding: 24 }}>Course not found.</div>;

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
    <div style={{ minHeight: '100vh', background: '#0b1220', color: '#e5e7eb', padding: 24 }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>{course.title}</h1>
            <p style={{ marginTop: 8, color: '#94a3b8' }}>
              {(course.level || 'Beginner')} | {(course.category || 'General')}
              {course.skillPath?.title ? ` | Skill Path: ${course.skillPath.title}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              style={{ border: '1px solid #334155', background: 'transparent', color: '#e5e7eb', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => (window.location.href = '/certificates')}
              style={{ border: '1px solid #334155', background: 'transparent', color: '#e5e7eb', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}
            >
              My Certificates
            </button>
          </div>
        </div>

        {hasLessons ? (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '0.55fr 1.45fr', gap: 16 }}>
            <div style={{ background: '#0f172a', border: '1px solid #1f2a44', borderRadius: 16, padding: 16 }}>
              <h3 style={{ marginTop: 0, marginBottom: 10 }}>Curriculum</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 13 }}>
                <span>Progress</span>
                <span>{Math.min(100, progress.percent || 0)}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', background: '#0b1220', border: '1px solid #243047', marginTop: 8 }}>
                <div style={{ height: '100%', width: `${Math.min(100, progress.percent || 0)}%`, background: 'linear-gradient(90deg,#22c55e,#38bdf8)' }} />
              </div>
              <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 12 }}>
                {completedSet.size} / {total} lessons completed
              </div>

              {!token && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid #243047', background: '#0b1220', color: '#cbd5e1', fontSize: 13 }}>
                  Sign in to enroll, take quizzes, and track progress.
                </div>
              )}
              {token && !enrolled && (
                <button
                  disabled={updating}
                  onClick={enroll}
                  style={{ width: '100%', marginTop: 12, background: '#22c55e', color: '#052e16', border: 'none', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontWeight: 700 }}
                >
                  {updating ? 'Enrolling...' : 'Enroll in Course'}
                </button>
              )}

              <div style={{ marginTop: 14 }}>
                {chapters
                  .slice()
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((ch) => (
                    <div key={ch._id || ch.title} style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 800, color: '#e5e7eb', marginBottom: 6 }}>{ch.title || 'Chapter'}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                                style={{
                                  textAlign: 'left',
                                  borderRadius: 12,
                                  padding: '10px 10px',
                                  border: `1px solid ${active ? '#38bdf8' : '#243047'}`,
                                  background: active ? 'rgba(56,189,248,0.10)' : '#0b1220',
                                  color: '#e5e7eb',
                                  cursor: 'pointer'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                  <div style={{ fontWeight: 750, fontSize: 13 }}>
                                    {ls.title || 'Lesson'}
                                  </div>
                                  <div style={{ fontSize: 12, color: done ? '#22c55e' : '#94a3b8' }}>{done ? 'Done' : (ls.type || 'reading')}</div>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1f2a44', borderRadius: 16, padding: 16 }}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{selectedLesson?.title || course.title}</h3>
              {selected?.chapter?.title && (
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>
                  {selected.chapter.title}
                </div>
              )}
              {course.description && (
                <p style={{ color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 0 }}>
                  {course.description}
                </p>
              )}

              {selectedLesson?.content && (
                <div style={{ marginTop: 10, color: '#cbd5e1', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selectedLesson.content}
                </div>
              )}

              {(selectedLesson?.videoUrl || selectedLesson?.resourceLink) && (
                <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {selectedLesson?.videoUrl && (
                    <a href={selectedLesson.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
                      Open video
                    </a>
                  )}
                  {selectedLesson?.resourceLink && (
                    <a href={selectedLesson.resourceLink} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
                      Open resource
                    </a>
                  )}
                </div>
              )}

              {selectedQuiz && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #243047' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <h4 style={{ margin: 0 }}>Quiz</h4>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Pass: {selectedQuiz.passPercent || 60}%</div>
                  </div>

                  {!token && (
                    <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: '1px solid #243047', background: '#0b1220', color: '#cbd5e1', fontSize: 13 }}>
                      Sign in to submit this quiz.
                    </div>
                  )}

                  {token && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {selectedQuizQuestions.map((q, idx) => (
                        <div key={q._id || idx} style={{ border: '1px solid #243047', background: '#0b1220', borderRadius: 14, padding: 12 }}>
                          <div style={{ fontWeight: 750, marginBottom: 8 }}>
                            {idx + 1}. {q.prompt}
                          </div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {(q.options || []).map((opt, oIdx) => (
                              <label key={`${idx}-${oIdx}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', color: '#cbd5e1' }}>
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
                                  style={{ marginTop: 3 }}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          disabled={quizSubmitting || !enrolled}
                          onClick={() => submitQuiz(String(selectedLesson._id))}
                          style={{
                            background: enrolled ? '#38bdf8' : '#334155',
                            color: '#082f49',
                            border: 'none',
                            borderRadius: 12,
                            padding: '12px 14px',
                            cursor: enrolled ? 'pointer' : 'not-allowed',
                            fontWeight: 800
                          }}
                        >
                          {quizSubmitting ? 'Submitting...' : enrolled ? 'Submit quiz' : 'Enroll to submit'}
                        </button>
                        <button
                          disabled={updating || !enrolled || isLessonCompleted || (selectedQuizQuestions.length > 0 && !quizPassed)}
                          onClick={() => completeLesson(String(selectedLesson._id))}
                          style={{
                            background: isLessonCompleted ? '#22c55e' : '#0b1220',
                            color: isLessonCompleted ? '#052e16' : '#e5e7eb',
                            border: `1px solid ${isLessonCompleted ? '#22c55e' : '#243047'}`,
                            borderRadius: 12,
                            padding: '12px 14px',
                            cursor: isLessonCompleted ? 'default' : 'pointer',
                            fontWeight: 800
                          }}
                        >
                          {isLessonCompleted ? 'Lesson completed' : updating ? 'Saving...' : selectedQuizQuestions.length > 0 ? 'Complete (pass quiz)' : 'Mark lesson complete'}
                        </button>
                      </div>

                      {(quizResult || latestQuiz) && (
                        <div style={{ padding: 12, borderRadius: 12, border: '1px solid #243047', background: '#0b1220', color: '#cbd5e1' }}>
                          <div style={{ fontWeight: 800, color: (quizResult?.passed || latestQuiz?.passed) ? '#22c55e' : '#f59e0b' }}>
                            {(quizResult?.passed || latestQuiz?.passed) ? 'Passed' : 'Not passed yet'}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 13, color: '#94a3b8' }}>
                            Score: {(quizResult?.scorePercent ?? latestQuiz?.scorePercent ?? 0)}% ({(quizResult?.correct ?? latestQuiz?.correct ?? 0)}/{(quizResult?.total ?? latestQuiz?.total ?? 0)} correct)
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!selectedQuiz && selectedLesson?._id && (
                <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    disabled={updating || !token || !enrolled || isLessonCompleted}
                    onClick={() => completeLesson(String(selectedLesson._id))}
                    style={{
                      background: isLessonCompleted ? '#22c55e' : '#38bdf8',
                      color: isLessonCompleted ? '#052e16' : '#082f49',
                      border: 'none',
                      borderRadius: 12,
                      padding: '12px 14px',
                      cursor: isLessonCompleted ? 'default' : 'pointer',
                      fontWeight: 800
                    }}
                  >
                    {isLessonCompleted ? 'Lesson completed' : updating ? 'Saving...' : 'Mark lesson complete'}
                  </button>
                </div>
              )}

              {actionMsg && (
                <div style={{ marginTop: 12, background: '#0b1220', border: '1px solid #243047', borderRadius: 12, padding: 10, color: '#e5e7eb' }}>
                  {actionMsg}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 16 }}>
            <div style={{ background: '#0f172a', border: '1px solid #1f2a44', borderRadius: 16, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>About this course</h3>
              <p style={{ color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{course.description || 'No description yet.'}</p>

              {course.videoUrl && (
                <div style={{ marginTop: 14 }}>
                  <h4 style={{ marginBottom: 8 }}>Video</h4>
                  <a href={course.videoUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
                    Open video link
                  </a>
                </div>
              )}

              {course.resourceLink && (
                <div style={{ marginTop: 14 }}>
                  <h4 style={{ marginBottom: 8 }}>Resources</h4>
                  <a href={course.resourceLink} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>
                    Open resource link
                  </a>
                </div>
              )}
            </div>

            <div style={{ background: '#0f172a', border: '1px solid #1f2a44', borderRadius: 16, padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Actions</h3>
              {!token && (
                <p style={{ color: '#cbd5e1' }}>
                  Login as a student to enroll and track progress.
                </p>
              )}
              {token && !enrolled && (
                <button
                  disabled={updating}
                  onClick={enroll}
                  style={{ width: '100%', background: '#22c55e', color: '#052e16', border: 'none', borderRadius: 12, padding: '12px 14px', cursor: 'pointer', fontWeight: 700 }}
                >
                  {updating ? 'Enrolling...' : 'Enroll in Course'}
                </button>
              )}
              <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8' }}>
                This course has no curriculum yet. Add chapters/lessons/quizzes from the admin panel to enable lesson tracking.
              </div>
              {actionMsg && (
                <div style={{ marginTop: 12, background: '#0b1220', border: '1px solid #243047', borderRadius: 12, padding: 10, color: '#e5e7eb' }}>
                  {actionMsg}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
