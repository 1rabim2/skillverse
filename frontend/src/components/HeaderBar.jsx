import React from 'react'
import { Bell } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { API_BASE } from '../lib/apiBase'

export default function HeaderBar({ user, onLogout }){
  const initials = (user?.name || 'SV').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const token = localStorage.getItem('token')
  const [open, setOpen] = React.useState(false)
  const [navOpen, setNavOpen] = React.useState(false)
  const [userOpen, setUserOpen] = React.useState(false)
  const [items, setItems] = React.useState([])
  const [unread, setUnread] = React.useState(0)
  const dropdownRef = React.useRef(null)
  const navRef = React.useRef(null)
  const userRef = React.useRef(null)

  React.useEffect(() => {
    function onDocClick(e) {
      if (open && dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
      if (navOpen && navRef.current && !navRef.current.contains(e.target)) setNavOpen(false)
      if (userOpen && userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, navOpen, userOpen])

  async function loadNotifications(){
    if (!token) return
    try{
      const res = await fetch(`${API_BASE}/user/notifications?limit=8`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if(!res.ok) return
      setItems(data.items || [])
      setUnread(data.unreadCount || 0)
    }catch{
      // ignore
    }
  }

  async function markRead(id){
    if (!token) return
    try{
      await fetch(`${API_BASE}/user/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      await loadNotifications()
    }catch{
      // ignore
    }
  }

  async function markUnread(id){
    if (!token) return
    try{
      await fetch(`${API_BASE}/user/notifications/${encodeURIComponent(id)}/unread`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      })
      await loadNotifications()
    }catch{
      // ignore
    }
  }

  async function markAllRead(){
    if (!token) return
    try{
      await fetch(`${API_BASE}/user/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      await loadNotifications()
    }catch{
      // ignore
    }
  }

  return (
    <header className="sv-header">
      <div className="sv-header-left">
        <div className="sv-nav-wrap" ref={navRef}>
          <button
            className="sv-icon-btn sv-menu-btn"
            type="button"
            title="Menu"
            onClick={() => setNavOpen((v) => !v)}
          >
            <span className="sv-burger" aria-hidden="true" />
          </button>
          {navOpen && (
            <div className="sv-nav-menu">
              <NavLink to="/dashboard" onClick={() => setNavOpen(false)}>Dashboard</NavLink>
              <NavLink to="/courses" onClick={() => setNavOpen(false)}>Courses</NavLink>
              <NavLink to="/portfolio" onClick={() => setNavOpen(false)}>Portfolio</NavLink>
              <NavLink to="/profile" onClick={() => setNavOpen(false)}>Profile</NavLink>
              <button className="sv-nav-logout" type="button" onClick={() => { setNavOpen(false); onLogout() }}>Logout</button>
            </div>
          )}
        </div>

        <div className="sv-brand">
          <a href="/dashboard" className="sv-brand-link">Skill<span>Verse</span></a>
        </div>
      </div>

      <div className="sv-header-center">
        <nav className="sv-topnav" aria-label="Primary">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/courses">Courses</NavLink>
          <NavLink to="/portfolio">Portfolio</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
      </div>

      <div className="sv-header-right" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input className="sv-search" placeholder="Search courses..." />
        <div className="sv-notif" ref={dropdownRef}>
          <button
            className="sv-icon-btn"
            title="Notifications"
            onClick={async () => {
              const next = !open
              setOpen(next)
              if(next) await loadNotifications()
            }}
          >
            <Bell size={18} />
            {unread > 0 && <span className="sv-notif-badge">{unread > 99 ? '99+' : unread}</span>}
          </button>
          {open && (
            <div className="sv-notif-menu">
              <div className="sv-notif-head">
                <div className="sv-notif-title">Notifications</div>
                <button className="sv-notif-link" onClick={markAllRead}>Mark all read</button>
              </div>
              <div className="sv-notif-list">
                {items.map((n) => (
                  <div
                    key={n._id}
                    className={`sv-notif-item ${n.readAt ? '' : 'unread'}`}
                  >
                    <button className="sv-notif-click" onClick={() => markRead(n._id)}>
                      <div className="sv-notif-item-top">
                        <div className="sv-notif-item-title">{n.title || 'Notification'}</div>
                        {!n.readAt && <span className="sv-dot" />}
                      </div>
                      <div className="sv-notif-item-msg">{n.message}</div>
                      <div className="sv-notif-item-time">{new Date(n.createdAt).toLocaleString()}</div>
                    </button>
                    {n.readAt && (
                      <div className="sv-notif-actions">
                        <button className="sv-notif-link" onClick={() => markUnread(n._id)}>Mark unread</button>
                      </div>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="sv-notif-empty">No notifications yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="sv-user" ref={userRef}>
          <button
            type="button"
            className="sv-avatar-btn"
            title="Account"
            onClick={() => setUserOpen((v) => !v)}
          >
            <span className="sv-avatar">{initials}</span>
          </button>
          {userOpen && (
            <div className="sv-user-menu">
              <div className="sv-user-head">
                <div className="sv-user-name">{user?.name || 'Student'}</div>
                <div className="sv-user-email">{user?.email || ''}</div>
              </div>
              <NavLink to="/profile" onClick={() => setUserOpen(false)}>Profile</NavLink>
              <button
                type="button"
                className="sv-user-logout"
                onClick={() => { setUserOpen(false); onLogout() }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
