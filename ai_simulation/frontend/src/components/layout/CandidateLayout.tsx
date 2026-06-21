import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { path: '/candidate/dashboard',    icon: '▦',  label: 'Dashboard' },
  { path: '/candidate/internships',  icon: '💼', label: 'Browse Jobs' },
  { path: '/candidate/profile',      icon: '👤', label: 'My Profile' },
];

export const CandidateLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/auth/login'); };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>
      {/* Sidebar */}
      <aside className="w-60 flex flex-col flex-shrink-0"
        style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, var(--blue), var(--accent))' }}>
            C
          </div>
          <span className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
            CAPVIA
          </span>
        </div>

        {/* Portal badge */}
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md"
            style={{ background: 'var(--blue-light)', color: 'var(--blue)', border: '1px solid var(--blue-border)' }}>
            Candidate Portal
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={({ isActive }) => isActive
                ? { background: 'var(--blue-light)', color: 'var(--blue)', border: '1px solid var(--blue-border)' }
                : { color: 'var(--text-secondary)', border: '1px solid transparent' }
              }>
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="px-3 py-2 mb-1 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.full_name || user?.email}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {user?.email}
            </p>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition hover:bg-red-50"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            <span className="text-base w-5 text-center">↩</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
};
