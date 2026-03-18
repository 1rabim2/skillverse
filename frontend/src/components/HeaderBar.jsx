import React from 'react'
import { Bell } from 'lucide-react'
import { API_BASE } from '../lib/apiBase'

export default function HeaderBar({ user, onLogout }){
  const initials = (user?.name || 'SV').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const token = localStorage.getItem('token')
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState([])
  const [unread, setUnread] = React.useState(0)
  const dropdownRef = React.useRef(null)

  React.useEffect(() => {
    function onDocClick(e) {
      if (!open) return
      if (!dropdownRef.current) return
      if (!dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

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
      <div className="sv-greet">Welcome back, <strong>{user?.name || 'Student'}</strong></div>
      <div className="sv-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
        <button className="sv-cta" onClick={onLogout}>Logout</button>
        <div className="sv-avatar">{initials}</div>
      </div>
    </header>
  )
}
