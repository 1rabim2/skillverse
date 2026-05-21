import React from 'react';
import { cn } from '../../lib/cn';

export default function Card({ as: Comp = 'div', className, ...props }) {
  return (
    <Comp
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/60',
        className
      )}
      {...props}
    />
  );
}
