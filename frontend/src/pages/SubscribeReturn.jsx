import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function SubscribeReturn() {
  const q = useQuery();
  const pidx = String(q.get('pidx') || '').trim();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [providerStatus, setProviderStatus] = React.useState('');
  const [sub, setSub] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;
    async function verify() {
      if (!pidx) return;
      try {
        setLoading(true);
        setError('');
        const res = await apiFetch('/payments/khalti/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pidx })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Verification failed');
        if (!mounted) return;
        setStatus(String(data?.status || ''));
        setProviderStatus(String(data?.providerStatus || ''));
        setSub(data?.subscription || null);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    verify();
    return () => {
      mounted = false;
    };
  }, [pidx]);

  return (
    <div className="grid min-h-[60vh] place-items-center p-4">
      <Card className="w-full max-w-xl p-6">
        <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Payment status</div>
        {!pidx ? (
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Missing `pidx` in the URL.</div>
        ) : loading ? (
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Verifying payment…</div>
        ) : error ? (
          <div className="mt-3 text-sm font-semibold text-red-600 dark:text-red-300">{error}</div>
        ) : (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-100">
            <div>
              Status: <span className="font-extrabold">{status || 'unknown'}</span>
            </div>
            {providerStatus ? (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Provider status: {providerStatus}</div>
            ) : null}
            {sub?.currentPeriodEnd ? (
              <div className="mt-2 text-slate-600 dark:text-slate-300">
                Active until: {new Date(sub.currentPeriodEnd).toLocaleString()}
              </div>
            ) : null}
            {status && status !== 'completed' ? (
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                If it’s still pending, wait a minute and refresh on the subscription page.
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button as={Link} to="/subscribe">
            Back to subscription
          </Button>
          <Button variant="outline" as={Link} to="/dashboard">
            Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}

