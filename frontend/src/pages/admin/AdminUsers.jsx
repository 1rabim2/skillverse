import React from 'react';
import adminApi from '../../lib/adminApi';

export default function AdminUsers() {
  const [users, setUsers] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  async function load() {
    const res = await adminApi.get('/users', { params: { page, search } });
    setUsers(res.data.items);
    setTotalPages(res.data.totalPages);
  }

  React.useEffect(() => {
    load().catch(() => null);
  }, [page]);

  async function viewUser(id) {
    const res = await adminApi.get(`/users/${id}`);
    setSelected(res.data);
  }

  async function toggleStatus(user) {
    await adminApi.patch(`/users/${user._id}/status`, { isActive: !user.isActive });
    await load();
    if (selected?._id === user._id) await viewUser(user._id);
  }

  async function remove(user) {
    if (!window.confirm(`Delete user ${user.email}?`)) return;
    await adminApi.delete(`/users/${user._id}`);
    if (selected?._id === user._id) setSelected(null);
    await load();
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <form
          className="mb-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setPage(1);
            await load();
          }}
        >
          <input className="flex-1 rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="rounded bg-slate-900 px-4 py-2 text-white dark:bg-slate-100 dark:text-slate-900">Search</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-slate-100 dark:border-slate-800/70">
                  <td className="px-2 py-2">{user.name || '-'}</td>
                  <td className="px-2 py-2">{user.email}</td>
                  <td className="px-2 py-2">{user.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => viewUser(user._id)} className="rounded bg-sky-600 px-2 py-1 text-xs text-white">View</button>
                      <button onClick={() => toggleStatus(user)} className="rounded bg-amber-500 px-2 py-1 text-xs text-white">
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => remove(user)} className="rounded bg-red-600 px-2 py-1 text-xs text-white">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} / {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40 dark:border-slate-700">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40 dark:border-slate-700">Next</button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">User Profile</h3>
        {!selected && <p className="text-sm text-slate-500">Select a user to view details.</p>}
        {selected && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">{selected.name || '-'}</p>
              <p className="text-slate-500">{selected.email}</p>
            </div>
            <div>
              <p className="font-medium">Enrolled Courses</p>
              <ul className="list-disc pl-5">
                {(selected.enrolledCourses || []).map((c) => (
                  <li key={c._id}>{c.title}</li>
                ))}
                {(selected.enrolledCourses || []).length === 0 && <li>None</li>}
              </ul>
            </div>
            <div>
              <p className="font-medium">Progress</p>
              <ul className="list-disc pl-5">
                {(selected.progress || []).map((p, idx) => (
                  <li key={`${p.course?._id || idx}-${idx}`}>
                    {p.course?.title || 'Course'}: {p.percent || 0}%
                  </li>
                ))}
                {(selected.progress || []).length === 0 && <li>No progress yet</li>}
              </ul>
            </div>
            <div>
              <p className="font-medium">Certificates</p>
              <ul className="list-disc pl-5">
                {(selected.certificates || []).map((c, idx) => (
                  <li key={`${c.certificateId || idx}-${idx}`}>{c.certificateId || 'N/A'} ({c.course?.title || 'Course'})</li>
                ))}
                {(selected.certificates || []).length === 0 && <li>None</li>}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
