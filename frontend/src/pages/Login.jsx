import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../lib/apiFetch';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            'rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
            value === opt.value
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Login() {
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname === '/signup' ? 'signup' : 'login'); // login | signup
  const [authMethod, setAuthMethod] = useState('email'); // email | google
  const [role, setRole] = useState('student'); // student | instructor
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [out, setOut] = useState('');
  const [isError, setIsError] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resendOut, setResendOut] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const googleBtnRef = useRef(null);
  const [googleStatus, setGoogleStatus] = useState('');

  const googleClientId = useMemo(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || '', []);

  function clearForm() {
    setName('');
    setEmail('');
    setPassword('');
    setRole('student');
    setOut('');
    setIsError(false);
    setNeedsVerify(false);
    setResendOut('');
    setResendBusy(false);
    setVerificationCode('');
    setVerifying(false);
  }

  async function resendVerification() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) return;
    try {
      setResendBusy(true);
      setResendOut('');
      const res = await apiFetch('/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to resend verification email');
      setResendOut(data?.message || 'Verification code sent (if the account exists and is unverified).');
    } catch (err) {
      setResendOut(err.message || 'Failed to resend verification email');
    } finally {
      setResendBusy(false);
    }
  }

  async function verifyCode() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !verificationCode) return;
    try {
      setVerifying(true);
      setOut('');
      const res = await apiFetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, code: verificationCode })
      });
      const data = await res.json();
      if (res.ok) {
        setOut('Account verified! You can now log in.');
        setNeedsVerify(false);
        setVerificationCode('');
      } else {
        setIsError(true);
        setOut(data.error || 'Verification failed');
      }
    } catch (err) {
      setIsError(true);
      setOut(`Network error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    const nextMode = location.pathname === '/signup' ? 'signup' : 'login';
    setMode(nextMode);
    clearForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!googleClientId) {
      setAuthMethod('email');
      return;
    }
    setAuthMethod(mode === 'signup' ? 'google' : 'email');
  }, [googleClientId, mode]);

  async function onGoogleCredential(credential) {
    try {
      setIsError(false);
      setOut('');
      setNeedsVerify(false);
      setResendOut('');
      setGoogleStatus('Signing in with Google…');


      const res = await apiFetch('/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, role: mode === 'signup' ? role : undefined })
      });
      const data = await res.json();

      if (res.ok) {
        setIsError(false);
        if (res.status === 201) {
          // New account created - needs email verification
          setOut('Account created! Please check your email to verify your account.');
          setNeedsVerify(true);
        } else {
          // Existing account - logged in
          const nextRole = data?.user?.role || 'student';
          if (nextRole === 'admin') window.location.href = '/admin/dashboard';
          else if (nextRole === 'instructor') window.location.href = '/instructor/dashboard';
          else window.location.href = '/dashboard';
        }
        return;
      }

      const verifyRequired = res.status === 403 && String(data?.error || '').toLowerCase().includes('verify');
      if (verifyRequired) setNeedsVerify(true);
      setIsError(true);
      setOut(data.error || JSON.stringify(data));
    } catch (err) {
      setIsError(true);
      setOut(`Network error: ${err.message}`);
    } finally {
      setGoogleStatus('');
    }
  }

  useEffect(() => {
    if (!googleClientId) return;
    if (!googleBtnRef.current) return;

    let cancelled = false;
    let tries = 0;
    const maxTries = 50; // ~5s

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
                setIsError(true);
                setOut('Google sign-in failed: missing credential');
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
            text: mode === 'signup' ? 'signup_with' : 'signin_with'
          });
          return;
        } catch (err) {
          setIsError(true);
          setOut(`Google sign-in init failed: ${err?.message || String(err)}`);
          return;
        }
      }

      if (tries < maxTries) setTimeout(tryInit, 100);
      else {
        setIsError(true);
        setOut('Google sign-in failed to load. Check your network and `VITE_GOOGLE_CLIENT_ID`.');
      }
    }

    tryInit();
    return () => {
      cancelled = true;
    };
  }, [googleClientId, mode, authMethod]);

  async function submit(e) {
    e.preventDefault();
    const endpoint = mode === 'login' ? 'login' : 'register';
    const normalizedEmail = email.trim();
    const normalizedName = name.trim();
    const payload =
      mode === 'login'
        ? { email: normalizedEmail, password }
        : { name: normalizedName, email: normalizedEmail, password, role };

    try {
      setIsError(false);
      setOut('');
      setNeedsVerify(false);
      setResendOut('');

      const res = await apiFetch(`/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setIsError(false);
        if (mode === 'signup') {
          // Registration successful - email verification required
          setOut('Account created! Check your email for the verification code.');
          setNeedsVerify(true);
          setName('');
          setEmail('');
          setPassword('');
        } else {
          // Login successful
          const nextRole = data?.user?.role || 'student';
          if (nextRole === 'admin') window.location.href = '/admin/dashboard';
          else if (nextRole === 'instructor') window.location.href = '/instructor/dashboard';
          else window.location.href = '/dashboard';
        }
      } else {
        setIsError(true);
        const verifyRequired = res.status === 403 && String(data?.error || '').toLowerCase().includes('verify');
        if (verifyRequired) setNeedsVerify(true);
        // Handle specific error messages
        if (data.details && Array.isArray(data.details)) {
          setOut(data.details.join('\n'));
        } else {
          const msg = data.error || JSON.stringify(data);
          if (mode === 'login' && msg === 'Invalid credentials') {
            setOut(
              "Invalid credentials. If you signed up with Google, use 'Sign in with Google' (or reset your password first via 'Forgot password?')."
            );
          } else {
            setOut(msg);
          }
        }
      }
    } catch (err) {
      setIsError(true);
      setOut(`Network error: ${err.message}`);
    }
  }

  const title = mode === 'login' ? 'Welcome back' : 'Create your account';
  const subtitle =
    mode === 'login'
      ? 'Sign in to continue your learning.'
      : 'Create an account to track progress, earn badges, and collect certificates.';

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="hidden lg:col-span-2 lg:block">
          <div className="h-full overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
            <div className="text-lg font-extrabold tracking-tight">
              Skill<span className="text-indigo-200">Verse</span>
            </div>
            <div className="mt-10 text-3xl font-extrabold leading-tight">
              Learn with a clear path, not guesswork.
            </div>
            <div className="mt-4 text-sm text-indigo-100">
              Short lessons, quick checks, and a portfolio you can share.
            </div>
            <div className="mt-10 space-y-3 text-sm text-indigo-100">
              <div className="rounded-2xl bg-white/10 p-4">Bite-size lessons with structure</div>
              <div className="rounded-2xl bg-white/10 p-4">Quizzes and practice built in</div>
              <div className="rounded-2xl bg-white/10 p-4">Certificates after completion</div>
            </div>
          </div>
        </div>

        <Card className="lg:col-span-3">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</div>
              </div>
              <Segmented
                value={mode}
                onChange={(v) => {
                  setMode(v);
                  clearForm();
                }}
                options={[
                  { value: 'login', label: 'Login' },
                  { value: 'signup', label: 'Sign up' }
                ]}
              />
            </div>

            {googleClientId ? (
              <div className="mt-5">
                <Segmented
                  value={authMethod}
                  onChange={(v) => {
                    setAuthMethod(v);
                    setOut('');
                    setIsError(false);
                  }}
                  options={[
                    { value: 'google', label: 'Google' },
                    { value: 'email', label: 'Email' }
                  ]}
                />
              </div>
            ) : null}

            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === 'signup' ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Register as</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Choose Student or Instructor</div>
                  </div>
                  <Segmented
                    value={role}
                    onChange={setRole}
                    options={[
                      { value: 'student', label: 'Student' },
                      { value: 'instructor', label: 'Instructor' }
                    ]}
                  />
                </div>
              ) : null}
              {authMethod === 'google' && googleClientId ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Continue with</div>
                  <div ref={googleBtnRef} />
                  {googleStatus ? <div className="text-xs text-slate-500 dark:text-slate-400">{googleStatus}</div> : null}
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Prefer email/password? Switch to <button type="button" className="font-semibold text-indigo-600 dark:text-indigo-400" onClick={() => setAuthMethod('email')}>Email</button>.
                  </div>
                </div>
              ) : null}

              {authMethod === 'email' && mode === 'signup' ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Name</div>
                  <Input value={name} onChange={(e) => setName(e.target.value)} type="text" required />
                </div>
              ) : null}

              {authMethod === 'email' ? (
                <>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email</div>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Password</div>
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
                  </div>

                  {googleClientId ? (
                    <div className="pt-2">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">or</div>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">Continue with</div>
                        <div ref={googleBtnRef} />
                        {googleStatus ? <div className="text-xs text-slate-500 dark:text-slate-400">{googleStatus}</div> : null}
                      </div>
                    </div>
                  ) : null}

                  <Button className="w-full" type="submit" variant="primary">
                    {mode === 'login' ? 'Login' : 'Create account'}
                  </Button>
                </>
              ) : null}
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <a href="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                Forgot password?
              </a>
              <Button
                variant="outline"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  clearForm();
                }}
              >
                {mode === 'login' ? 'Create account' : 'Back to login'}
              </Button>
            </div>

            {out ? (
              <div
                className={[
                  'mt-5 rounded-2xl border p-4 text-sm',
                  isError
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
                ].join(' ')}
              >
                <div className="space-y-3">
                  <div>{out}</div>
                  {needsVerify && authMethod === 'email' && email.trim() ? (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Enter the 6-digit code sent to your email:
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          type="text"
                          placeholder="123456"
                          className="flex-1"
                        />
                        <Button type="button" variant="primary" onClick={verifyCode} disabled={verifying || verificationCode.length !== 6}>
                          {verifying ? 'Verifying…' : 'Verify'}
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button type="button" variant="outline" onClick={resendVerification} disabled={resendBusy}>
                          {resendBusy ? 'Sending…' : 'Resend code'}
                        </Button>
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          Check your email for the code.
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {resendOut ? <div className="text-xs text-slate-600 dark:text-slate-300">{resendOut}</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
