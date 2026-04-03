import React from 'react';
import adminApi from '../../lib/adminApi';

function StatusPill({ status }) {
  const s = String(status || 'none');
  const cls =
    s === 'active'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
      : s === 'pending' || s === 'initiated'
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
        : s === 'failed' || s === 'canceled' || s === 'refunded'
          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200';

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${cls}`}>
      {s}
    </span>
  );
}

function formatMoneyPaisa(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '-';
  return `NPR ${(n / 100).toFixed(2)}`;
}

export default function AdminSubscriptions() {
  const [tab, setTab] = React.useState('subscriptions'); // subscriptions | payments

  const [subs, setSubs] = React.useState({ items: [], page: 1, totalPages: 1, total: 0 });
  const [pays, setPays] = React.useState({ items: [], page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');

  async function loadSubscriptions(nextPage = 1) {
    const params = new URLSearchParams();
    params.set('page', String(nextPage));
    params.set('limit', '20');
    if (search.trim()) params.set('search', search.trim());
    if (status && status !== 'all') params.set('status', status);
    const res = await adminApi.get(`/subscriptions?${params.toString()}`);
    setSubs(res.data);
  }

  async function loadPayments(nextPage = 1) {
    const params = new URLSearchParams();
    params.set('page', String(nextPage));
    params.set('limit', '20');
    if (search.trim()) params.set('search', search.trim());
    if (status && status !== 'all') params.set('status', status);
    params.set('provider', 'khalti');
    const res = await adminApi.get(`/payments?${params.toString()}`);
    setPays(res.data);
  }

  async function load() {
    try {
      setLoading(true);
      setError('');
      if (tab === 'subscriptions') await loadSubscriptions(1);
      else await loadPayments(1);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const pageState = tab === 'subscriptions' ? subs : pays;
  const items = Array.isArray(pageState.items) ? pageState.items : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Track user subscription status and Khalti payments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('subscriptions')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === 'subscriptions'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            Subscriptions
          </button>
          <button
            type="button"
            onClick={() => setTab('payments')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === 'payments'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            Payments
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tab === 'subscriptions' ? 'Search name/email…' : 'Search email/pidx/order id…'}
          className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="all">All</option>
          {tab === 'subscriptions' ? (
            <>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="none">None</option>
              <option value="canceled">Canceled</option>
              <option value="past_due">Past due</option>
            </>
          ) : (
            <>
              <option value="initiated">Initiated</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="canceled">Canceled</option>
              <option value="refunded">Refunded</option>
            </>
          )}
        </select>
        <button
          type="button"
          onClick={load}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
        >
          Apply
        </button>
      </div>

      {error ? <div className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 text-sm text-slate-600 dark:text-slate-300">Loading…</div>
          ) : tab === 'subscriptions' ? (
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Period End</th>
                  <th className="px-4 py-3">Last Payment</th>
                  <th className="px-4 py-3">Active?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((u) => {
                  const s = u?.subscription || {};
                  const end = s.currentPeriodEnd ? new Date(s.currentPeriodEnd) : null;
                  const isActive = s.status === 'active' && end && end > new Date();
                  const lp = s.lastPaymentId || null;
                  return (
                    <tr key={u._id}>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{u.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{u.email}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={s.status || 'none'} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{end ? end.toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {lp ? `${lp.provider || '—'} ${formatMoneyPaisa(lp.amount)} (${lp.status})` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-extrabold ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {isActive ? 'YES' : 'NO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-sm text-slate-600 dark:text-slate-300">
                      No results.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">pidx</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((p) => (
                  <tr key={p._id}>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{p.user?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{p.user?.email || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{formatMoneyPaisa(p.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{String(p.pidx || '').slice(0, 22) || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{p.purchaseOrderId || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-sm text-slate-600 dark:text-slate-300">
                      No results.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Page {pageState.page || 1} / {pageState.totalPages || 1} • Total {pageState.total || 0}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={(pageState.page || 1) <= 1 || loading}
            onClick={async () => {
              setLoading(true);
              try {
                if (tab === 'subscriptions') await loadSubscriptions((pageState.page || 1) - 1);
                else await loadPayments((pageState.page || 1) - 1);
              } catch (e) {
                setError(e?.response?.data?.error || e.message || 'Failed');
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={(pageState.page || 1) >= (pageState.totalPages || 1) || loading}
            onClick={async () => {
              setLoading(true);
              try {
                if (tab === 'subscriptions') await loadSubscriptions((pageState.page || 1) + 1);
                else await loadPayments((pageState.page || 1) + 1);
              } catch (e) {
                setError(e?.response?.data?.error || e.message || 'Failed');
              } finally {
                setLoading(false);
              }
            }}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-slate-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

