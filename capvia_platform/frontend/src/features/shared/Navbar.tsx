'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell, User, LogOut, ChevronDown, Menu,
  Shield, Building, Settings, Search, Command,
  ExternalLink, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';

interface NavbarProps {
  onToggleSidebar?: () => void;
  title?: string;
}

const ROLE_META: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ElementType;
}> = {
  admin:     { label: 'Admin',     color: '#0D47A1', bg: '#EFF6FF', border: 'rgba(13,71,161,0.15)',   icon: Shield },
  hr:        { label: 'HR',        color: '#059669', bg: '#ECFDF5', border: 'rgba(5,150,105,0.15)',   icon: Building },
  candidate: { label: 'Candidate', color: '#6D28D9', bg: '#F5F3FF', border: 'rgba(109,40,217,0.15)', icon: User },
};

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, title = '' }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setIsMounted(true); }, []);

  const role     = isMounted ? (user?.role || 'candidate') : 'candidate';
  const rm       = ROLE_META[role] || ROLE_META.candidate;
  const RoleIcon = rm.icon;

  const notifHref   = role === 'admin' ? '/admin/notifications' : '/notifications';
  const profileHref =
    role === 'admin' ? '/admin/settings' :
    role === 'hr'    ? '/hr/settings'    : '/candidate/profile';

  const initials = isMounted
    ? (user?.full_name || user?.email || 'U')
        .split(' ')
        .map((w: string) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Keyboard shortcut for search */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        (document.getElementById('navbar-search') as HTMLInputElement)?.focus();
      }
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    router.push('/auth/login');
  };

  return (
    <header
      className="h-14 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shrink-0"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-hairline)',
        boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
      }}
    >
      {/* ── Left — Hamburger + Breadcrumb ─────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors lg:hidden focus:outline-none"
            aria-label="Toggle navigation"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        )}

        {/* Page title — mobile only */}
        {title && (
          <span className="text-sm font-bold text-slate-800 font-outfit lg:hidden truncate">
            {title}
          </span>
        )}
      </div>

      {/* ── Center — Search ────────────────────────────────── */}
      <div className="hidden md:flex flex-1 max-w-xs mx-6">
        <div
          className="relative w-full"
          style={{ maxWidth: 320 }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            id="navbar-search"
            type="text"
            placeholder="Search…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-9 pl-9 pr-12 text-sm text-slate-700 placeholder-slate-400 rounded-xl transition-all"
            style={{
              background: searchFocused ? '#FFFFFF' : 'var(--surface-subtle)',
              border: `1px solid ${searchFocused ? 'var(--border-focus)' : 'var(--border-hairline)'}`,
              boxShadow: searchFocused ? '0 0 0 3px rgba(13,71,161,0.08)' : 'none',
              outline: 'none',
            }}
          />
          {/* Keyboard shortcut hint */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-50">
            <kbd className="flex items-center justify-center w-4 h-4 text-[9px] font-bold text-slate-500 bg-slate-100 rounded border border-slate-200">
              <Command className="w-2.5 h-2.5" />
            </kbd>
            <kbd className="flex items-center justify-center px-1 h-4 text-[9px] font-bold text-slate-500 bg-slate-100 rounded border border-slate-200">
              K
            </kbd>
          </div>
        </div>
      </div>

      {/* ── Right — Actions ────────────────────────────────── */}
      <div className="flex items-center gap-2">

        {/* Role badge — desktop only */}
        <div
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: rm.bg,
            color: rm.color,
            border: `1px solid ${rm.border}`,
          }}
        >
          <RoleIcon className="h-3 w-3" />
          {rm.label}
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => router.push(notifHref)}
          className="relative h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {/* Unread indicator */}
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2 border-white"
            style={{ background: 'var(--capvia-danger)' }}
          />
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 h-9 px-1.5 pr-2 rounded-xl transition-all focus:outline-none"
            style={{
              background: dropdownOpen ? 'var(--surface-subtle)' : 'transparent',
              border: `1px solid ${dropdownOpen ? 'var(--border-default)' : 'transparent'}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-subtle)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hairline)';
            }}
            onMouseLeave={(e) => {
              if (!dropdownOpen) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
              }
            }}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
          >
            {/* Avatar */}
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
              style={{ background: 'linear-gradient(135deg, #0D47A1, #42A5F5)' }}
              suppressHydrationWarning
            >
              {initials}
            </div>

            {/* Name — desktop */}
            <div className="hidden md:flex flex-col text-left leading-none">
              <span className="text-[12px] font-semibold text-slate-800" suppressHydrationWarning>
                {isMounted ? (user?.full_name?.split(' ')[0] || 'User') : 'User'}
              </span>
            </div>

            <ChevronDown
              className="h-3 w-3 text-slate-400 transition-transform duration-150"
              style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {/* Dropdown panel */}
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div
                className="absolute right-0 top-[calc(100%+6px)] w-60 z-50 animate-scale-in"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-5)',
                }}
                role="menu"
              >
                {/* User info */}
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border-hairline)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0D47A1, #42A5F5)' }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-900 truncate leading-tight">
                        {user?.full_name || 'User'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  {/* Role badge */}
                  <div className="mt-2.5">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        background: rm.bg,
                        color: rm.color,
                        border: `1px solid ${rm.border}`,
                      }}
                    >
                      <RoleIcon className="h-2.5 w-2.5" />
                      {rm.label}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1.5 px-1.5">
                  <button
                    type="button"
                    onClick={() => { setDropdownOpen(false); router.push(profileHref); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 rounded-lg transition-colors text-left hover:bg-slate-50 hover:text-slate-900"
                    role="menuitem"
                  >
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>Your Profile</span>
                    <ExternalLink className="h-3 w-3 text-slate-300 ml-auto" />
                  </button>

                  {role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => { setDropdownOpen(false); router.push('/admin/settings'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-700 rounded-lg transition-colors text-left hover:bg-slate-50 hover:text-slate-900"
                      role="menuitem"
                    >
                      <Settings className="h-3.5 w-3.5 text-slate-400" />
                      <span>Platform Settings</span>
                    </button>
                  )}

                  {/* Upgrade hint for candidates */}
                  {role === 'candidate' && (
                    <div
                      className="mx-1 mt-1 mb-0.5 px-3 py-2 rounded-lg flex items-center gap-2"
                      style={{ background: 'var(--capvia-primary-light)', border: '1px solid rgba(13,71,161,0.1)' }}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                      <p className="text-[11px] font-semibold text-primary-700">
                        Your verified DNA profile is active
                      </p>
                    </div>
                  )}
                </div>

                {/* Logout */}
                <div
                  className="py-1.5 px-1.5"
                  style={{ borderTop: '1px solid var(--border-hairline)' }}
                >
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-danger-600 rounded-lg transition-colors text-left hover:bg-danger-50"
                    role="menuitem"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
