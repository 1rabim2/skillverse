import React from 'react'
import { API_BASE } from '../lib/apiBase'

function AccessMessage(){
  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 560, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}>
        <h2 style={{ marginTop: 0 }}>Profile Access</h2>
        <p>You are not logged in as a student. Please login first.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="sv-cta" onClick={() => { window.location.href = '/login' }}>
            Go to Student Login
          </button>
          <button
            style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
            onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('adminToken'); window.location.href = '/login' }}
          >
            Reset Session
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Profile(){
  const token = localStorage.getItem('token')
  const [user, setUser] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [saveMsg, setSaveMsg] = React.useState('')
  const [saving, setSaving] = React.useState(false)
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
  })

  const [pwForm, setPwForm] = React.useState({ currentPassword: '', newPassword: '' })
  const [pwMsg, setPwMsg] = React.useState('')

  const googleBtnRef = React.useRef(null)
  const [googleMsg, setGoogleMsg] = React.useState('')
  const googleClientId = React.useMemo(() => import.meta.env.VITE_GOOGLE_CLIENT_ID || '', [])

  React.useEffect(() => {
    if (!token) return
    let mounted = true

    async function load(){
      try{
        setLoading(true)
        setError('')
        const res = await fetch(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if(!res.ok){
          if (res.status === 401 || res.status === 403) localStorage.removeItem('token')
          throw new Error(data?.error || 'Failed to load profile')
        }
        if(mounted) {
          setUser(data.user)
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
          })
        }
      }catch(err){
        if(mounted) setError(err.message)
      }finally{
        if(mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [token])

  async function linkGoogle(credential){
    try{
      setGoogleMsg('Linking Google account...')
      const res = await fetch(`${API_BASE}/user/link-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ credential })
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data?.error || 'Failed to link Google')
      setUser(data.user)
      setGoogleMsg('Google account linked')
      setTimeout(() => setGoogleMsg(''), 2000)
    }catch(err){
      setGoogleMsg(err.message)
    }
  }

  React.useEffect(() => {
    if (!token) return
    if (!googleClientId) return
    if (!user) return
    if (user.googleSub) return
    if (!googleBtnRef.current) return

    let cancelled = false
    let tries = 0
    const maxTries = 50

    function tryInit(){
      if (cancelled) return
      tries += 1
      const google = window.google
      if (google && google.accounts && google.accounts.id) {
        try{
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (resp) => {
              const cred = resp && resp.credential ? resp.credential : ''
              if(!cred) {
                setGoogleMsg('Google link failed: missing credential')
                return
              }
              linkGoogle(cred)
            }
          })
          googleBtnRef.current.innerHTML = ''
          google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with'
          })
          return
        }catch(err){
          setGoogleMsg(`Google init failed: ${err?.message || String(err)}`)
          return
        }
      }
      if (tries < maxTries) setTimeout(tryInit, 100)
    }

    tryInit()
    return () => { cancelled = true }
  }, [token, googleClientId, user])

  async function saveProfile(e){
    e.preventDefault()
    setSaveMsg('')
    setSaving(true)
    try{
      const res = await fetch(`${API_BASE}/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data?.error || 'Failed to save profile')
      setUser(data.user)
      setSaveMsg('Profile updated')
      setTimeout(() => setSaveMsg(''), 2000)
    }catch(err){
      setSaveMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(e){
    e.preventDefault()
    setPwMsg('')
    try{
      const res = await fetch(`${API_BASE}/user/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(pwForm)
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data?.error || 'Failed to update password')
      setPwMsg('Password updated')
      setPwForm({ currentPassword: '', newPassword: '' })
      setTimeout(() => setPwMsg(''), 2000)
    }catch(err){
      setPwMsg(err.message)
    }
  }

  if (!token) return <AccessMessage />
  if (loading) return <div style={{ padding: 24 }}>Loading profile...</div>
  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p>Could not load profile: {error}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="sv-cta" onClick={() => window.location.reload()}>Retry</button>
          <button className="sv-cta" onClick={() => { window.location.href = '/login' }}>Go to Login</button>
        </div>
      </div>
    )
  }

  const safeUser = user || { name: 'Student', email: '' }
  const isGoogleLinked = !!safeUser.googleSub
  const completionFields = [
    safeUser?.name,
    safeUser?.headline,
    safeUser?.phone,
    safeUser?.location,
    safeUser?.bio,
    safeUser?.website,
    safeUser?.github,
    safeUser?.linkedin,
    safeUser?.avatarUrl
  ]
  const completionTotal = completionFields.length
  const completionFilled = completionFields.filter((v) => String(v || '').trim().length > 0).length
  const completionPct = completionTotal ? Math.round((completionFilled / completionTotal) * 100) : 0

  return (
    <>
      <section className="sv-section">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(79,70,229,0.18), rgba(250,204,21,0.10))',
                border: '1px solid rgba(15,23,42,0.06)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                color: '#0f172a'
              }}
              title="Avatar"
            >
              {safeUser.avatarUrl ? (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={safeUser.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (safeUser.name || 'SV')
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
            <div>
              <h2 style={{ marginTop: 0, marginBottom: 4 }}>Profile</h2>
              <div style={{ color: '#475569', fontSize: 13 }}>
                {safeUser.email} • {isGoogleLinked ? 'Google linked' : 'Google not linked'}
              </div>
            </div>
          </div>

          <div style={{ minWidth: 220 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b' }}>
              <span>Profile completeness</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>{completionPct}%</span>
            </div>
            <div className="progress-bar" style={{ marginTop: 8 }}>
              <div style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="sv-section">
        <h2 style={{ marginTop: 0 }}>Details</h2>
        <form onSubmit={saveProfile} style={{ display: 'grid', gap: 12 }}>
          <div className="sv-profile-grid" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#475569' }}>Full name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                required
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#475569' }}>Headline</label>
              <input
                value={form.headline}
                onChange={(e) => setForm((v) => ({ ...v, headline: e.target.value }))}
                placeholder="e.g., Frontend developer"
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#475569' }}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
                placeholder="+977..."
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#475569' }}>Location</label>
              <input
                value={form.location}
                onChange={(e) => setForm((v) => ({ ...v, location: e.target.value }))}
                placeholder="e.g., Kathmandu, Nepal"
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#475569' }}>Website</label>
              <input
                value={form.website}
                onChange={(e) => setForm((v) => ({ ...v, website: e.target.value }))}
                placeholder="https://..."
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#475569' }}>Avatar URL</label>
              <input
                value={form.avatarUrl}
                onChange={(e) => setForm((v) => ({ ...v, avatarUrl: e.target.value }))}
                placeholder="https://..."
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#475569' }}>GitHub</label>
              <input
                value={form.github}
                onChange={(e) => setForm((v) => ({ ...v, github: e.target.value }))}
                placeholder="https://github.com/username"
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#475569' }}>LinkedIn</label>
              <input
                value={form.linkedin}
                onChange={(e) => setForm((v) => ({ ...v, linkedin: e.target.value }))}
                placeholder="https://linkedin.com/in/username"
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 13, color: '#475569' }}>Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((v) => ({ ...v, bio: e.target.value }))}
              rows={4}
              placeholder="Tell us a bit about you..."
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="sv-cta" type="submit" disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            {saveMsg && <div style={{ fontSize: 12, color: saveMsg === 'Profile updated' ? '#16a34a' : '#ef4444', fontWeight: 700 }}>{saveMsg}</div>}
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Email is read-only.
            </div>
          </div>
        </form>
      </section>

      <section className="sv-section">
        <h2 style={{ marginTop: 0 }}>Security</h2>

        {!isGoogleLinked && googleClientId && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>Link Google account (email must match).</div>
            <div ref={googleBtnRef} />
            {googleMsg && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8 }}>{googleMsg}</div>}
          </div>
        )}

        <form onSubmit={changePassword} style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
          {!isGoogleLinked && (
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 13, opacity: 0.9 }}>Current password</label>
              <input
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((v) => ({ ...v, currentPassword: e.target.value }))}
                required
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </div>
          )}

          {isGoogleLinked && (
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Your account is linked to Google. You can set an email/password here (current password not required).
            </div>
          )}

          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 13, opacity: 0.9 }}>New password</label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((v) => ({ ...v, newPassword: e.target.value }))}
              required
              minLength={8}
              style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(15,23,42,0.12)' }}
            />
          </div>

          <button className="sv-cta" type="submit">Update password</button>
          {pwMsg && <div style={{ fontSize: 12, opacity: 0.9 }}>{pwMsg}</div>}
        </form>
      </section>
    </>
  )
}
