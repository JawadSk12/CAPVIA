import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, LogOut, FileText, Sparkles,
    Brain, Monitor, Trophy, BarChart3, ChevronRight, Zap
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const navigation = [
    { name: 'Dashboard',        href: '/admin/dashboard',    icon: LayoutDashboard },
    { name: 'Role Simulations', href: '/admin/simulations',  icon: Brain },
    { name: 'Live Monitor',     href: '/admin/monitor',      icon: Monitor },
    { name: 'Candidates',       href: '/admin/candidates',   icon: Users },
    { name: 'Rankings',         href: '/admin/rankings',     icon: Trophy },
    { name: 'Question Bank',    href: '/admin/questions',    icon: FileText },
    { name: 'Analytics',        href: '/admin/analytics',    icon: BarChart3 },
];

export const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();

    const handleLogout = () => { logout(); navigate('/login'); };
    const isActive = (path: string) => location.pathname.startsWith(path);

    return (
        <div className="min-h-screen bg-gray-950 flex">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-60 bg-gray-900 border-r border-gray-800 flex flex-col z-40">
                {/* Logo */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
                    <div className="h-9 w-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-tight">AssessAI</h1>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">HR Console</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {navigation.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all group ${
                                    active
                                        ? 'bg-violet-500/15 text-violet-400 font-semibold'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className={`h-4 w-4 ${active ? 'text-violet-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                                    <span>{item.name}</span>
                                </div>
                                {active && <ChevronRight className="h-3.5 w-3.5 text-violet-400" />}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div className="p-3 border-t border-gray-800">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {(user?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-200 truncate">{user?.full_name || 'Admin'}</p>
                            <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                        </div>
                        <button onClick={handleLogout} className="text-gray-600 hover:text-gray-300 transition-colors" title="Logout">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="pl-60 flex-1 min-h-screen bg-gray-950">
                <div className="p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};