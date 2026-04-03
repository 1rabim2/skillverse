import React from 'react';
import adminApi from '../../lib/adminApi';

function StatusPill({ status }) {
  const value = String(status || 'approved').toLowerCase();
  const map = {
    approved: { label: 'Approved', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', fg: '#065f46' },
    pending: { label: 'Pending', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.25)', fg: '#92400e' },
    removed: { label: 'Removed', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.22)', fg: '#991b1b' }
  };
  const cfg = map[value] || map.approved;
  return (
    <span
      className="text-xs"
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.fg,
        fontWeight: 700
      }}
    >
      {cfg.label}
    </span>
  );
}

export default function AdminCommunity() {
  const [posts, setPosts] = React.useState([]);
  const [onlyReported, setOnlyReported] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [busyId, setBusyId] = React.useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.get('/community', { params: { reported: onlyReported } });
      setPosts(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load community posts');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load().catch(() => null);
  }, [onlyReported]);

  async function approve(id) {
    setBusyId(id);
    setError('');
    try {
      await adminApi.patch(`/community/${id}/approve`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Approve failed');
    } finally {
      setBusyId('');
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this post?')) return;
    setBusyId(id);
    setError('');
    try {
      await adminApi.delete(`/community/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Delete failed');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Community Moderation</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyReported} onChange={(e) => setOnlyReported(e.target.checked)} />
          Show reported only
        </label>
      </div>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}
      <div className="space-y-3">
        {loading && <p className="text-sm text-slate-500">Loading...</p>}
        {posts.map((post) => (
          <div key={post._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{post.authorName}</p>
                  <StatusPill status={post.status} />
                  {post.reported && (
                    <span className="text-xs font-semibold text-red-700 dark:text-red-300">Reported</span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {(post.comments || []).length} comments
                  </span>
                </div>
                <p className="text-sm text-slate-500">{new Date(post.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                {String(post.status || '').toLowerCase() !== 'approved' ? (
                  <button
                    type="button"
                    disabled={busyId === post._id}
                    onClick={() => approve(post._id)}
                    className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                  >
                    {busyId === post._id ? 'Approving...' : 'Approve'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-80"
                  >
                    Approved
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === post._id}
                  onClick={() => remove(post._id)}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                >
                  {busyId === post._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm">{post.content}</p>
            {(post.comments || []).length > 0 && (
              <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-sm dark:border-slate-800">
                {post.comments.map((c) => (
                  <div key={c._id} className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                    <span className="font-medium">{c.authorName}:</span> {c.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {posts.length === 0 && <p className="text-sm text-slate-500">No posts to moderate.</p>}
      </div>
    </div>
  );
}
