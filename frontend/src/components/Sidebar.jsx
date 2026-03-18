import React from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar({ onLogout }){
  return (
    <aside className="sv-sidebar">
      <div className="sv-logo">Skill<span>Verse</span></div>
      <nav>
        <ul>
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/courses" className={({ isActive }) => (isActive ? 'active' : '')}>
              Courses
            </NavLink>
          </li>
          <li>
            <NavLink to="/portfolio" className={({ isActive }) => (isActive ? 'active' : '')}>
              Portfolio
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
              Profile
            </NavLink>
          </li>
          <li className="logout" onClick={onLogout}>Logout</li>
        </ul>
      </nav>
    </aside>
  )
}
