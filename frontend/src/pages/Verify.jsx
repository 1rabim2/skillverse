import React from 'react';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function Verify() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const [out, setOut] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setOut('No token provided');
      return;
    }
    let mounted = true;
    setBusy(true);
    (async () => {
      try {
        const res = await apiFetch(`/auth/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!mounted) return;
        setOut(JSON.stringify(data, null, 2));
      } catch (err) {
        if (!mounted) return;
        setOut(`Network error: ${err.message}`);
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="grid min-h-[70vh] place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Email verification</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {busy ? 'Verifying…' : 'Verification result:'}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
          <pre className="whitespace-pre-wrap">{out}</pre>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={() => (window.location.href = '/login')}>
            Go to login
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Home
          </Button>
        </div>
      </Card>
    </div>
  );
}
