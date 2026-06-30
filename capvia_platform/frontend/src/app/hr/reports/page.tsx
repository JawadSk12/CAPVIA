'use client';

import React, { useState, useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, recruitmentApi, apiClient } from '../../../services/api';
import { Application } from '../../../types';
import { FileText, Download, Search, RefreshCw, AlertCircle, Clock, Eye, Share2 } from 'lucide-react';

export default function HRReportsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load generated reports list
  const { data: reportsList, isLoading: loadingReports } = useQuery({
    queryKey: ['reports-list'],
    queryFn: () => reportsApi.list(),
  });

  // Load all applications to cross-reference candidates that don't have reports yet
  const { data: allApplications } = useQuery({
    queryKey: ['applications'],
    queryFn: recruitmentApi.getApplications,
  });

  const reports = useMemo(() => {
    return reportsList || [];
  }, [reportsList]);

  const applications = useMemo(() => {
    return allApplications || [];
  }, [allApplications]);

  // Combine report records with application data
  const combinedReports = useMemo(() => {
    const records = reports.map((rep: any) => {
      const app = applications.find(a => a.id === rep.application_id);
      return {
        id: rep.id,
        applicationId: rep.application_id,
        candidateName: app?.candidate?.full_name || rep.candidate_name || 'Candidate',
        candidateEmail: app?.candidate?.email || 'N/A',
        internshipTitle: app?.vacancy?.title || rep.internship_title || 'General Vacancy',
        createdAt: rep.created_at || new Date().toISOString(),
        status: 'GENERATED'
      };
    });

    // Add applications that don't have reports generated yet, to allow creating them
    const pendingApps = applications.filter(app => {
      const alreadyHasReport = reports.some((rep: any) => rep.application_id === app.id);
      // Only show apps that are completed/evaluated
      const isEligible = ['EVALUATED', 'SHORTLISTED', 'HIRED'].includes(app.status);
      return !alreadyHasReport && isEligible;
    }).map(app => ({
      id: `pending-${app.id}`,
      applicationId: app.id,
      candidateName: app.candidate?.full_name || 'Candidate',
      candidateEmail: app.candidate?.email || 'N/A',
      internshipTitle: app.vacancy?.title || 'General Vacancy',
      createdAt: null,
      status: 'PENDING'
    }));

    return [...records, ...pendingApps];
  }, [reports, applications]);

  // Filter combined reports
  const filteredReports = useMemo(() => {
    return combinedReports.filter(rep => {
      return !searchQuery || 
        rep.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.internshipTitle.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [combinedReports, searchQuery]);

  // Mutation to generate report
  const generateReportMutation = useMutation({
    mutationFn: (appId: string) => reportsApi.generate(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports-list'] });
    }
  });

  const handleDownload = async (appId: string, candidateName: string) => {
    setDownloadingId(appId);
    try {
      await reportsApi.generate(appId);
      const response = await apiClient.get(`/reports/${appId}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `capvia_report_${candidateName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('Failed to generate or download report.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleShare = (candidateName: string) => {
    alert(`Report share link copied to clipboard for ${candidateName}.`);
  };

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Recruiter Reports" breadcrumbs={[{ label: 'Workspace' }, { label: 'Reports' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Recruiter PDF Exports</h2>
            <p className="text-slate-500 text-xs mt-1">Generate capability analysis sheets, download interview audio summaries, and review proctoring records</p>
          </div>
          
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-64 shadow-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by candidate name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 focus:outline-none w-full placeholder:text-slate-450"
            />
          </div>
        </div>

        {/* Reports Table Grid */}
        {loadingReports ? (
          <div className="py-24 text-center text-slate-500 text-sm">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0D47A1]" />
            Loading reports register...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-slate-200 bg-white rounded-2xl p-8">
            <FileText className="h-10 w-10 mx-auto mb-4 text-slate-300" />
            <h3 className="font-bold text-slate-800 text-base">No Reports Available</h3>
            <p className="text-xs text-slate-450 mt-1">Complete candidate assessments to compile intelligence files.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    <th className="py-4 px-6">Candidate</th>
                    <th className="py-4 px-6">Vacancy Campaign</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Generated Date</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredReports.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors font-medium">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 text-sm">{rep.candidateName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{rep.candidateEmail}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-650">
                        {rep.internshipTitle}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                          rep.status === 'GENERATED'
                            ? 'bg-emerald-50 text-[#10B981] border-emerald-100'
                            : 'bg-amber-50 text-[#F59E0B] border-amber-100'
                        }`}>
                          {rep.status === 'GENERATED' ? 'Ready' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-semibold">
                        {rep.createdAt ? (
                          new Date(rep.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center space-x-1.5">
                          {rep.status === 'PENDING' ? (
                            <button
                              onClick={() => generateReportMutation.mutate(rep.applicationId)}
                              disabled={generateReportMutation.isPending}
                              className="px-3 py-1.5 rounded-xl border border-[#0D47A1]/20 bg-[#0D47A1]/5 hover:bg-[#0D47A1]/10 text-[#0D47A1] font-bold text-[10px]"
                            >
                              Generate
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleDownload(rep.applicationId, rep.candidateName)}
                                disabled={downloadingId === rep.applicationId}
                                className="p-1.5 rounded-lg border border-slate-100 hover:border-[#10B981]/30 hover:bg-[#10B981]/5 text-slate-450 hover:text-[#10B981] transition-colors"
                                title="Download PDF"
                              >
                                {downloadingId === rep.applicationId ? (
                                  <RefreshCw className="h-4 w-4 animate-spin text-[#10B981]" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleShare(rep.candidateName)}
                                className="p-1.5 rounded-lg border border-slate-100 hover:border-[#0D47A1]/30 hover:bg-[#0D47A1]/5 text-slate-450 hover:text-[#0D47A1] transition-colors"
                                title="Copy Share Link"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
