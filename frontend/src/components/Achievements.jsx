import React from 'react';
import { Award } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

export default function Achievements({ badges = [] }) {
  return (
    <Card as="aside" className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold">Achievements</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Badges you have unlocked.
          </div>
        </div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
          <Award size={18} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {badges.map((name, idx) => (
          <div
            key={`${name}-${idx}`}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950/20"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
              <Award size={16} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Unlocked</div>
            </div>
          </div>
        ))}
        {badges.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
            No badges yet. Complete a course to earn your first badge.
          </div>
        )}
      </div>

      <div className="mt-4">
        <Button variant="outline" onClick={() => (window.location.href = '/portfolio')}>
          View portfolio
        </Button>
      </div>
    </Card>
  );
}
