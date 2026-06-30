'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, User, LogOut, ChevronDown, Menu, Shield, Building, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/auth';

interface NavbarProps {
  onToggleSidebar?: () => void;
  title?: string;
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  admin:     { label: 'Admin',     color: '#0D47A1', bg: '#EFF6FF',  icon: Shield },
  hr:        { label: 'HR',        color: '#10B981', bg: '#ECFDF5',  icon: Building },
  candidate: { label: 'Candidate', color: '#7C3AED', bg: '#F5F3FF',  icon: User },
};

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, title = '' }) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const role    = user?.role || 'candidate';
  const rm      = ROLE_META[role] || ROLE_META.candidate;
  const RoleIcon = rm.icon;

  const notifHref = role === 'admin' ? '/admin/notifications' : '/notifications';
  const profileHref = role === 'admin' ? '/admin/settings' : role === 'hr' ? '/hr/settings' : '/candidate/profile';

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between sticky top-0 z-40">
      {/* Left — Hamburger + mobile title */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button onClick={onToggleSidebar}
            className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-500 lg:hidden focus:outline-none transition-colors">
            <Menu className="h-5 w-5" />
          </button>
        )}
        <span className="text-base font-black text-slate-900 font-outfit lg:hidden">{title || 'CAPVIA'}</span>
      </div>

      {/* Right — Notifications + Profile */}
      <div className="flex items-center gap-2">

        {/* Role badge — desktop only */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
          style={{ background: rm.bg, color: rm.color, borderColor: `${rm.color}25` }}>
          <RoleIcon className="h-3 w-3" />
          {rm.label}
        </div>

        {/* Notification Bell */}
        <button type="button" onClick={() => router.push(notifHref)}
          className="relative p-2 text-slate-400 hover:text-[#0D47A1] hover:bg-slate-50 rounded-xl transition-colors focus:outline-none">
          <Bell className="h-4.5 w-4.5" />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#EF4444] border-2 border-white" />
        </button>

        {/* Profile dropdown */}
        <div className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-xl transition-colors focus:outline-none border border-transparent hover:border-slate-200">
            {/* Avatar */}
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-black"
              style={{ background: 'linear-gradient(135deg,#0D47A1,#42A5F5)' }}>
              {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-[12px] font-bold text-slate-800 leading-none">{user?.full_name || 'User'}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">{user?.email}</span>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-[calc(100%+6px)] w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-left">
                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
                  <p className="text-[12px] font-bold text-slate-900 mt-0.5 truncate">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full w-fit text-[9px] font-black uppercase tracking-wider border"
                    style={{ background: rm.bg, color: rm.color, borderColor: `${rm.color}25` }}>
                    <RoleIcon className="h-2.5 w-2.5" />
                    {rm.label}
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1.5">
                  <button type="button"
                    onClick={() => { setDropdownOpen(false); router.push(profileHref); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0D47A1] transition-colors text-left">
                    <User className="h-3.5 w-3.5" />
                    <span>Your Profile</span>
                  </button>
                  {role === 'admin' && (
                    <button type="button"
                      onClick={() => { setDropdownOpen(false); router.push('/admin/settings'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0D47A1] transition-colors text-left">
                      <Settings className="h-3.5 w-3.5" />
                      <span>Platform Settings</span>
                    </button>
                  )}
                </div>

                {/* Logout */}
                <div className="border-t border-slate-100 pt-1.5 pb-1">
                  <button type="button" onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-[#EF4444] hover:bg-red-50 transition-colors text-left">
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
