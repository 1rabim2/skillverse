import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import HeaderBar from './HeaderBar'
import { API_BASE } from '../lib/apiBase'
import '../styles/dashboard.css'

export default function StudentLayout(){
  const location = useLocation()
  const [user, setUser] = React.useState({ name: 'Student', email: '' })

  function logout(){
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  React.useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser({ name: 'Student', email: '' })
      return
    }

    let mounted = true
    async function loadMe(){
      try{
        const res = await fetch(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if(!res.ok) return
        if(mounted && data?.user) setUser(data.user)
      }catch{
        // ignore
      }
    }

    loadMe()
    return () => { mounted = false }
  }, [location.pathname])

  return (
    <div className="sv-dashboard">
      <div className="sv-main">
        <HeaderBar user={user} onLogout={logout} />
        <main className="sv-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

