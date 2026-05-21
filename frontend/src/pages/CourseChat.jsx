import React from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { resolveAssetUrl } from '../lib/assets';

function bubbleClass(isMine) {
  return isMine
    ? 'bg-indigo-600 text-white'
    : 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100';
}

export default function CourseChat() {
  const { id: courseId } = useParams();
  const [me, setMe] = React.useState(null);
  const [course, setCourse] = React.useState(null);
  const [thread, setThread] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef(null);

  async function loadMessages(threadId) {
    const res = await apiFetch(`/chat/threads/${encodeURIComponent(threadId)}/messages?limit=100`);
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

        const [meRes, courseRes] = await Promise.all([apiFetch('/auth/me'), apiFetch(`/courses/${encodeURIComponent(courseId)}`)]);
        const meData = await meRes.json().catch(() => ({}));
        const courseData = await courseRes.json().catch(() => ({}));
        if (!meRes.ok) throw new Error(meData?.error || 'Please log in');
        if (!courseRes.ok) throw new Error(courseData?.error || 'Failed to load course');
        if (!mounted) return;
        setMe(meData.user || null);
        setCourse(courseData.course || null);

        const tRes = await apiFetch('/chat/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId })
        });
        const tData = await tRes.json().catch(() => ({}));
        if (!tRes.ok) throw new Error(tData?.error || 'Failed to start chat');
        if (!mounted) return;
        setThread(tData.thread || null);
        if (tData.thread?._id) await loadMessages(tData.thread._id);
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load chat');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  React.useEffect(() => {
    if (!thread?._id) return;
    let cancelled = false;
    const t = setInterval(() => {
      if (cancelled) return;
      loadMessages(thread._id).catch(() => null);
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [thread?._id]);

  React.useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [items.length]);

  async function send() {
    if (!thread?._id) return;
    const msg = String(text || '').trim();
    if (!msg) return;
    try {
      setSending(true);
      const res = await apiFetch(`/chat/threads/${encodeURIComponent(thread._id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to send');
      setText('');
      await loadMessages(thread._id);
    } catch (err) {
      setError(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  const mentor = course?.instructorId || thread?.mentor || null;
  const mentorName = String(mentor?.name || 'Mentor');
  const mentorAvatar = resolveAssetUrl(mentor?.avatarUrl || '');

  if (loading) {
    return (
      <Card className="p-5">
        <div className="text-sm text-slate-600 dark:text-slate-300">Loading chat...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Chat unavailable</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => (window.location.href = `/courses/${encodeURIComponent(courseId)}`)}>
            Back to course
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {course?.title || 'Course Chat'}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            {mentorAvatar ? <img src={mentorAvatar} alt={mentorName} className="h-6 w-6 rounded-full object-cover" /> : null}
            <span className="truncate">Mentor: {mentorName}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => (window.location.href = `/courses/${encodeURIComponent(courseId)}`)}>
            Back to course
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div ref={listRef} className="h-[55vh] overflow-auto p-4">
          <div className="space-y-3">
            {items.map((m) => {
              const mine = me?._id && String(m?.sender?._id || '') === String(me._id);
              return (
                <div key={m._id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={['max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm', bubbleClass(mine)].join(' ')}>
                    {!mine ? (
                      <div className="mb-1 text-[11px] font-semibold opacity-80">{m?.sender?.name || 'Mentor'}</div>
                    ) : null}
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className="mt-1 text-[10px] opacity-70">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
              );
            })}
            {items.length === 0 ? (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Say hi to your mentor. Messages update every few seconds.
              </div>
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
            <Button type="submit" variant="primary" disabled={sending || !text.trim()}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

