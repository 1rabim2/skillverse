import React from 'react';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const [password, setPassword] = React.useState('');
  const [out, setOut] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    setOut('');
    setBusy(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      setOut(JSON.stringify(data, null, 2));
    } catch (err) {
      setOut(`Network error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="grid min-h-[70vh] place-items-center p-4">
        <Card className="w-full max-w-md p-6">
          <div className="text-lg font-extrabold tracking-tight">Reset password</div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">No token provided in the URL.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid min-h-[70vh] place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Reset password</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">Choose a new password for your account.</div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">New password</div>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
            <div className="text-xs text-slate-500 dark:text-slate-400">Minimum 8 characters.</div>
          </div>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Updating…' : 'Reset password'}
          </Button>
        </form>

        {out ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
            <pre className="whitespace-pre-wrap">{out}</pre>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
