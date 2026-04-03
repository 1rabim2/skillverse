import React from 'react';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

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

export default function Subscribe() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [sub, setSub] = React.useState(null);
  const [payments, setPayments] = React.useState([]);
  const [busy, setBusy] = React.useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [res1, res2] = await Promise.all([
        apiFetch('/payments/me/subscription'),
        apiFetch('/payments/me/payments?limit=12')
      ]);
      const data1 = await res1.json().catch(() => ({}));
      const data2 = await res2.json().catch(() => ({}));
      if (!res1.ok) throw new Error(data1?.error || 'Failed to load subscription');
      if (!res2.ok) throw new Error(data2?.error || 'Failed to load payments');
      setSub(data1?.subscription || null);
      setPayments(Array.isArray(data2?.items) ? data2.items : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startKhalti() {
    try {
      setBusy(true);
      setError('');
      const res = await apiFetch('/payments/khalti/subscription/monthly/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to start payment');
      if (!data?.paymentUrl) throw new Error('Missing paymentUrl');
      if (data?.pidx) localStorage.setItem('lastPaymentPidx', String(data.pidx));
      window.location.href = data.paymentUrl;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const status = String(sub?.status || 'none');
  const end = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const lastPidx = (() => {
    try {
      return String(localStorage.getItem('lastPaymentPidx') || '').trim();
    } catch {
      return '';
    }
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Subscription</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Monthly plan that unlocks hosted course videos and premium learning features.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={busy}>
            Refresh
          </Button>
          {lastPidx ? (
            <Button variant="outline" as="a" href={`/subscribe/return?pidx=${encodeURIComponent(lastPidx)}`}>
              Check last payment
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card className="p-5">
          <div className="text-sm font-semibold text-red-600 dark:text-red-300">{error}</div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Your plan</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Skillverse Monthly (all courses)</div>
            </div>
            <StatusPill status={loading ? 'loading' : status} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Access</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {loading ? 'Checking…' : status === 'active' ? 'Unlocked' : 'Locked'}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Hosted videos are locked when inactive.</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Expires</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {loading ? '—' : end ? end.toLocaleString() : '—'}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Renew anytime to extend.</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={busy || loading} onClick={startKhalti}>
              {busy ? 'Redirecting…' : status === 'active' ? 'Renew (Add 1 month)' : 'Subscribe (Monthly)'}
            </Button>
            <Button variant="outline" as="a" href="/courses">
              Browse courses
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">What you get</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {['All hosted course videos', 'Quizzes + progress tracking', 'Certificates after completion', 'Community + projects'].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-indigo-600" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
            You’ll receive email updates for initiated/pending/completed payments.
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">Payment history</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recent attempts and successful payments.</div>

        {loading ? (
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Loading…</div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">pidx</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {payments.map((p) => (
                    <tr key={p._id} className="text-sm">
                      <td className="px-4 py-3">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{formatMoneyPaisa(p.amount)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.provider || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{String(p.pidx || '').slice(0, 18) || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {p.pidx ? (
                          <Button variant="outline" as="a" href={`/subscribe/return?pidx=${encodeURIComponent(String(p.pidx))}`}>
                            Check
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-sm text-slate-600 dark:text-slate-300">
                        No payments yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

