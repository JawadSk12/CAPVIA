'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, Inbox, FileText, Terminal, Video, Dna,
  PieChart, User, Bell, Settings, HelpCircle, LogOut, X, BrainCircuit,
  Building, Users, Trophy, BarChart, CreditCard, UserCheck,
  Bookmark, Cpu, ScrollText, HeartPulse, BarChart2,
  GraduationCap, Target, ChevronRight, ChevronLeft, Menu,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

interface SidebarProps { isOpen: boolean; onClose: () => void; }
interface NavLink { href: string; label: string; icon: React.ElementType; badge?: string }
interface NavGroup { label: string; links: NavLink[] }

/* ── Navigation Definitions ─────────────────────────────────── */
const candidateGroups: NavGroup[] = [
  {
    label: 'My Career',
    links: [
      { href: '/dashboard',         label: 'Dashboard',     icon: LayoutDashboard },
      { href: '/internships',       label: 'Browse Jobs',   icon: Briefcase },
      { href: '/internships/saved', label: 'Saved Jobs',    icon: Bookmark },
      { href: '/applications',      label: 'Applications',  icon: Inbox },
    ],
  },
  {
    label: 'AI Assessments',
    links: [
      { href: '/candidate/ats',        label: 'Resume Scanner', icon: FileText },
      { href: '/candidate/simulation', label: 'Coding Test',    icon: Terminal },
      { href: '/candidate/interview',  label: 'AI Interview',   icon: Video },
      { href: '/candidate/results',    label: 'DNA Profile',    icon: Dna },
      { href: '/candidate/reports',    label: 'My Reports',     icon: PieChart },
    ],
  },
  {
    label: 'Account',
    links: [
      { href: '/candidate/profile', label: 'Profile',       icon: User },
      { href: '/notifications',     label: 'Notifications', icon: Bell },
      { href: '/settings',          label: 'Settings',      icon: Settings },
      { href: '/help',              label: 'Help Center',   icon: HelpCircle },
    ],
  },
];

const hrGroups: NavGroup[] = [
  {
    label: 'Hiring Workspace',
    links: [
      { href: '/hr/dashboard',    label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/hr/company',      label: 'My Company', icon: Building },
      { href: '/hr/internships',  label: 'Job Posts',  icon: Briefcase },
      { href: '/hr/candidates',   label: 'Candidates', icon: Users },
      { href: '/hr/applications', label: 'Pipeline',   icon: Inbox },
    ],
  },
  {
    label: 'AI Intelligence',
    links: [
      { href: '/hr/rankings',  label: 'Leaderboard', icon: Trophy },
      { href: '/hr/dna',       label: 'DNA Profiles', icon: Dna },
      { href: '/hr/reports',   label: 'Reports',      icon: FileText },
      { href: '/hr/analytics', label: 'Analytics',    icon: BarChart },
    ],
  },
  {
    label: 'Admin',
    links: [
      { href: '/hr/team',          label: 'Team',          icon: UserCheck },
      { href: '/hr/billing',       label: 'Billing',       icon: CreditCard },
      { href: '/hr/notifications', label: 'Notifications', icon: Bell },
      { href: '/hr/settings',      label: 'Settings',      icon: Settings },
      { href: '/hr/support',       label: 'Support',       icon: HelpCircle },
    ],
  },
];

const adminGroups: NavGroup[] = [
  {
    label: 'Platform Overview',
    links: [
      { href: '/admin/dashboard', label: 'Dashboard',       icon: LayoutDashboard },
      { href: '/admin/analytics', label: 'Analytics',       icon: BarChart2 },
      { href: '/admin/health',    label: 'Platform Health', icon: HeartPulse },
    ],
  },
  {
    label: 'Pipeline',
    links: [
      { href: '/admin/users',        label: 'Users',        icon: Users },
      { href: '/admin/companies',    label: 'Companies',    icon: Building },
      { href: '/admin/internships',  label: 'Internships',  icon: Briefcase },
      { href: '/admin/applications', label: 'Applications', icon: Inbox },
    ],
  },
  {
    label: 'AI Engines',
    links: [
      { href: '/admin/engines', label: 'Engine Monitor', icon: Cpu },
      { href: '/admin/reports', label: 'Reports',        icon: FileText },
    ],
  },
  {
    label: 'System',
    links: [
      { href: '/admin/logs',          label: 'Audit Logs',    icon: ScrollText },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/settings',      label: 'Settings',      icon: Settings },
    ],
  },
];

const ROLE_META: Record<string, { tagline: string; badge: string; badgeCls: string; accent: string }> = {
  hr: {
    tagline: 'Hiring OS',
    badge: 'HR',
    badgeCls: 'bg-[#FFC107]/15 text-[#FFC107] border-[#FFC107]/25',
    accent: '#42A5F5',
  },
  admin: {
    tagline: 'Admin Panel',
    badge: 'ADMIN',
    badgeCls: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
    accent: '#A78BFA',
  },
  candidate: {
    tagline: 'Career Portal',
    badge: 'CANDIDATE',
    badgeCls: 'bg-[#42A5F5]/15 text-[#42A5F5] border-[#42A5F5]/25',
    accent: '#42A5F5',
  },
};

/* ── Sidebar Component ──────────────────────────────────────── */
export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Use stable values before mount to avoid hydration mismatch
  const role = isMounted ? (user?.role || 'candidate') : 'candidate';
  const groups =
    role === 'admin' ? adminGroups :
    role === 'hr'    ? hrGroups    :
                       candidateGroups;

  const meta = ROLE_META[role] || ROLE_META.candidate;
  // Compute initials — empty string before mount so SSR matches client
  const initials = isMounted
    ? (user?.full_name || user?.email || 'U')
        .split(' ')
        .map((w: string) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const sidebarWidth = collapsed ? 'w-[64px]' : 'w-[240px]';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-cosmos-900/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col',
          'border-r transition-all duration-220 ease-smooth will-change-transform',
          'lg:translate-x-0 lg:static lg:h-screen',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarWidth,
        )}
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)',
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1), transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        aria-label="Primary navigation"
      >
        {/* ── Header ────────────────────────────────────────── */}
        <div
          className="shrink-0 px-3 py-4"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          {/* Logo row */}
          <div className={cn(
            'flex items-center',
            collapsed ? 'justify-center' : 'justify-between',
            'mb-3',
          )}>
            <Link
              href="/"
              className={cn(
                'flex items-center gap-2.5 group',
                collapsed && 'justify-center',
              )}
            >
              {/* Logo mark */}
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
                <BrainCircuit className="w-4.5 h-4.5 text-white" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <span className="text-[15px] font-black tracking-tight font-outfit text-white block leading-none">
                    CAPVIA
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/35 leading-none mt-0.5 block">
                    {meta.tagline}
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop collapse toggle */}
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="hidden lg:flex p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Mobile close */}
            <button
              onClick={onClose}
              className={cn(
                'lg:hidden p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors',
                collapsed && 'hidden',
              )}
              aria-label="Close sidebar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Collapsed expand button */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden lg:flex w-full items-center justify-center p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors mt-1"
              aria-label="Expand sidebar"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
          )}

          {/* User card */}
          {!collapsed && isMounted && user && (
            <div
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl mt-1"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                style={{ background: 'linear-gradient(135deg, #0D47A1, #42A5F5)' }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-white truncate leading-tight">
                  {user.full_name || user.email}
                </p>
                <span
                  className={cn(
                    'inline-block text-[8px] font-black px-1.5 py-0.5 rounded-full border leading-none mt-0.5',
                    meta.badgeCls,
                  )}
                  style={{ letterSpacing: '0.06em' }}
                >
                  {meta.badge}
                </span>
              </div>
            </div>
          )}

          {/* Collapsed avatar */}
          {collapsed && isMounted && user && (
            <div className="flex justify-center mt-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                style={{ background: 'linear-gradient(135deg, #0D47A1, #42A5F5)' }}
                title={user.full_name || user.email}
              >
                {initials}
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation ────────────────────────────────────── */}
        <nav
          className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin"
          aria-label="Sidebar navigation"
        >
          {groups.map((group) => (
            <div key={group.label}>
              {/* Group label */}
              {!collapsed && (
                <p
                  className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--sidebar-text-muted)', letterSpacing: '0.12em' }}
                >
                  {group.label}
                </p>
              )}

              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const active = pathname === link.href || pathname?.startsWith(link.href + '/');

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      title={collapsed ? link.label : undefined}
                      className={cn(
                        'flex items-center rounded-xl transition-all duration-100 relative group',
                        collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 h-9 px-2.5',
                        active
                          ? 'text-white'
                          : 'hover:text-white',
                      )}
                      style={
                        active
                          ? { background: 'var(--sidebar-active-bg)', color: 'white' }
                          : { color: 'var(--sidebar-text)' }
                      }
                      onMouseEnter={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)';
                          (e.currentTarget as HTMLElement).style.color = 'white';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = '';
                          (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
                        }
                      }}
                    >
                      {/* Active indicator bar */}
                      {active && !collapsed && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 rounded-r-full"
                          style={{ background: 'var(--sidebar-active-bar)' }}
                        />
                      )}

                      <Icon
                        className="w-4 h-4 shrink-0 transition-colors"
                        style={{ color: active ? '#42A5F5' : undefined }}
                      />

                      {!collapsed && (
                        <span className="text-[13px] font-medium truncate flex-1 leading-none">
                          {link.label}
                        </span>
                      )}

                      {!collapsed && link.badge && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-danger-500 text-white">
                          {link.badge}
                        </span>
                      )}

                      {!collapsed && active && (
                        <ChevronRight
                          className="w-3 h-3 shrink-0 opacity-50"
                          style={{ color: '#42A5F5' }}
                        />
                      )}

                      {/* Tooltip for collapsed */}
                      {collapsed && (
                        <span className="absolute left-full ml-3 px-2.5 py-1 bg-cosmos-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-4"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          {link.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Footer — Logout ────────────────────────────────── */}
        <div
          className="shrink-0 p-2"
          style={{ borderTop: '1px solid var(--sidebar-border)' }}
        >
          <button
            onClick={() => { logout(); window.location.href = '/auth/login'; }}
            className={cn(
              'flex items-center rounded-xl transition-all duration-100',
              collapsed ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 h-9 px-2.5 w-full',
            )}
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
              (e.currentTarget as HTMLElement).style.color = '#FCA5A5';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)';
            }}
            title={collapsed ? 'Log Out' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="text-[13px] font-medium">Log Out</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
