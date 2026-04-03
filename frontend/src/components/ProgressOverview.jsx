import React from 'react';
import Card from './ui/Card';

function Metric({ label, value, hint }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {value}
      </div>
      {hint ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{hint}</div> : null}
    </Card>
  );
}

export default function ProgressOverview({ stats }) {
  const progress = Number(stats?.avgProgress || 0);
  const xp = Number(stats?.xp || 0);
  const badges = Number(stats?.badgesCount || 0);

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Course Progress
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Completed <span className="font-extrabold text-slate-900 dark:text-white">{progress}%</span> of your current learning progress.
            </div>
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{progress}%</div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </Card>

      <Metric label="XP" value={xp.toLocaleString()} hint="Points earned from lessons and quizzes." />
      <Metric label="Badges" value={badges.toLocaleString()} hint="Achievements unlocked so far." />
    </section>
  );
}
