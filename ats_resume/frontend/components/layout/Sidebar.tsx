"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  FileText,
  LayoutDashboard,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import clsx from "clsx";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const STUDENT_NAV: NavItem[] = [
  { label: "Dashboard",    href: "/student/dashboard",  icon: LayoutDashboard },
  { label: "Upload Resume", href: "/student/upload",    icon: Upload },
  { label: "My Analyses",  href: "/student/analysis",   icon: BrainCircuit },
  { label: "Internships",  href: "/student/internship", icon: BookOpen },
  { label: "My Progress",  href: "/student/progress",   icon: TrendingUp },
];

const HR_NAV: NavItem[] = [
  { label: "Dashboard",    href: "/hr/dashboard",   icon: LayoutDashboard },
  { label: "Candidates",   href: "/hr/candidates",  icon: Users },
  { label: "Internships",  href: "/hr/internship",  icon: BookOpen },
  { label: "Analytics",    href: "/hr/analytics",   icon: BarChart3 },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Admin Panel",  href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "All Users",    href: "/admin/users",     icon: Users },
  { label: "Reports",      href: "/admin/reports",   icon: FileText },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navItems =
    user?.role === "HR"
      ? HR_NAV
      : user?.role === "ADMIN"
      ? ADMIN_NAV
      : STUDENT_NAV;

  const roleGradient =
    user?.role === "HR"
      ? "from-emerald-500 to-teal-600"
      : user?.role === "ADMIN"
      ? "from-rose-500 to-pink-600"
      : "from-indigo-500 to-purple-600";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          "fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-slate-200",
          "flex flex-col transition-transform duration-300 ease-in-out",
          "lg:relative lg:translate-x-0 lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">
              CAP<span className="text-indigo-600">VIA</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* User card */}
        <div className="p-4">
          <div className={`rounded-xl bg-gradient-to-br ${roleGradient} p-4 text-white`}>
            <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center font-bold text-sm mb-2">
              {user?.full_name
                ?.split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() ?? "U"}
            </div>
            <p className="font-semibold text-sm leading-tight truncate">
              {user?.full_name ?? "User"}
            </p>
            <p className="text-xs text-white/70 truncate mt-0.5">{user?.email}</p>
            <span className="mt-2 inline-block text-2xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
              {user?.role === "HR"
                ? "HR Manager"
                : user?.role === "ADMIN"
                ? "Administrator"
                : "Student"}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
          <p className="px-3 py-2 text-2xs font-semibold uppercase tracking-widest text-slate-400">
            Main Menu
          </p>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/student/dashboard" &&
                item.href !== "/hr/dashboard" &&
                pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose()}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                )}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-indigo-600" : "text-slate-400"}
                />
                {item.label}
                {item.badge && (
                  <span className="ml-auto badge badge-rose text-2xs">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Zap size={12} className="text-indigo-400" />
            <span>CAPVIA v2.0 — AI Engine Active</span>
          </div>
        </div>
      </aside>
    </>
  );
}
