import React from 'react';
import adminApi from '../../lib/adminApi';

export default function AdminCertificates() {
  const [items, setItems] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [verifyId, setVerifyId] = React.useState('');
  const [verifyResult, setVerifyResult] = React.useState(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  async function load() {
    const res = await adminApi.get('/certificates', { params: { page, search } });
    setItems(res.data.items);
    setTotalPages(res.data.totalPages);
  }

  React.useEffect(() => {
    load().catch(() => null);
  }, [page]);

  async function verify(e) {
    e.preventDefault();
    try {
      const res = await adminApi.get(`/certificates/verify/${verifyId}`);
      setVerifyResult(res.data);
    } catch (err) {
      setVerifyResult(err.response?.data || { valid: false, message: 'Not found' });
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">Verify Certificate ID</h3>
        <form onSubmit={verify} className="flex flex-col gap-2 sm:flex-row">
          <input className="flex-1 rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" value={verifyId} onChange={(e) => setVerifyId(e.target.value)} placeholder="Enter certificate ID" required />
          <button className="rounded bg-slate-900 px-4 py-2 text-white dark:bg-slate-100 dark:text-slate-900">Verify</button>
        </form>
        {verifyResult && (
          <div className={`mt-3 rounded px-3 py-2 text-sm ${verifyResult.valid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
            {verifyResult.valid ? `Valid certificate for ${verifyResult.certificate.user?.name || 'User'} (${verifyResult.certificate.course?.title || 'Course'})` : verifyResult.message || 'Invalid'}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <form
          className="mb-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setPage(1);
            await load();
          }}
        >
          <input className="flex-1 rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" placeholder="Search by user/course/certificate..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="rounded bg-slate-900 px-4 py-2 text-white dark:bg-slate-100 dark:text-slate-900">Search</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-2 py-2">Certificate ID</th>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Course</th>
                <th className="px-2 py-2">Issued At</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b border-slate-100 dark:border-slate-800/70">
                  <td className="px-2 py-2">{item.certificateId}</td>
                  <td className="px-2 py-2">{item.user?.name || item.user?.email || '-'}</td>
                  <td className="px-2 py-2">{item.course?.title || '-'}</td>
                  <td className="px-2 py-2">{new Date(item.issuedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-2 py-4 text-slate-500" colSpan={4}>
                    No certificates found.
                  </td>
                </tr>
              )}
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
    </div>
  );
}
