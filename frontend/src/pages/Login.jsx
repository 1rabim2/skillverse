import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import '../styles/auth.css'
import { API_BASE } from '../lib/apiBase'

export default function Login(){
  const location = useLocation()
  const [mode, setMode] = useState(location.pathname === '/signup' ? 'signup' : 'login') // 'login' or 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [out, setOut] = useState('')
  const [isError, setIsError] = useState(false)

  function clearForm(){ setName(''); setEmail(''); setPassword(''); setOut(''); setIsError(false) }

  useEffect(() => {
    const nextMode = location.pathname === '/signup' ? 'signup' : 'login'
    setMode(nextMode)
    clearForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

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
            {mode === 'signup' && (
              <div className="form-row">
                <label htmlFor="name">Name</label>
                <input id="name" value={name} onChange={e=>setName(e.target.value)} type="text" required />
              </div>
            )}

            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input id="email" value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
            </div>

            <div className="form-row">
              <label htmlFor="password">Password</label>
              <input id="password" value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
            </div>

            <button className="primary" type="submit">{mode === 'login' ? 'Login' : 'Create account'}</button>
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
