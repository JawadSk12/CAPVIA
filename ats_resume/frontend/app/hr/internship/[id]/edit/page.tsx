"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import JDForm from "@/components/hr/JDForm";
import { internshipApi } from "@/lib/api";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import type { InternshipDetail } from "@/types/ats";

export default function EditInternshipPage() {
  const { id } = useParams<{ id: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [internship, setInternship] = useState<InternshipDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || id === "new") return;
    internshipApi
      .get(id)
      .then(setInternship)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="main-content">
        <Navbar 
          onMenuToggle={() => setSidebarOpen((p) => !p)} 
          sidebarOpen={sidebarOpen} 
        />
        
        <main className="flex-1 page-container overflow-y-auto">
          {loading ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="h-10 w-1/3 skeleton" />
              <SkeletonCard rows={8} />
            </div>
          ) : internship ? (
            <JDForm id={id} initialData={internship} />
          ) : (
            <div className="text-center py-20 text-slate-500">
              Internship not found.
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
