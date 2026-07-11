'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ChevronRight, Home } from 'lucide-react';

interface UnifiedLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export const UnifiedLayout: React.FC<UnifiedLayoutProps> = ({
  children,
  title,
  breadcrumbs,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen flex font-sans"
      style={{ background: 'var(--surface-canvas)', color: '#0F172A' }}
    >
      {/* Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top navbar */}
        <Navbar
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
          title={title}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div
            className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8 animate-fade-in"
          >

            {/* Breadcrumb / page header */}
            {(breadcrumbs || title) && (
              <div className="mb-6">
                <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
                  <Link
                    href="/"
                    className="flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Home"
                  >
                    <Home className="h-3.5 w-3.5" />
                  </Link>

                  {breadcrumbs ? (
                    breadcrumbs.map((crumb, idx) => (
                      <React.Fragment key={idx}>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        {crumb.href ? (
                          <Link
                            href={crumb.href}
                            className="text-[12px] font-medium text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="text-[12px] font-semibold text-slate-700">
                            {crumb.label}
                          </span>
                        )}
                      </React.Fragment>
                    ))
                  ) : title ? (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      <span className="text-[12px] font-semibold text-slate-700">
                        {title}
                      </span>
                    </>
                  ) : null}
                </nav>
              </div>
            )}

            {/* Page children */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UnifiedLayout;
