import React from 'react';
import { apiFetch } from '../../lib/apiFetch';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { resolveAssetUrl } from '../../lib/assets';

function ThreadItem({ thread, active, onClick }) {
  const student = thread?.student || null;
  const course = thread?.course || null;
  const name = String(student?.name || student?.email || 'Student');
  const avatar = resolveAssetUrl(student?.avatarUrl || '');
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full rounded-2xl border p-3 text-left transition-colors',
        active
          ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/20'
          : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        {avatar ? (
          <img src={avatar} alt={name} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-sm font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {initial || 'S'}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{name}</div>
          <div className="truncate text-xs text-slate-600 dark:text-slate-300">{course?.title || 'Course'}</div>
          {thread?.lastMessageText ? (
            <div className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">{thread.lastMessageText}</div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export default function InstructorMessages() {
  const [threads, setThreads] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef(null);

  async function loadThreads() {
    const res = await apiFetch('/chat/threads');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to load threads');
    const next = Array.isArray(data.items) ? data.items : [];
    setThreads(next);
    if (!selected && next[0]) setSelected(next[0]);
  }

  async function loadMessages(threadId) {
    const res = await apiFetch(`/chat/threads/${encodeURIComponent(threadId)}/messages?limit=120`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to load messages');
    setItems(Array.isArray(data.items) ? data.items : []);
  }

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        await loadThreads();
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load messages');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!selected?._id) return;
    loadMessages(selected._id).catch((err) => setError(err?.message || 'Failed to load messages'));
  }, [selected?._id]);

  React.useEffect(() => {
    if (!selected?._id) return;
    let cancelled = false;
    const t = setInterval(() => {
      if (cancelled) return;
      loadThreads().catch(() => null);
      loadMessages(selected._id).catch(() => null);
    }, 6000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id]);

  React.useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [items.length, selected?._id]);

  async function send() {
    if (!selected?._id) return;
    const msg = String(text || '').trim();
    if (!msg) return;
    try {
      setSending(true);
      setError('');
      const res = await apiFetch(`/chat/threads/${encodeURIComponent(selected._id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to send');
      setText('');
      await loadMessages(selected._id);
      await loadThreads();
    } catch (err) {
      setError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-5">
        <div className="text-sm text-slate-600 dark:text-slate-300">Loading messages...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Messages</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Chat with students enrolled in your courses.</div>
        </div>
        <Button variant="outline" onClick={() => loadThreads().catch(() => null)}>
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="p-4">
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="p-4">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Threads</div>
          <div className="mt-3 space-y-2">
            {threads.map((t) => (
              <ThreadItem key={t._id} thread={t} active={String(selected?._id) === String(t._id)} onClick={() => setSelected(t)} />
            ))}
            {threads.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
                No chat threads yet.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
              {selected?.course?.title || 'Select a thread'}
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Student: {selected?.student?.name || selected?.student?.email || '—'}
            </div>
          </div>
          <div ref={listRef} className="h-[55vh] overflow-auto p-4">
            <div className="space-y-3">
              {items.map((m) => {
                const mine = String(m?.sender?.role || '').toLowerCase() === 'instructor';
                return (
                  <div key={m._id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                    <div
                      className={[
                        'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm shadow-sm',
                        mine
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100'
                      ].join(' ')}
                    >
                      {!mine ? (
                        <div className="mb-1 text-[11px] font-semibold opacity-80">{m?.sender?.name || 'Student'}</div>
                      ) : null}
                      <div>{m.text}</div>
                      <div className="mt-1 text-[10px] opacity-70">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</div>
                    </div>
                  </div>
                );
              })}
              {selected && items.length === 0 ? (
                <div className="text-sm text-slate-600 dark:text-slate-300">No messages yet.</div>
              ) : null}
            </div>
          </div>
          <div className="border-t border-slate-200 p-3 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." className="flex-1" />
              <Button type="submit" variant="primary" disabled={sending || !text.trim() || !selected?._id}>
                {sending ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}

