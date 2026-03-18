import React, {useEffect, useState} from 'react'
import { API_BASE } from '../lib/apiBase'

export default function Verify(){
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') || ''
  const [out,setOut] = useState('')

  useEffect(()=>{
    if(!token) return setOut('No token provided')
    ;(async()=>{
      try{
        const res = await fetch(`${API_BASE}/auth/verify?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        setOut(JSON.stringify(data, null, 2))
      }catch(err){ setOut('Network error: '+err.message) }
    })()
  },[token])

  return (
    <div style={{maxWidth:420}}>
      <h2>Email verification</h2>
      <pre style={{whiteSpace:'pre-wrap'}}>{out}</pre>
    </div>
  )
}
