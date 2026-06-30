import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

interface UnifiedLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export const UnifiedLayout: React.FC<UnifiedLayoutProps> = ({ children, title, breadcrumbs }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex font-sans text-slate-800 bg-[#F8FAFC]">
      {/* Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header navbar */}
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title={title} />

        {/* Page Content Panel */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          
          {/* Breadcrumbs (Optional but requested by design system) */}
          {(breadcrumbs || title) && (
            <div className="max-w-7xl mx-auto mb-6 px-2">
              <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500">
                {breadcrumbs ? (
                  breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={idx}>
                      {crumb.href ? (
                        <a href={crumb.href} className="hover:text-[#0D47A1] transition-colors">{crumb.label}</a>
                      ) : (
                        <span className="text-slate-800 font-bold">{crumb.label}</span>
                      )}
                      {idx < breadcrumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                    </React.Fragment>
                  ))
                ) : (
                  <>
                    <span className="text-slate-400">Workspace</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <span className="text-slate-800 font-bold">{title}</span>
                  </>
                )}
              </nav>
            </div>
          )}

          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
export default UnifiedLayout;
