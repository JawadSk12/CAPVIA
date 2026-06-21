"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { SkeletonCard } from "@/components/shared/LoadingSpinner";
import FileUpload from "@/components/shared/FileUpload";
import { internshipApi, resumeApi } from "@/lib/api";
import type { InternshipSummary, InternshipDetail, ResumeStatusResponse } from "@/types/ats";
import {
  ArrowRight, BookOpen, Briefcase, Building2, Calendar, CheckCircle, Clock,
  Search, Zap, MapPin, Layers, UploadCloud, X, Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { useRouter } from "next/navigation";

export default function StudentInternshipPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [internships, setInternships] = useState<InternshipSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Selected internship state
  const [selectedInternship, setSelectedInternship] = useState<InternshipSummary | null>(null);
  const [internshipDetail, setInternshipDetail] = useState<InternshipDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Application Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [applyStep, setApplyStep] = useState<"UPLOAD" | "PROCESSING" | "SUCCESS">("UPLOAD");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusResponse, setStatusResponse] = useState<ResumeStatusResponse | null>(null);
  const [finalResumeId, setFinalResumeId] = useState<string | null>(null);

  // Poll Ref
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch list on mount
  useEffect(() => {
    internshipApi.list(true)
      .then((data) => {
        setInternships(data);
        if (data.length > 0) handleSelectInternship(data[0]);
      })
      .catch(() => toast.error("Failed to load internships"))
      .finally(() => setLoading(false));
      
    return () => stopPolling();
  }, []);

  const handleSelectInternship = async (intern: InternshipSummary) => {
    setSelectedInternship(intern);
    setInternshipDetail(null);
    setDetailLoading(true);
    try {
      const detail = await internshipApi.get(intern.id);
      setInternshipDetail(detail);
    } catch (err) {
      toast.error("Failed to load details");
    } finally {
      setDetailLoading(false);
    }
  };

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const handleApply = async () => {
    if (!file || !selectedInternship) return;
    
    setApplyStep("PROCESSING");
    
    try {
      const res = await resumeApi.upload(
        file, 
        "INTERNSHIP", 
        selectedInternship.id,
        (p) => setUploadProgress(p)
      );
      
      const rId = res.resume_id;
      setFinalResumeId(rId);
      
      // Start polling
      pollInterval.current = setInterval(async () => {
        try {
          const statusRes = await resumeApi.getStatus(rId);
          setStatusResponse(statusRes);
          
          if (statusRes.status === "COMPLETED" || statusRes.status === "DONE") {
             stopPolling();
             setApplyStep("SUCCESS");
          } else if (statusRes.status === "FAILED" || statusRes.status === "ERROR") {
             stopPolling();
             toast.error(statusRes.error_message || "Processing failed");
             setApplyStep("UPLOAD");
          }
        } catch (err) {
          // ignore network hiccups
        }
      }, 2000);
      
    } catch (err: any) {
       toast.error(err?.response?.data?.detail || "Upload failed");
       setApplyStep("UPLOAD");
    }
  };

  const resetModal = () => {
    setModalOpen(false);
    setApplyStep("UPLOAD");
    setFile(null);
    setUploadProgress(0);
    setStatusResponse(null);
    stopPolling();
  };

  const handleStartSimulation = () => {
     toast.success("AI Simulation Demo started! (This is a dummy action)");
  };

  const filtered = internships.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) || 
    i.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-layout bg-slate-50 h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content flex flex-col h-screen">
        <Navbar onMenuToggle={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} />

        <main className="flex-1 flex overflow-hidden">
           {/* Left Pane - List */}
           <div className="w-[35%] min-w-[320px] max-w-[450px] border-r border-slate-200 bg-white flex flex-col h-full z-10 shadow-[2px_0_15px_-3px_rgba(0,0,0,0.05)]">
             <div className="p-5 border-b border-slate-100 bg-white z-20">
               <h1 className="text-xl font-bold text-slate-800 mb-4">Discover Roles</h1>
               <div className="relative">
                 <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input
                   type="text"
                   placeholder="Search internships..."
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="input pl-10 bg-slate-50 border-slate-200 focus:bg-white"
                 />
               </div>
             </div>

             <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24">
               {loading ? (
                 [1, 2, 3, 4].map(n => <div key={n} className="h-32 bg-slate-100 animate-pulse rounded-xl" />)
               ) : filtered.length === 0 ? (
                 <div className="p-8 text-center text-slate-500">No internships found.</div>
               ) : (
                 filtered.map((intern) => {
                   const isSelected = selectedInternship?.id === intern.id;
                   return (
                     <div 
                       key={intern.id}
                       onClick={() => handleSelectInternship(intern)}
                       className={clsx(
                         "p-4 rounded-xl cursor-pointer transition-all duration-200 border",
                         isSelected 
                           ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                           : "bg-white border-transparent hover:border-slate-200 hover:bg-slate-50"
                       )}
                     >
                       <div className="flex gap-3">
                         <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0">
                           <Briefcase size={20} className="text-indigo-600" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <h3 className={clsx("font-bold truncate text-sm", isSelected ? "text-indigo-900" : "text-slate-800")}>
                             {intern.title}
                           </h3>
                           <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                             <Building2 size={12} /> {intern.company_name}
                           </p>
                           {intern.location && (
                             <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                               <MapPin size={12} /> {intern.location}
                             </p>
                           )}
                         </div>
                       </div>
                       
                       {/* Tags */}
                       <div className="flex gap-2 mt-3 flex-wrap">
                         {intern.required_skills?.slice(0, 3).map(sk => (
                           <span key={sk} className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium", isSelected ? "bg-indigo-200/50 text-indigo-700" : "bg-slate-100 text-slate-600")}>
                             {sk}
                           </span>
                         ))}
                       </div>
                     </div>
                   );
                 })
               )}
             </div>
           </div>

           {/* Right Pane - Detail View */}
           <div className="flex-1 bg-slate-50 overflow-y-auto relative h-full">
             {selectedInternship ? (
               <div className="max-w-4xl mx-auto p-8 pb-32">
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6 animate-fade-in">
                   {/* Header Gradient */}
                   <div className="h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 relative" />
                   
                   <div className="px-8 pb-8">
                     <div className="flex justify-between items-start -mt-8 mb-6">
                       <div className="w-20 h-20 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center p-2">
                         <div className="w-full h-full rounded-xl bg-indigo-50 flex items-center justify-center">
                           <Building2 size={32} className="text-indigo-600" />
                         </div>
                       </div>
                       
                       <button 
                         onClick={() => setModalOpen(true)}
                         className="mt-12 btn-primary shadow-lg shadow-indigo-200 gap-2 px-8 py-2.5 rounded-full text-sm font-bold animate-bounce"
                       >
                         Apply Now <ArrowRight size={16} />
                       </button>
                     </div>

                     <h1 className="text-2xl font-black text-slate-900">{selectedInternship.title}</h1>
                     <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600 font-medium">
                       <span className="flex items-center gap-1.5 text-indigo-600">
                         <Building2 size={16} /> {selectedInternship.company_name}
                       </span>
                       {selectedInternship.location && (
                         <span className="flex items-center gap-1.5">
                           <MapPin size={16} /> {selectedInternship.location}
                         </span>
                       )}
                       {selectedInternship.deadline && (
                         <span className="flex items-center gap-1.5">
                           <Calendar size={16} /> Apply by {new Date(selectedInternship.deadline).toLocaleDateString()}
                         </span>
                       )}
                     </div>
                   </div>
                 </div>

                 {detailLoading ? (
                   <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-4">
                     <div className="h-6 w-1/3 bg-slate-100 animate-pulse rounded" />
                     <div className="h-24 w-full bg-slate-100 animate-pulse rounded" />
                   </div>
                 ) : internshipDetail ? (
                   <div className="space-y-6 animate-slide-up">
                     {/* Description */}
                     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                       <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                         <BookOpen size={20} className="text-indigo-500" /> About the Role
                       </h2>
                       <div className="prose prose-sm prose-slate max-w-none">
                         {internshipDetail.full_jd_text ? (
                           <p className="whitespace-pre-wrap leading-relaxed">{internshipDetail.full_jd_text}</p>
                         ) : internshipDetail.short_description ? (
                           <p className="whitespace-pre-wrap leading-relaxed">{internshipDetail.short_description}</p>
                         ) : (
                           <p className="text-slate-400 italic">No detailed description available.</p>
                         )}
                       </div>
                     </div>

                     {/* Required Skills & Tools */}
                     <div className="grid xl:grid-cols-2 gap-6">
                       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                         <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                           <Zap size={20} className="text-amber-500" /> Required Skills
                         </h2>
                         <div className="flex flex-wrap gap-2">
                           {internshipDetail.required_skills?.map(sk => (
                             <span key={sk} className="badge badge-emerald py-1 px-3 text-xs">{sk}</span>
                           ))}
                           {!internshipDetail.required_skills?.length && <p className="text-sm text-slate-400">Not specified</p>}
                         </div>
                       </div>

                       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                         <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                           <Layers size={20} className="text-blue-500" /> Tools & Tech
                         </h2>
                         <div className="flex flex-wrap gap-2">
                           {internshipDetail.tools_and_technologies?.map(tool => (
                             <span key={tool} className="badge badge-blue py-1 px-3 text-xs">{tool}</span>
                           ))}
                           {!internshipDetail.tools_and_technologies?.length && <p className="text-sm text-slate-400">Not specified</p>}
                         </div>
                       </div>
                     </div>

                     {/* Responsibilities */}
                     {internshipDetail.responsibilities && internshipDetail.responsibilities.length > 0 && (
                       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                         <h2 className="text-lg font-bold text-slate-900 mb-4">Key Responsibilities</h2>
                         <ul className="space-y-3">
                           {internshipDetail.responsibilities.map((resp, idx) => (
                             <li key={idx} className="flex gap-3 text-slate-700 text-sm">
                               <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                               <span>{resp}</span>
                             </li>
                           ))}
                         </ul>
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="p-8 text-center text-slate-400">Failed to load details.</div>
                 )}
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                 <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                   <Briefcase size={40} className="text-slate-300" />
                 </div>
                 <h2 className="text-xl font-bold text-slate-600">No Internship Selected</h2>
                 <p className="mt-2 max-w-sm">Select an internship from the list on the left to view details and apply.</p>
               </div>
             )}
           </div>
        </main>
      </div>

      {/* Application Modal */}
      {modalOpen && selectedInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative animate-scale-up flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900">Apply for Internship</h2>
                <p className="text-sm font-medium text-indigo-600 mt-1">{selectedInternship.title} • {selectedInternship.company_name}</p>
              </div>
              {applyStep !== "PROCESSING" && applyStep !== "SUCCESS" && (
                <button onClick={resetModal} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto">
              {applyStep === "UPLOAD" && (
                <div className="space-y-6">
                  <p className="text-slate-600 text-sm">
                    Please upload your resume to apply. Our ATS will analyze your profile against this specific role to determine your match score.
                  </p>
                  
                  <FileUpload 
                    onFileSelect={(f) => setFile(f)}
                    isUploading={false}
                    className="mt-2"
                  />

                  <button 
                    onClick={handleApply}
                    disabled={!file}
                    className={clsx(
                      "w-full py-3.5 rounded-xl font-bold text-white transition-all flex justify-center items-center gap-2",
                      file ? "bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200" : "bg-slate-300 cursor-not-allowed"
                    )}
                  >
                    Submit Application <ArrowRight size={18} />
                  </button>
                </div>
              )}

              {applyStep === "PROCESSING" && (
                <div className="py-8 flex flex-col items-center text-center space-y-6">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                    <div 
                      className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" 
                    />
                    <Zap size={32} className="text-indigo-600 animate-pulse" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Analyzing Application</h3>
                    <p className="text-sm text-slate-500 mt-2 font-medium">
                      {statusResponse?.stage_label || "Initializing AI ATS Engine..."}
                    </p>
                  </div>

                  <div className="w-full max-w-sm bg-slate-100 h-2.5 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                       style={{ width: `${statusResponse?.progress_percent || uploadProgress}%` }}
                     />
                  </div>
                  <p className="text-xs font-bold text-indigo-600">
                    {statusResponse?.progress_percent || uploadProgress}%
                  </p>
                </div>
              )}

              {applyStep === "SUCCESS" && (
                <div className="py-6 flex flex-col items-center text-center space-y-6 animate-fade-in">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={40} className="text-emerald-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Application Submitted!</h3>
                    <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
                      Your resume has been successfully analyzed and sent to the HR team.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 w-full mt-4">
                    <button 
                      onClick={() => router.push(`/student/analysis/${finalResumeId}`)}
                      className="w-full py-3.5 rounded-xl font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 border border-indigo-200"
                    >
                      View Detailed ATS Results <ArrowRight size={18} />
                    </button>
                    
                    <button 
                      onClick={handleStartSimulation}
                      className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap size={18} /> Start AI Simulation (Demo)
                    </button>
                    
                    <button 
                      onClick={resetModal}
                      className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors mt-2"
                    >
                      Close and browse more internships
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
