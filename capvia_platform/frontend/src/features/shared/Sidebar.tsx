'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Briefcase, Inbox, FileText, Terminal, Video, Dna,
  PieChart, User, Bell, Settings, HelpCircle, LogOut, X, BrainCircuit,
  Building, Users, Trophy, BarChart, CreditCard, UserCheck,
  Bookmark, Cpu, ScrollText, HeartPulse, BarChart2, Sparkles,
  GraduationCap, Target, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

interface SidebarProps { isOpen: boolean; onClose: () => void; }
interface NavLink { href: string; label: string; icon: React.ElementType; badge?: string }
interface NavGroup { label: string; links: NavLink[] }

// ── Candidate navigation ────────────────────────────────────────
const candidateGroups: NavGroup[] = [
  {
    label: 'My Career',
    links: [
      { href: '/dashboard',            label: 'Dashboard',      icon: LayoutDashboard },
      { href: '/internships',          label: 'Browse Jobs',    icon: Briefcase },
      { href: '/internships/saved',    label: 'Saved Jobs',     icon: Bookmark },
      { href: '/applications',         label: 'My Applications',icon: Inbox },
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

// ── HR navigation ───────────────────────────────────────────────
const hrGroups: NavGroup[] = [
  {
    label: 'Hiring Workspace',
    links: [
      { href: '/hr/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/hr/company',      label: 'My Company',   icon: Building },
      { href: '/hr/internships',  label: 'Job Posts',    icon: Briefcase },
      { href: '/hr/candidates',   label: 'Candidates',   icon: Users },
      { href: '/hr/applications', label: 'Pipeline',     icon: Inbox },
    ],
  },
  {
    label: 'AI Intelligence',
    links: [
      { href: '/hr/rankings',   label: 'Leaderboard', icon: Trophy },
      { href: '/hr/dna',        label: 'DNA Profiles', icon: Dna },
      { href: '/hr/reports',    label: 'Reports',      icon: FileText },
      { href: '/hr/analytics',  label: 'Analytics',    icon: BarChart },
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

// ── Admin navigation ────────────────────────────────────────────
const adminGroups: NavGroup[] = [
  {
    label: 'Platform Overview',
    links: [
      { href: '/admin/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
      { href: '/admin/analytics',  label: 'Analytics',       icon: BarChart2 },
      { href: '/admin/health',     label: 'Platform Health', icon: HeartPulse },
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

// ── Sidebar brand config per role ───────────────────────────────
const roleBrand: Record<string, {
  headerBg: string;
  headerText: string;
  brand: string;
  tagline: string;
  activeBg: string;
  activeText: string;
  activeIconColor: string;
  badgeCls: string;
  badgeLabel: string;
}> = {
  hr: {
    headerBg: 'bg-gradient-to-br from-[#0D47A1] to-[#1565C0]',
    headerText: 'text-white',
    brand: 'CAPVIA',
    tagline: 'Hiring OS',
    activeBg: 'bg-white/15',
    activeText: 'text-white',
    activeIconColor: 'text-[#FFC107]',
    badgeCls: 'bg-[#FFC107] text-[#0D47A1]',
    badgeLabel: 'HR',
  },
  admin: {
    headerBg: 'bg-gradient-to-br from-slate-900 to-slate-800',
    headerText: 'text-white',
    brand: 'CAPVIA',
    tagline: 'Admin Panel',
    activeBg: 'bg-white/10',
    activeText: 'text-white',
    activeIconColor: 'text-violet-300',
    badgeCls: 'bg-violet-500 text-white',
    badgeLabel: 'ADMIN',
  },
  candidate: {
    headerBg: 'bg-white',
    headerText: 'text-slate-900',
    brand: 'CAPVIA',
    tagline: 'Career Portal',
    activeBg: 'bg-[#0D47A1]/8',
    activeText: 'text-[#0D47A1]',
    activeIconColor: 'text-[#0D47A1]',
    badgeCls: 'bg-blue-100 text-[#0D47A1] border border-blue-200',
    badgeLabel: 'CANDIDATE',
  },
};

// ── Component ───────────────────────────────────────────────────
export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const role = user?.role || 'candidate';

  const groups =
    role === 'admin' ? adminGroups :
    role === 'hr'    ? hrGroups    :
                       candidateGroups;

  const brand = roleBrand[role] || roleBrand.candidate;
  const isHrOrAdmin = role === 'hr' || role === 'admin';
  const sidebarBg = isHrOrAdmin ? 'bg-[#0D47A1]' : 'bg-white';
  const borderCls = isHrOrAdmin ? 'border-white/10' : 'border-slate-100';
  const groupLabelCls = isHrOrAdmin ? 'text-blue-200/60' : 'text-slate-400';
  const linkBase = isHrOrAdmin
    ? 'text-blue-100/80 hover:text-white hover:bg-white/10'
    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50';
  const activeLinkCls = isHrOrAdmin
    ? 'bg-white/15 text-white'
    : 'bg-[#0D47A1]/8 text-[#0D47A1]';
  const activeIconCls = isHrOrAdmin ? 'text-[#FFC107]' : 'text-[#0D47A1]';
  const inactiveIconCls = isHrOrAdmin ? 'text-blue-200/50' : 'text-slate-400';
  const footerBg = isHrOrAdmin ? 'bg-white/10 border-white/10' : 'bg-slate-50 border-slate-100';
  const footerText = isHrOrAdmin ? 'text-white' : 'text-slate-800';
  const footerSub = isHrOrAdmin ? 'text-blue-200/60' : 'text-slate-400';
  const logoutCls = isHrOrAdmin
    ? 'text-blue-200/70 hover:text-white hover:bg-white/10'
    : 'text-slate-500 hover:text-red-600 hover:bg-red-50';

  return (
    <>
      {isOpen && (
        <div onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden" />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 w-64 flex flex-col z-50 border-r transition-transform duration-300',
        sidebarBg, borderCls,
        'lg:translate-x-0 lg:static lg:h-screen',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className={cn('h-auto px-4 pt-5 pb-4 border-b shrink-0', borderCls)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shadow-md border border-slate-100">
                <img src="/logo.png" alt="CAPVIA Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className={cn('text-base font-black tracking-tight font-outfit', isHrOrAdmin ? 'text-white' : 'text-slate-900')}>
                  {brand.brand}
                </span>
              </div>
            </div>
            <button onClick={onClose}
              className={cn('lg:hidden p-1 rounded-lg transition-colors', isHrOrAdmin ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700')}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tagline + role badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isHrOrAdmin
                ? <Target className="w-3 h-3 text-[#FFC107]" />
                : <GraduationCap className="w-3 h-3 text-[#42A5F5]" />
              }
              <span className={cn('text-[10px] font-semibold', isHrOrAdmin ? 'text-blue-200/80' : 'text-slate-500')}>
                {brand.tagline}
              </span>
            </div>
            <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full', brand.badgeCls)}>
              {brand.badgeLabel}
            </span>
          </div>

          {/* User quick preview */}
          {user && (
            <div className={cn('flex items-center gap-2.5 mt-3 px-2.5 py-2 rounded-xl border', footerBg)}>
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0',
                isHrOrAdmin ? 'bg-[#FFC107] text-[#0D47A1]' : 'bg-[#0D47A1]'
              )}>
                {(user.full_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn('text-[11px] font-bold truncate', footerText)}>
                  {user.full_name || user.email}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Nav ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin">
          {groups.map((group) => (
            <div key={group.label}>
              <p className={cn('px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest', groupLabelCls)}>
                {group.label}
              </p>
              <nav className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const active = pathname === link.href || pathname?.startsWith(link.href + '/');
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 text-[13px] font-semibold rounded-xl transition-all duration-150',
                        active ? activeLinkCls : linkBase
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('h-4 w-4 flex-shrink-0', active ? activeIconCls : inactiveIconCls)} />
                        <span>{link.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {link.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                            {link.badge}
                          </span>
                        )}
                        {active && <ChevronRight className={cn('w-3 h-3', activeIconCls)} />}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className={cn('p-3 border-t shrink-0', borderCls)}>
          <button
            onClick={() => { logout(); window.location.href = '/auth/login'; }}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-[13px] font-semibold rounded-xl transition-all',
              logoutCls
            )}
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
