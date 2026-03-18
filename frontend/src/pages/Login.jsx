import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import '../styles/auth.css'
import { API_BASE } from '../lib/apiBase'

export default function Login(){
  const location = useLocation()
  const [mode, setMode] = useState(location.pathname === '/signup' ? 'signup' : 'login') // 'login' or 'signup'
  const [authMethod, setAuthMethod] = useState('email') // 'email' or 'google'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [out, setOut] = useState('')
  const [isError, setIsError] = useState(false)
  const googleBtnRef = useRef(null)
  const [googleStatus, setGoogleStatus] = useState('')

  const googleClientId = useMemo(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  }, [])

  function clearForm(){ setName(''); setEmail(''); setPassword(''); setOut(''); setIsError(false) }

  useEffect(() => {
    const nextMode = location.pathname === '/signup' ? 'signup' : 'login'
    setMode(nextMode)
    clearForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!googleClientId) {
      setAuthMethod('email')
      return
    }
    // Signup defaults to Google; login defaults to email.
    setAuthMethod(mode === 'signup' ? 'google' : 'email')
  }, [googleClientId, mode])

  async function onGoogleCredential(credential){
    try{
      setIsError(false)
      setOut('')
      setGoogleStatus('Signing in with Google...')

      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      })
      const data = await res.json()

      if(res.ok && data.token){
        localStorage.setItem('token', data.token)
        window.location.href = '/dashboard'
        return
      }

      setIsError(true)
      setOut(data.error || JSON.stringify(data))
    }catch(err){
      setIsError(true)
      setOut('Network error: '+err.message)
    } finally {
      setGoogleStatus('')
    }
  }

  useEffect(() => {
    if(!googleClientId) return
    if(!googleBtnRef.current) return

    let cancelled = false
    let tries = 0
    const maxTries = 50 // ~5s

    function tryInit(){
      if(cancelled) return
      tries += 1
      const google = window.google
      if(google && google.accounts && google.accounts.id){
        try{
          google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (resp) => {
              const cred = resp && resp.credential ? resp.credential : ''
              if(!cred){
                setIsError(true)
                setOut('Google sign-in failed: missing credential')
                return
              }
              onGoogleCredential(cred)
            }
          })

          // Render button
          googleBtnRef.current.innerHTML = ''
          google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: mode === 'signup' ? 'signup_with' : 'signin_with'
          })
          return
        }catch(err){
          setIsError(true)
          setOut('Google sign-in init failed: '+(err && err.message ? err.message : String(err)))
          return
        }
      }

      if(tries < maxTries) setTimeout(tryInit, 100)
      else {
        setIsError(true)
        setOut('Google sign-in failed to load. Check your network and `VITE_GOOGLE_CLIENT_ID`.')
      }
    }

    tryInit()
    return () => { cancelled = true }
  }, [googleClientId, mode, authMethod])

  async function submit(e){
    e.preventDefault()
    const endpoint = mode === 'login' ? 'login' : 'register'
    const normalizedEmail = email.trim()
    const normalizedName = name.trim()
    const payload = mode === 'login' ? { email: normalizedEmail, password } : { name: normalizedName, email: normalizedEmail, password }

    try{
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()

      if(res.ok){
        setIsError(false)
        if(data.token){
          localStorage.setItem('token', data.token)
          window.location.href = '/dashboard'
          return
        }
        const userName = data.user && data.user.name ? ` (${data.user.name})` : ''
        setOut(mode === 'login' ? `Login successful${userName}` : `Account created - you are logged in${userName}`)
      } else {
        setIsError(true)
        setOut(data.error || JSON.stringify(data))
      }
    }catch(err){
      setIsError(true)
      setOut('Network error: '+err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="logo">Skill<span>Verse</span></div>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p>Learn, build, and grow - sign in to continue your learning journey.</p>
          <div style={{marginTop:12,fontSize:13,opacity:0.9}}>Use your email and password to {mode==='login' ? 'sign in' : 'create an account'}.</div>
        </div>

        <div className="auth-right">
          <div className="mode-toggle">
            <button className={mode==='login' ? 'active' : ''} onClick={()=>{ setMode('login'); clearForm() }}>Login</button>
            <button className={mode==='signup' ? 'active' : ''} onClick={()=>{ setMode('signup'); clearForm() }}>Sign up</button>
          </div>

          <form onSubmit={submit}>
            {googleClientId && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 6 }}>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('google'); setOut(''); setIsError(false) }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: authMethod === 'google' ? '2px solid rgba(99,102,241,0.9)' : '1px solid rgba(15,23,42,0.10)',
                    background: authMethod === 'google' ? 'rgba(99,102,241,0.08)' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod('email'); setOut(''); setIsError(false) }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: authMethod === 'email' ? '2px solid rgba(99,102,241,0.9)' : '1px solid rgba(15,23,42,0.10)',
                    background: authMethod === 'email' ? 'rgba(99,102,241,0.08)' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  Email
                </button>
              </div>
            )}

            {authMethod === 'google' && googleClientId && (
              <div className="form-row" style={{ marginTop: 10 }}>
                <label>Continue with</label>
                <div ref={googleBtnRef} />
                {googleStatus && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{googleStatus}</div>}
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 10 }}>
                  Prefer email/password? Switch to <button type="button" className="secondary" style={{ padding: '4px 10px', marginLeft: 6 }} onClick={() => setAuthMethod('email')}>Email</button>
                </div>
              </div>
            )}

            {authMethod === 'email' && mode === 'signup' && (
              <div className="form-row">
                <label htmlFor="name">Name</label>
                <input id="name" value={name} onChange={e=>setName(e.target.value)} type="text" required />
              </div>
            )}

            {authMethod === 'email' && (
            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input id="email" value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
            </div>
            )}

            {authMethod === 'email' && (
            <div className="form-row">
              <label htmlFor="password">Password</label>
              <input id="password" value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
            </div>
            )}

            {googleClientId && authMethod === 'email' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.14)' }} />
                  <div style={{ fontSize: 12, opacity: 0.8 }}>or</div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.14)' }} />
                </div>
                <div className="form-row" style={{ marginTop: 0 }}>
                  <label>Continue with</label>
                  <div ref={googleBtnRef} />
                  {googleStatus && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{googleStatus}</div>}
                </div>
              </>
            )}

            {authMethod === 'email' && (
              <button className="primary" type="submit">{mode === 'login' ? 'Login' : 'Create account'}</button>
            )}
          </form>

          <div className="auth-links">
            <a href="/forgot-password">Forgot password?</a>
            <button className="secondary" onClick={()=>{ setMode(mode==='login' ? 'signup' : 'login'); clearForm() }}>
              {mode==='login' ? 'Create account' : 'Back to login'}
            </button>
          </div>

          {out && <div className={`auth-out ${isError ? 'error' : 'success'}`} style={{marginTop:12}}>{out}</div>}
        </div>
      </div>
    </div>
  )
}
