import React from 'react';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ForgotPassword() {
  const [email, setEmail] = React.useState('');
  const [out, setOut] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    setOut('');
    setBusy(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.verifyLink) setOut(`Verification link (dev): ${data.verifyLink}`);
      else if (data.resetLink) setOut(`Reset link (dev): ${data.resetLink}`);
      else setOut(data.message || JSON.stringify(data, null, 2));
    } catch (err) {
      setOut(`Network error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Forgot password</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Enter your email and we will send a reset link (or a verification link if your account is not verified).
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@example.com" />
          </div>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
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
