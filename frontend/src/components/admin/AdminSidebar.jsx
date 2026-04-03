import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Workflow,
  BadgeCheck,
  ClipboardCheck,
  MessagesSquare,
  CreditCard,
  Settings
} from 'lucide-react';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/skill-paths', label: 'Skill Paths', icon: Workflow },
  { to: '/admin/certificates', label: 'Certificates', icon: BadgeCheck },
  { to: '/admin/projects', label: 'Projects', icon: ClipboardCheck },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/community', label: 'Community', icon: MessagesSquare },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
];

export default function AdminSidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 transform border-r border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 px-2">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Skill<span className="text-indigo-600 dark:text-indigo-400">Verse</span> Admin
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Career Learning Control Center</p>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
