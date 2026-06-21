import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { path: '/hr/dashboard',           icon: '▦',  label: 'Dashboard' },
  { path: '/hr/internships',         icon: '💼', label: 'Internships' },
  { path: '/hr/internships/create',  icon: '+',  label: 'Post Internship' },
];

export const HRLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const handleLogout = () => { logout(); navigate('/auth/login'); };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} flex flex-col flex-shrink-0 transition-all duration-300`}
        style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)', boxShadow: '1px 0 0 0 var(--border)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--blue))' }}>
            C
          </div>
          {!collapsed && (
            <span className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
              CAPVIA
            </span>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-xs rounded-lg p-1.5 transition hover:bg-gray-100"
            style={{ color: 'var(--text-muted)' }}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Portal badge */}
        {!collapsed && (
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
              HR Portal
            </span>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive ? 'active-nav' : 'inactive-nav'
                }`
              }
              style={({ isActive }) => isActive
                ? { background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
                : { color: 'var(--text-secondary)', border: '1px solid transparent' }
              }>
              <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          {!collapsed && (
            <div className="px-3 py-2 mb-1 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {user?.organization || user?.email}
              </p>
            </div>
          )}
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition hover:bg-red-50"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            <span className="text-base w-5 text-center flex-shrink-0">↩</span>
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
