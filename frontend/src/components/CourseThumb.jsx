import React from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '../lib/cn';
import { resolveAssetUrl } from '../lib/assets';

function palette(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('frontend')) return 'from-indigo-600 to-fuchsia-600';
  if (c.includes('backend')) return 'from-emerald-600 to-cyan-600';
  if (c.includes('database')) return 'from-amber-600 to-orange-600';
  if (c.includes('tools')) return 'from-slate-700 to-indigo-600';
  if (c.includes('web fundamentals')) return 'from-violet-600 to-amber-500';
  return 'from-sky-600 to-indigo-600';
}

export default function CourseThumb({ course, className }) {
  const title = course?.title || 'Course';
  const url = resolveAssetUrl(course?.thumbnailUrl || '');
  const gradient = palette(course?.category);

  if (url) {
    return <img src={url} alt={title} className={cn('w-full object-cover', className)} />;
  }

  return (
    <div className={cn('relative flex w-full items-center justify-center overflow-hidden', className)}>
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', gradient)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_50%)]" />
      <div className="relative flex flex-col items-center gap-2 px-4 text-center text-white">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
          <BookOpen size={18} />
        </span>
        <div className="line-clamp-2 text-xs font-extrabold tracking-wide drop-shadow-sm">{title}</div>
      </div>
    </div>
  );
}
