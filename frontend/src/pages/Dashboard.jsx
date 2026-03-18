import React from 'react'
import Sidebar from '../components/Sidebar'
import HeaderBar from '../components/HeaderBar'
import ProgressOverview from '../components/ProgressOverview'
import CourseCarousel from '../components/CourseCarousel'
import Achievements from '../components/Achievements'
import MotivationBanner from '../components/MotivationBanner'
import '../styles/dashboard.css'
import { API_BASE } from '../lib/apiBase'

function AccessMessage({ isAdminOnly }) {
  return (
    <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ maxWidth: 560, background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}>
        <h2 style={{ marginTop: 0 }}>Dashboard Access</h2>
        {isAdminOnly ? (
          <p>You are logged in as admin. Student dashboard requires a student login token.</p>
        ) : (
          <p>You are not logged in as a student. Please login first to access the student dashboard.</p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          {!isAdminOnly && (
            <button className="sv-cta" onClick={() => { window.location.href = '/login' }}>
              Go to Student Login
            </button>
          )}
          {isAdminOnly && (
            <button className="sv-cta" onClick={() => { window.location.href = '/admin/dashboard' }}>
              Go to Admin Dashboard
            </button>
          )}
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

export default function Dashboard(){
  const token = localStorage.getItem('token')
  const adminToken = localStorage.getItem('adminToken')
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')

  function logout(){
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  React.useEffect(() => {
    if (!token) return

    let mounted = true

    async function loadDashboard(){
      try{
        setLoading(true)
        setError('')
        const res = await fetch(`${API_BASE}/user/me/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const result = await res.json()
        if(!res.ok) {
          const msg = result?.error || 'Failed to load dashboard'
          // If backend DB was reset (in-memory fallback) the token points to a missing user.
          if (res.status === 404 && msg.toLowerCase().includes('user not found')) {
            localStorage.removeItem('token')
            throw new Error('Session expired (user no longer exists). Please login again.')
          }
          // Token invalid/expired or blocked account.
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token')
          }
          throw new Error(msg)
        }
        if(mounted) setData(result)
      }catch(err){
        if(mounted) setError(err.message)
      }finally{
        if(mounted) setLoading(false)
      }
    }

    loadDashboard()
    return () => { mounted = false }
  }, [token])

  if (!token) {
    return <AccessMessage isAdminOnly={!!adminToken} />
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading dashboard...</div>
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p>Could not load dashboard: {error}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="sv-cta" onClick={() => window.location.reload()}>Retry</button>
          <button className="sv-cta" onClick={() => { window.location.href = '/login' }}>Go to Login</button>
        </div>
      </div>
    )
  }

  const user = data?.user || { name: 'Student' }
  const stats = data?.stats || {}
  const badges = data?.badges || []
  const courses = data?.courses || []
  const recentActivity = data?.recentActivity || []

  return (
    <div className="sv-dashboard">
      <Sidebar onLogout={logout} />
      <div className="sv-main">
        <HeaderBar user={user} onLogout={logout} />
        <main className="sv-content">
          <ProgressOverview stats={stats} />
          <section className="sv-section">
            <h2>Continue Learning</h2>
            <CourseCarousel courses={courses} />
          </section>

          <div className="sv-grid">
            <Achievements badges={badges} />
            <div className="sv-community">
              <h3>Recent Activity</h3>
              <ul>
                {recentActivity.map((item, idx) => (
                  <li key={`${item.type}-${idx}`}>{item.message}</li>
                ))}
                {recentActivity.length === 0 && <li>No recent activity yet.</li>}
              </ul>
              <button className="sv-cta">Go to Community</button>
            </div>
          </div>

          <MotivationBanner />
        </main>
      </div>
    </div>
  )
}
