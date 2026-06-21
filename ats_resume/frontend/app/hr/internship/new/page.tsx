"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import JDForm from "@/components/hr/JDForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PostNewInternshipPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <Navbar 
          onMenuToggle={() => setSidebarOpen((p) => !p)} 
          sidebarOpen={sidebarOpen} 
        />
        
        <main className="flex-1 page-container overflow-y-auto">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 mb-6 text-sm text-slate-500 animate-slide-up">
            <Link href="/hr/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/hr/internship" className="hover:text-indigo-600 transition-colors">Internships</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Post New</span>
          </nav>

          <div className="mb-8">
            <Link 
              href="/hr/internship" 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              Back to Internships
            </Link>
          </div>

          <JDForm id="new" />
        </main>

        <Footer />
      </div>
    </div>
  );
}
