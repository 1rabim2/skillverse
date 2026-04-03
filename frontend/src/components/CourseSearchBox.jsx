import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';
import Input from './ui/Input';

function uniqById(items) {
  const seen = new Set();
  return (items || []).filter((it) => {
    const id = it && (it._id || it.id);
    if (!id) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export default function CourseSearchBox({
  value,
  onChange,
  onSubmit,
  onPickCourse,
  placeholder = 'Search courses...',
  className = ''
}) {
  const rootRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [active, setActive] = React.useState(-1);

  React.useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  React.useEffect(() => {
    const q = String(value || '').trim();
    setActive(-1);
    if (!open) return;
    if (q.length < 2) {
      setItems([]);
      setBusy(false);
      return;
    }

    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        setBusy(true);
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '6');
        params.set('search', q);
        const res = await apiFetch(`/courses?${params.toString()}`, { signal: ac.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setItems([]);
          return;
        }
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(uniqById(list));
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setItems([]);
      } finally {
        setBusy(false);
      }
    }, 220);

    return () => {
      ac.abort();
      clearTimeout(t);
    };
  }, [value, open]);

  function submitNow() {
    const q = String(value || '').trim();
    setOpen(false);
    onSubmit?.(q);
  }

  function pickCourse(courseId) {
    if (!courseId) return;
    setOpen(false);
    onPickCourse?.(courseId);
  }

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((idx) => Math.min(items.length - 1, idx + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((idx) => Math.max(-1, idx - 1));
      return;
    }
    if (e.key === 'Enter') {
      if (active >= 0 && active < items.length) {
        e.preventDefault();
        pickCourse(items[active]?._id || items[active]?.id);
      } else {
        e.preventDefault();
        submitNow();
      }
    }
  }

  const q = String(value || '').trim();
  const show = open && (q.length >= 1);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Search size={16} />
        </span>
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="pl-10"
        />
        {busy ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
          </span>
        ) : null}
      </div>

      {show ? (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={submitNow}
          >
            <span className="font-semibold text-slate-900 dark:text-white">
              Search for “{q || '…'}”
            </span>
            <span className="text-xs text-slate-500">Enter</span>
          </button>

          {q.length < 2 ? (
            <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              Type at least 2 characters for suggestions.
            </div>
          ) : items.length === 0 && !busy ? (
            <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
              No matching courses found.
            </div>
          ) : (
            <div className="border-t border-slate-100 dark:border-slate-800">
              {items.map((c, idx) => {
                const id = c._id || c.id;
                const activeRow = idx === active;
                return (
                  <button
                    key={id}
                    type="button"
                    className={[
                      'flex w-full flex-col gap-1 px-4 py-3 text-left',
                      'hover:bg-slate-50 dark:hover:bg-slate-800',
                      activeRow ? 'bg-slate-50 dark:bg-slate-800' : ''
                    ].join(' ')}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => pickCourse(id)}
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{c.title || 'Untitled course'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {(c.level || 'Beginner') + ' • ' + (c.category || 'General')}
                      {c.skillPath?.title ? ` • ${c.skillPath.title}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
