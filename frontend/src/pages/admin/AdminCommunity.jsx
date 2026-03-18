import React from 'react';
import adminApi from '../../lib/adminApi';

export default function AdminCommunity() {
  const [posts, setPosts] = React.useState([]);
  const [onlyReported, setOnlyReported] = React.useState(true);

  async function load() {
    const res = await adminApi.get('/community', { params: { reported: onlyReported } });
    setPosts(res.data);
  }

  React.useEffect(() => {
    load().catch(() => null);
  }, [onlyReported]);

  async function approve(id) {
    await adminApi.patch(`/community/${id}/approve`);
    await load();
  }

  async function remove(id) {
    if (!window.confirm('Delete this post?')) return;
    await adminApi.delete(`/community/${id}`);
    await load();
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
      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{post.authorName}</p>
                <p className="text-sm text-slate-500">{new Date(post.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approve(post._id)} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Approve</button>
                <button onClick={() => remove(post._id)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Delete</button>
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
