import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiFetch';
import { API_BASE } from '../lib/apiBase';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function SectionCard({ title, children, right }) {
  return (
    <Card as="section" className="p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
        {right || null}
      </div>
      {children}
    </Card>
  );
}
export default function Portfolio() {
  const { t } = useTranslation();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [blocked, setBlocked] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        setBlocked(false);
        const res = await apiFetch('/user/me/portfolio');
        const result = await res.json();
        if (!res.ok) {
          const msg = result?.error || 'Failed to load portfolio';
          if (res.status === 401 || res.status === 403) {
            if (mounted) setBlocked(true);
            return;
          }
          throw new Error(msg);
        }
        if (mounted) setData(result);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (blocked) {
    return (
      <div className="min-h-[70vh] grid place-items-center p-6">
        <Card className="w-full max-w-xl p-6">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('portfolio.title')}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('portfolio.blockedMsg')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button as={Link} to="/login">
              {t('portfolio.goToLogin')}
            </Button>
            <Button as={Link} to="/" variant="outline">
              {t('portfolio.backHome')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-600 dark:text-slate-300">{t('portfolio.loading')}</div>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-700 dark:text-slate-200">{t('portfolio.couldNotLoad', { error })}</div>
      </Card>
    );
  }

  const user = data?.user || {};
  const stats = data?.stats || {};
  const completedCourses = data?.completedCourses || [];
  const certificates = data?.certificates || [];

  return (
    <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t('portfolio.title')}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t('portfolio.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button as={Link} to="/dashboard" variant="outline">
              {t('portfolio.backToDashboard')}
            </Button>
            <Button as={Link} to="/certificates">
              {t('portfolio.certificates')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard title={t('portfolio.profile')}>
            <div className="text-sm text-slate-700 dark:text-slate-200">
              <div className="font-semibold">{user.name || 'Student'}</div>
              <div className="text-slate-500">{user.email || ''}</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t('portfolio.enrolled'), value: stats.enrolledCourses || 0 },
                { label: t('portfolio.completed'), value: stats.completedCourses || 0 },
                { label: t('portfolio.tasksCompleted'), value: stats.tasksCompleted || 0 },
                { label: t('portfolio.certificates'), value: stats.certificates || 0 }
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-950/30">
                  <div className="text-2xl font-extrabold">{s.value}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{s.label}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="lg:col-span-2 grid grid-cols-1 gap-4">
            <SectionCard
              title={t('portfolio.completedCourses')}
              right={
                <Link to="/courses" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                  {t('portfolio.browseCourses')}
                </Link>
              }
            >
              <div className="space-y-2">
                {completedCourses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.title}</div>
                      <div className="text-xs text-slate-500">{[c.category, c.level].filter(Boolean).join(' - ')}</div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.completedAt ? new Date(c.completedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                ))}
                {completedCourses.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
                    {t('portfolio.noCompleted')}
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title={t('portfolio.certificates')}>
              <div className="space-y-2">
                {certificates.map((c) => (
                  <div key={c.certificateId || c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{c.course?.title || 'Course'}</div>
                      <div className="text-xs text-slate-500">{c.certificateId}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-xs text-slate-500">{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : ''}</div>
                      {c.certificateId ? (
                        <a
                          href={`${API_BASE}/user/me/certificates/${encodeURIComponent(String(c.certificateId))}/download`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          PDF
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
                {certificates.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
                    {t('portfolio.noCertificates')}
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
    </div>
  );
}
