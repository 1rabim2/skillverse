import React, {useState, useEffect} from 'react'
import { API_BASE } from '../lib/apiBase'

export default function ResetPassword(){
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') || ''
  const [password,setPassword] = useState('')
  const [out,setOut] = useState('')

  async function submit(e){
    e.preventDefault()
    try{
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password })
      })
      const data = await res.json()
      setOut(JSON.stringify(data, null, 2))
    }catch(err){
      setOut('Network error: '+err.message)
    }
  }

  if(!token) return <div>No token provided in URL.</div>

  return (
    <div style={{maxWidth:420}}>
      <h2>Reset Password</h2>
      <form onSubmit={submit}>
        <div style={{marginBottom:8}}>
          <label style={{display:'block'}}>New password</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required style={{width:'100%'}} />
        </div>
        <button type="submit">Reset password</button>
      </form>
      <pre style={{whiteSpace:'pre-wrap', marginTop:12}}>{out}</pre>
    </div>
  )
}
