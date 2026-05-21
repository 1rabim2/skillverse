import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function ScorePill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-xs font-extrabold text-white">
      {children}
    </span>
  );
}

export default function QuizGame() {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [error, setError] = React.useState('');
  const [items, setItems] = React.useState([]);
  const [answers, setAnswers] = React.useState(() => new Map());
  const [result, setResult] = React.useState(null);

  async function start() {
    try {
      setLoading(true);
      setError('');
      setResult(null);
      setAnswers(new Map());
      const res = await apiFetch('/user/me/game/quiz?count=10');
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setBlocked(true);
          return;
        }
        throw new Error(data?.error || 'Failed to start quiz game');
      }
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    try {
      setLoading(true);
      setError('');
      const payload = items.map((q) => ({
        courseId: q.courseId,
        lessonId: q.lessonId,
        questionId: q.questionId,
        answerIndex: answers.has(q.questionId) ? answers.get(q.questionId) : null
      }));
      const res = await apiFetch('/user/me/game/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setBlocked(true);
          return;
        }
        throw new Error(data?.error || 'Failed to submit quiz game');
      }
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (blocked) {
    return (
      <div className="min-h-[70vh] grid place-items-center p-6">
        <Card className="w-full max-w-xl p-6">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('quizGame.title')}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('quizGame.blockedMsg')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button as={Link} to="/login">
              {t('quizGame.goToLogin')}
            </Button>
            <Button as={Link} to="/" variant="outline">
              {t('quizGame.backHome')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const canSubmit = items.length > 0 && !loading;
  const hasResult = !!result;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('quizGame.title')}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('quizGame.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={start} disabled={loading}>
            {t('quizGame.start')}
          </Button>
          <Button onClick={submit} disabled={!canSubmit} variant="outline">
            {t('quizGame.submit')}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4">
          <div className="text-sm text-slate-700 dark:text-slate-200">{error}</div>
        </Card>
      )}

      {hasResult && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t('quizGame.scoreLine', { correct: result.correct, total: result.total, percent: result.scorePercent })}
            </div>
            <div className="flex flex-wrap gap-2">
              <ScorePill>{t('quizGame.xpAwarded', { xp: result.xpAwarded })}</ScorePill>
              <ScorePill>{t('quizGame.streak', { days: result.currentStreak })}</ScorePill>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {items.map((q, idx) => {
          const chosen = answers.has(q.questionId) ? answers.get(q.questionId) : null;
          const graded = result?.items?.find((x) => x.questionId === q.questionId) || null;
          const correctIndex = graded?.correctIndex ?? null;
          const showReview = hasResult && graded;

          return (
            <Card key={q.questionId} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {idx + 1}. {q.prompt}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {q.courseTitle ? `${q.courseTitle} • ${q.lessonTitle || ''}` : q.lessonTitle || ''}
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {(q.options || []).map((opt, i) => {
                  const selected = chosen === i;
                  const isCorrect = showReview && Number.isFinite(correctIndex) && i === correctIndex;
                  const isWrongPick = showReview && selected && Number.isFinite(correctIndex) && i !== correctIndex;
                  const base =
                    'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors';
                  const cls = [
                    base,
                    selected ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
                    isCorrect ? 'ring-2 ring-emerald-500' : '',
                    isWrongPick ? 'ring-2 ring-red-500' : ''
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <label key={`${q.questionId}:${i}`} className={cls}>
                      <input
                        type="radio"
                        name={`q:${q.questionId}`}
                        className="mt-1"
                        disabled={loading || hasResult}
                        checked={selected}
                        onChange={() => {
                          setAnswers((prev) => {
                            const next = new Map(prev);
                            next.set(q.questionId, i);
                            return next;
                          });
                        }}
                      />
                      <span className="flex-1">{opt}</span>
                    </label>
                  );
                })}
              </div>

              {showReview && (graded.explanation || Number.isFinite(correctIndex)) && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
                  <div className="font-semibold">
                    {graded.correct ? t('quizGame.correct') : t('quizGame.incorrect')}
                  </div>
                  {Number.isFinite(correctIndex) && (
                    <div className="mt-1 text-slate-600 dark:text-slate-300">
                      {t('quizGame.correctAnswer', { answer: q.options?.[correctIndex] || '' })}
                    </div>
                  )}
                  {graded.explanation && (
                    <div className="mt-2">{graded.explanation}</div>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {items.length === 0 && (
          <Card className="p-6">
            <div className="text-sm text-slate-600 dark:text-slate-300">{t('quizGame.empty')}</div>
          </Card>
        )}
      </div>
    </div>
  );
}

