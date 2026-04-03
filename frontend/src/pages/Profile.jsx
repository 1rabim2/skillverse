import React from 'react';
import { adminFetch, apiFetch } from '../lib/apiFetch';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

function Field({ label, children, hint }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</div>
      {children}
      {hint ? <div className="text-xs text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}

function AccessMessage({ onReset }) {
  return (
    <div className="grid min-h-[70vh] place-items-center p-4">
      <Card className="w-full max-w-xl p-6">
        <div className="text-lg font-extrabold tracking-tight">Profile</div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          You are not logged in as a student. Sign in to view and edit your profile.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => (window.location.href = '/login')}>
            Go to student login
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onReset();
            }}
          >
            Reset session
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function Profile() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [blocked, setBlocked] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    headline: '',
    phone: '',
    location: '',
    bio: '',
    website: '',
    github: '',
    linkedin: '',
    avatarUrl: ''
  });

  const [pwForm, setPwForm] = React.useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = React.useState('');

  const googleBtnRef = React.useRef(null);
  const [googleMsg, setGoogleMsg] = React.useState('');
  const googleClientId = React.useMemo(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || '', []);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        setBlocked(false);
        const res = await apiFetch('/user/me');
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            if (mounted) setBlocked(true);
            return;
          }
          throw new Error(data?.error || 'Failed to load profile');
        }
        if (mounted) {
          setUser(data.user);
          setForm({
            name: data.user?.name || '',
            headline: data.user?.headline || '',
            phone: data.user?.phone || '',
            location: data.user?.location || '',
            bio: data.user?.bio || '',
            website: data.user?.website || '',
            github: data.user?.github || '',
            linkedin: data.user?.linkedin || '',
            avatarUrl: data.user?.avatarUrl || ''
          });
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function linkGoogle(credential) {
    try {
      setGoogleMsg('Linking Google account...');
      const res = await apiFetch('/user/link-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to link Google');
      setUser(data.user);
      setGoogleMsg('Google account linked');
      setTimeout(() => setGoogleMsg(''), 2000);
    } catch (err) {
      setGoogleMsg(err.message);
    }
  }

  React.useEffect(() => {
    if (!googleClientId) return;
    if (!user) return;
    if (user.googleSub) return;
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
                setGoogleMsg('Google link failed: missing credential');
                return;
              }
              linkGoogle(cred);
            }
          });
          googleBtnRef.current.innerHTML = '';
          google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with'
          });
          return;
        } catch (err) {
          setGoogleMsg(err?.message || 'Google button failed to initialize');
          return;
        }
      }

      if (tries < maxTries) setTimeout(tryInit, 100);
      else setGoogleMsg('Google sign-in failed to load. Check your network and `VITE_GOOGLE_CLIENT_ID`.');
    }

    tryInit();
    return () => {
      cancelled = true;
    };
  }, [googleClientId, user]);

  async function save(e) {
    e.preventDefault();
    if (!user) return;

    setSaveMsg('');
    setSaving(true);
    try {
      const res = await apiFetch('/user/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update profile');
      setUser(data.user);
      setSaveMsg('Profile updated');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err) {
      setSaveMsg(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (!user) return;

    setPwMsg('');
    try {
      const res = await apiFetch('/user/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pwForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update password');
      setPwForm({ currentPassword: '', newPassword: '' });
      setPwMsg('Password updated');
      setTimeout(() => setPwMsg(''), 2000);
    } catch (err) {
      setPwMsg(err.message);
    }
  }

  async function resetSession() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    try {
      await adminFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('token'); // legacy cleanup
    localStorage.removeItem('adminToken'); // legacy cleanup
    localStorage.removeItem('adminData');
    window.location.href = '/login';
  }

  if (blocked) return <AccessMessage onReset={resetSession} />;

  if (loading) {
    return (
      <Card className="p-5">
        <div className="text-sm text-slate-600 dark:text-slate-300">Loading profile...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Could not load profile</div>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error}</div>
        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = '/login')}>
            Go to login
          </Button>
        </div>
      </Card>
    );
  }

  const isGoogleLinked = !!user?.googleSub;
  const avatarUrl = form.avatarUrl || user?.avatarUrl || '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/30">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-extrabold text-slate-700 dark:text-slate-200">
                {(user?.name || 'S').slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profile</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Keep your details up to date for your portfolio and certificates.
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
            Back to dashboard
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              try {
                await apiFetch('/auth/logout', { method: 'POST' });
              } catch {
                // ignore
              } finally {
                localStorage.removeItem('token'); // legacy cleanup
                window.location.href = '/login';
              }
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <div className="text-sm font-extrabold">Personal</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Basic information shown on your profile.</div>

        <form onSubmit={save} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
            </Field>
            <Field label="Email" hint="Email is read-only.">
              <Input value={user?.email || ''} readOnly disabled />
            </Field>
            <Field label="Headline">
              <Input
                value={form.headline}
                onChange={(e) => setForm((v) => ({ ...v, headline: e.target.value }))}
                placeholder="e.g. Frontend learner focused on React"
              />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(e) => setForm((v) => ({ ...v, location: e.target.value }))} placeholder="City, Country" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} placeholder="+1..." />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={(e) => setForm((v) => ({ ...v, website: e.target.value }))} placeholder="https://..." />
            </Field>
            <Field label="Avatar URL">
              <Input value={form.avatarUrl} onChange={(e) => setForm((v) => ({ ...v, avatarUrl: e.target.value }))} placeholder="https://..." />
            </Field>
            <Field label="GitHub">
              <Input value={form.github} onChange={(e) => setForm((v) => ({ ...v, github: e.target.value }))} placeholder="https://github.com/username" />
            </Field>
            <Field label="LinkedIn">
              <Input value={form.linkedin} onChange={(e) => setForm((v) => ({ ...v, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/username" />
            </Field>
          </div>

          <Field label="Bio">
            <textarea
              value={form.bio}
              onChange={(e) => setForm((v) => ({ ...v, bio: e.target.value }))}
              rows={4}
              placeholder="Tell us a bit about you..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            {saveMsg ? (
              <div
                className={[
                  'text-sm font-semibold',
                  saveMsg === 'Profile updated' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                ].join(' ')}
              >
                {saveMsg}
              </div>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-extrabold">Security</div>
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Manage sign-in methods and passwords.</div>

        {!isGoogleLinked && googleClientId && (
          <div className="mt-4">
            <div className="text-sm text-slate-600 dark:text-slate-300">Link Google account (email must match).</div>
            <div className="mt-3" ref={googleBtnRef} />
            {googleMsg ? <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{googleMsg}</div> : null}
          </div>
        )}

        <form onSubmit={changePassword} className="mt-5 grid max-w-xl gap-4">
          {!isGoogleLinked ? (
            <Field label="Current password">
              <Input
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((v) => ({ ...v, currentPassword: e.target.value }))}
                required
              />
            </Field>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Your account is linked to Google. You can set an email/password here (current password not required).
            </div>
          )}

          <Field label="New password" hint="Minimum 8 characters.">
            <Input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((v) => ({ ...v, newPassword: e.target.value }))}
              required
              minLength={8}
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button variant="primary" type="submit">
              Update password
            </Button>
            {pwMsg ? <div className="text-sm text-slate-600 dark:text-slate-300">{pwMsg}</div> : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
