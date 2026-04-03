import React from 'react';
import { Sparkles } from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';

export default function MotivationBanner() {
  return (
    <Card className="mt-6 overflow-hidden p-0">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">Keep your momentum</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Small, consistent sessions add up. Pick one lesson and finish it today.
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => (window.location.href = '/courses')}>
            Browse courses
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
            View progress
          </Button>
        </div>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-indigo-600 to-violet-600" />
    </Card>
  );
}

