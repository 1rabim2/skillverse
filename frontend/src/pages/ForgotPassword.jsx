import React, {useState} from 'react'
import { API_BASE } from '../lib/apiBase'

export default function ForgotPassword(){
  const [email,setEmail] = useState('')
  const [out,setOut] = useState('')

  async function submit(e){
    e.preventDefault()
    try{
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      })
      const data = await res.json()
      // Show friendly message and dev link when present
      if(data.verifyLink) setOut('Verification link (dev): ' + data.verifyLink)
      else if(data.resetLink) setOut('Reset link (dev): ' + data.resetLink)
      else setOut(data.message || JSON.stringify(data, null, 2))
    }catch(err){
      setOut('Network error: '+err.message)
    }
  }

  return (
    <div style={{maxWidth:420}}>
      <h2>Forgot Password</h2>
      <form onSubmit={submit}>
        <div style={{marginBottom:8}}>
          <label style={{display:'block'}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required style={{width:'100%'}} />
        </div>
        <button type="submit">Send reset link</button>
      </form>
      <pre style={{whiteSpace:'pre-wrap', marginTop:12}}>{out}</pre>
    </div>
  )
}
