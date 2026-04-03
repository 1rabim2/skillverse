import React from 'react';
import { cn } from '../../lib/cn';

export default function Card({ as: Comp = 'div', className, ...props }) {
  return (
    <Comp
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...props}
    />
  );
}
