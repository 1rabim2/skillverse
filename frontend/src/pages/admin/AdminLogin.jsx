import React from 'react';
import adminApi from '../../lib/adminApi';

export default function AdminLogin() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const googleBtnRef = React.useRef(null);
  const [googleStatus, setGoogleStatus] = React.useState('');
  const googleClientId = React.useMemo(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || '', []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminApi.post('/auth/login', { email, password });
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminData', JSON.stringify(res.data.admin));
      window.location.href = '/admin/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleCredential(credential) {
    try {
      setError('');
      setGoogleStatus('Signing in with Google...');
      const res = await adminApi.post('/auth/google', { credential });
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminData', JSON.stringify(res.data.admin));
      window.location.href = '/admin/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Google login failed');
    } finally {
      setGoogleStatus('');
    }
  }

  React.useEffect(() => {
    if (!googleClientId) return;
    if (!googleBtnRef.current) return;

    let cancelled = false;
    let tries = 0;
    const maxTries = 50;

    function tryInit() {
      if (cancelled) return;
      tries += 1;
      const google = window.google;
      if (google && google.accounts && google.accounts.id) {
        try {
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (resp) => {
              const cred = resp && resp.credential ? resp.credential : '';
              if (!cred) {
                setError('Google sign-in failed: missing credential');
                return;
              }
              onGoogleCredential(cred);
            }
          });
          googleBtnRef.current.innerHTML = '';
          google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'signin_with'
          });
          return;
        } catch (err) {
          setError(`Google sign-in init failed: ${err?.message || String(err)}`);
          return;
        }
      }

      if (tries < maxTries) setTimeout(tryInit, 100);
    }

    tryInit();
    return () => {
      cancelled = true;
    };
  }, [googleClientId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin Login</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Skill Verse control panel access</p>

        {googleClientId && (
          <div className="mt-6 space-y-2">
            <div ref={googleBtnRef} />
            {googleStatus && <div className="text-xs text-slate-500 dark:text-slate-400">{googleStatus}</div>}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <div className="text-xs text-slate-500 dark:text-slate-400">or</div>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
