import React from 'react';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Verify() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState(token || '');
  const [out, setOut] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (token && !code) {
      setCode(token);
    }
  }, [token, code]);

  async function verify(e) {
    e.preventDefault();
    if (!email || !code) {
      setOut('Email and code required');
      return;
    }
    try {
      setBusy(true);
      setOut('');
      const res = await apiFetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (res.ok) {
        setOut('Email verified. You can now log in.');
      } else {
        setOut(data.error || 'Verification failed');
      }
    } catch (err) {
      setOut(`Network error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Email verification</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Enter your email and the verification code sent to your email.
        </div>
        <form onSubmit={verify} className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Verification Code</div>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} type="text" placeholder="123456" required />
          </div>
          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify Account'}
          </Button>
        </form>
        <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          {out}
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
