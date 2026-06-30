'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyApi } from '../../../services/api';
import { Company } from '../../../types';
import { 
  Building, Globe, MapPin, Users, Calendar, Briefcase, CheckCircle, Edit, Save,
  CreditCard, ShieldAlert, Activity, UserPlus, Trash2
} from 'lucide-react';

export default function HRCompanyPage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [headquarters, setHeadquarters] = useState('');
  const [foundedYear, setFoundedYear] = useState(2020);
  const [employeeCount, setEmployeeCount] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Load recruiter's company
  const { data: companyData, isLoading } = useQuery({
    queryKey: ['my-company'],
    queryFn: () => companyApi.listMine(),
  });

  const company: Company | null = useMemo(() => {
    if (!companyData) return null;
    return Array.isArray(companyData) 
      ? companyData[0] 
      : companyData.companies?.[0] || companyData;
  }, [companyData]);

  // Sync form states with database details
  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setDescription(company.description || '');
      setIndustry(company.industry || '');
      setWebsiteUrl(company.website_url || '');
      setHeadquarters(company.headquarters || '');
      setFoundedYear(company.founded_year || 2020);
      setEmployeeCount(company.employee_count || '');
      setLogoUrl(company.logo_url || '');
    }
  }, [company]);

  // Update Company Mutation
  const updateCompanyMutation = useMutation({
    mutationFn: (payload: any) => companyApi.update(company!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-company'] });
      setIsEditing(false);
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    
    updateCompanyMutation.mutate({
      name,
      description,
      industry,
      website_url: websiteUrl,
      headquarters,
      founded_year: Number(foundedYear),
      employee_count: employeeCount,
      logo_url: logoUrl
    });
  };

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Company Profile" breadcrumbs={[{ label: 'Workspace' }, { label: 'Company' }]}>
        
        {isLoading ? (
          <div className="py-24 text-center text-slate-500 text-sm">
            <Building className="h-8 w-8 animate-spin mx-auto mb-4 text-[#0D47A1]" />
            Loading company profile details...
          </div>
        ) : !company ? (
          <div className="py-24 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <Building className="h-10 w-10 mx-auto mb-4 text-slate-350" />
            <h4 className="font-bold text-slate-800 text-base">No Company Profile Configured</h4>
            <p className="text-xs text-slate-450 mt-1">Please contact your administrator to set up company profile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Profile Card & Quick Stats */}
            <div className="space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
                {company.logo_url ? (
                  <img 
                    src={company.logo_url} 
                    alt={company.name} 
                    className="w-24 h-24 rounded-2xl object-cover border border-slate-100 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-[#0D47A1]/10 flex items-center justify-center text-3xl font-extrabold text-[#0D47A1] border border-[#0D47A1]/20">
                    {company.name?.[0]?.toUpperCase()}
                  </div>
                )}
                
                <h3 className="text-lg font-bold text-slate-900 font-outfit mt-4 flex items-center justify-center space-x-1.5">
                  <span>{company.name}</span>
                  {company.is_verified && (
                    <CheckCircle className="h-4 w-4 text-[#10B981] fill-[#10B981]/15" />
                  )}
                </h3>
                <span className="text-xs text-[#0D47A1] font-semibold mt-1">{company.industry || 'General Industry'}</span>
                
                <div className="w-full border-t border-slate-100 my-5" />

                <div className="w-full space-y-3.5 text-xs text-slate-650 font-medium">
                  {company.website_url && (
                    <a 
                      href={company.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center space-x-2.5 text-[#0D47A1] hover:underline"
                    >
                      <Globe className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{company.website_url.replace(/(^\w+:|^)\/\//, '')}</span>
                    </a>
                  )}
                  {company.headquarters && (
                    <div className="flex items-center space-x-2.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{company.headquarters}</span>
                    </div>
                  )}
                  {company.employee_count && (
                    <div className="flex items-center space-x-2.5">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{company.employee_count} Employees</span>
                    </div>
                  )}
                  {company.founded_year && (
                    <div className="flex items-center space-x-2.5">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>Founded in {company.founded_year}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hiring Stats */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                  <Activity className="h-4 w-4 text-[#0D47A1] mr-2" />
                  Hiring Statistics
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Active Vacancies</span>
                    <span className="text-xs font-bold text-slate-800">{company.internship_count || 0} Campaigns</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Internal Recruiters</span>
                    <span className="text-xs font-bold text-slate-800">{company.member_count || 0} Members</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Editable Profile Details */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-outfit">Branding & Corporate Identity</h4>
                    <p className="text-slate-500 text-[10px] mt-0.5">Control organization name, industry categories, and website links</p>
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#0D47A1]/30 hover:bg-[#0D47A1]/5 text-xs font-bold transition-all text-slate-600 hover:text-[#0D47A1]"
                  >
                    {isEditing ? (
                      <>Cancel</>
                    ) : (
                      <>
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit Details</span>
                      </>
                    )}
                  </button>
                </div>

                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Company Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D47A1]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Industry Sector</label>
                        <input
                          type="text"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D47A1]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Website URL</label>
                        <input
                          type="url"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D47A1]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Logo URL</label>
                        <input
                          type="text"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D47A1]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Headquarters Location</label>
                        <input
                          type="text"
                          value={headquarters}
                          onChange={(e) => setHeadquarters(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D47A1]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Founded Year</label>
                          <input
                            type="number"
                            value={foundedYear}
                            onChange={(e) => setFoundedYear(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D47A1]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Size Bracket</label>
                          <input
                            type="text"
                            value={employeeCount}
                            onChange={(e) => setEmployeeCount(e.target.value)}
                            placeholder="e.g. 50-100"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D47A1]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Corporate Pitch / Description</label>
                      <textarea
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0D47A1] resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        type="submit"
                        disabled={updateCompanyMutation.isPending}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-[#0D47A1] hover:bg-[#0D47A1]/90 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        <span>{updateCompanyMutation.isPending ? 'Saving...' : 'Save Profile'}</span>
                      </button>
                    </div>

                  </form>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Description</span>
                      <p className="text-xs text-slate-600 mt-2.5 leading-relaxed font-medium">
                        {company.description || 'No description provided. Click edit to add organizational pitch.'}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-6 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Verify Status</span>
                        <div className="mt-2.5 flex items-center space-x-2">
                          <CheckCircle className={`h-4.5 w-4.5 ${company.is_verified ? 'text-[#10B981]' : 'text-slate-350'}`} />
                          <span className="text-xs text-slate-650 font-bold">
                            {company.is_verified ? 'Verified Organization' : 'Pending Verification'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Recruiter Access</span>
                        <div className="mt-2.5 flex items-center space-x-2">
                          <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                          <span className="text-xs text-slate-650 font-bold">Active Recruiter Platform</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
