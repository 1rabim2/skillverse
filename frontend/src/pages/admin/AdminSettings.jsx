import React from 'react';
import adminApi from '../../lib/adminApi';

export default function AdminSettings() {
  const [gamification, setGamification] = React.useState({ xpPerLesson: 10, badgeThreshold: 100, streakDays: 7 });
  const [localization, setLocalization] = React.useState({
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'ne'],
    labels: { en: { welcome: 'Welcome' }, ne: { welcome: 'Swagat cha' } }
  });
  const [saved, setSaved] = React.useState('');
  const [seeding, setSeeding] = React.useState(false);
  const [seedMsg, setSeedMsg] = React.useState('');

  React.useEffect(() => {
    Promise.all([adminApi.get('/settings/gamification'), adminApi.get('/settings/localization')])
      .then(([g, l]) => {
        setGamification(g.data);
        setLocalization(l.data);
      })
      .catch(() => null);
  }, []);

  async function saveGamification(e) {
    e.preventDefault();
    await adminApi.put('/settings/gamification', gamification);
    setSaved('Gamification settings saved');
    setTimeout(() => setSaved(''), 2000);
  }

  async function saveLocalization(e) {
    e.preventDefault();
    await adminApi.put('/settings/localization', localization);
    setSaved('Localization settings saved');
    setTimeout(() => setSaved(''), 2000);
  }

  async function seedLibrary(force = false) {
    setSeedMsg('');
    setSeeding(true);
    try {
      const res = await adminApi.post('/seed/library', { force });
      if (res.data?.skipped) setSeedMsg(`Skipped: ${res.data.reason || 'already seeded'}`);
      else setSeedMsg(`Seeded: ${res.data.coursesCreated || 0} courses, ${res.data.skillPathsCreated || 0} skill paths`);
    } catch (err) {
      setSeedMsg(err.response?.data?.error || 'Failed to seed library');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="space-y-6">
      {saved && <div className="rounded bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{saved}</div>}
      {seedMsg && <div className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">{seedMsg}</div>}

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">Gamification Settings</h3>
        <form onSubmit={saveGamification} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input type="number" className="rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" value={gamification.xpPerLesson} onChange={(e) => setGamification((v) => ({ ...v, xpPerLesson: Number(e.target.value) }))} placeholder="XP per lesson" />
          <input type="number" className="rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" value={gamification.badgeThreshold} onChange={(e) => setGamification((v) => ({ ...v, badgeThreshold: Number(e.target.value) }))} placeholder="Badge threshold" />
          <input type="number" className="rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" value={gamification.streakDays} onChange={(e) => setGamification((v) => ({ ...v, streakDays: Number(e.target.value) }))} placeholder="Streak days" />
          <button className="rounded bg-slate-900 px-4 py-2 text-white dark:bg-slate-100 dark:text-slate-900 md:col-span-3">Save Gamification</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">Localization Control</h3>
        <form onSubmit={saveLocalization} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">Default Language</label>
            <select className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" value={localization.defaultLanguage} onChange={(e) => setLocalization((v) => ({ ...v, defaultLanguage: e.target.value }))}>
              <option value="en">English</option>
              <option value="ne">Nepali</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">English Welcome Label</label>
            <input className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" value={localization.labels?.en?.welcome || ''} onChange={(e) => setLocalization((v) => ({ ...v, labels: { ...v.labels, en: { ...(v.labels?.en || {}), welcome: e.target.value } } }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Nepali Welcome Label</label>
            <input className="w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" value={localization.labels?.ne?.welcome || ''} onChange={(e) => setLocalization((v) => ({ ...v, labels: { ...v.labels, ne: { ...(v.labels?.ne || {}), welcome: e.target.value } } }))} />
          </div>
          <button className="rounded bg-slate-900 px-4 py-2 text-white dark:bg-slate-100 dark:text-slate-900">Save Localization</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-2 text-lg font-semibold">Course Library</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Import a curated set of real course links (MDN, React, Node, Express, MongoDB University, GitHub Docs) so the app is not empty for demos.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            disabled={seeding}
            onClick={() => seedLibrary(false)}
            className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
          >
            {seeding ? 'Seeding...' : 'Seed Real Courses'}
          </button>
          <button
            disabled={seeding}
            onClick={() => seedLibrary(true)}
            className="rounded border border-slate-300 px-4 py-2 text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:text-slate-100"
          >
            Force Reseed
          </button>
        </div>
      </section>
    </div>
  );
}
