import React from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function StatusPill({ status, t }) {
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
      {t(`subscribe.statuses.${s}`, s)}
    </span>
  );
}

function formatMoneyPaisa(amount, locale) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '-';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2
  }).format(n / 100);
}

export default function Subscribe() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-US';
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
      if (!res1.ok) throw new Error(data1?.error || t('subscribe.errors.loadSubscription'));
      if (!res2.ok) throw new Error(data2?.error || t('subscribe.errors.loadPayments'));
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
      if (!res.ok) throw new Error(data?.error || t('subscribe.errors.startPayment'));
      if (!data?.paymentUrl) throw new Error(t('subscribe.errors.missingPaymentUrl'));
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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t('subscribe.title')}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('subscribe.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={busy}>
            {t('subscribe.refresh')}
          </Button>
          {lastPidx ? (
            <Button variant="outline" as="a" href={`/subscribe/return?pidx=${encodeURIComponent(lastPidx)}`}>
              {t('subscribe.checkLastPayment')}
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
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">{t('subscribe.yourPlan')}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('subscribe.planName')}</div>
            </div>
            <StatusPill status={loading ? 'loading' : status} t={t} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('subscribe.access')}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {loading ? t('subscribe.checking') : status === 'active' ? t('subscribe.unlocked') : t('subscribe.locked')}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('subscribe.accessHint')}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('subscribe.expires')}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {loading ? '-' : end ? end.toLocaleString(locale) : '-'}
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('subscribe.renewHint')}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={busy || loading} onClick={startKhalti}>
              {busy ? t('subscribe.redirecting') : status === 'active' ? t('subscribe.renew') : t('subscribe.subscribeMonthly')}
            </Button>
            <Button variant="outline" as="a" href="/courses">
              {t('subscribe.browseCourses')}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">{t('subscribe.whatYouGet')}</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {t('subscribe.benefits', { returnObjects: true }).map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-indigo-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
            {t('subscribe.emailUpdates')}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">{t('subscribe.paymentHistory')}</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('subscribe.paymentHistorySub')}</div>

        {loading ? (
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t('subscribe.loading')}</div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">{t('subscribe.table.status')}</th>
                    <th className="px-4 py-3">{t('subscribe.table.amount')}</th>
                    <th className="px-4 py-3">{t('subscribe.table.provider')}</th>
                    <th className="px-4 py-3">pidx</th>
                    <th className="px-4 py-3">{t('subscribe.table.date')}</th>
                    <th className="px-4 py-3 text-right">{t('subscribe.table.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {payments.map((p) => (
                    <tr key={p._id} className="text-sm">
                      <td className="px-4 py-3">
                        <StatusPill status={p.status} t={t} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{formatMoneyPaisa(p.amount, locale)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.provider || '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{String(p.pidx || '').slice(0, 18) || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.createdAt ? new Date(p.createdAt).toLocaleString(locale) : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        {p.pidx ? (
                          <Button variant="outline" as="a" href={`/subscribe/return?pidx=${encodeURIComponent(String(p.pidx))}`}>
                            {t('subscribe.check')}
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
                        {t('subscribe.noPayments')}
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
