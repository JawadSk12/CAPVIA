'use client';

import React, { useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { Settings, Shield, Bell, Eye, Save } from 'lucide-react';

export default function HRSettingsPage() {
  const [candidateEmailNotif, setCandidateEmailNotif] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [integrityAlerts, setIntegrityAlerts] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Settings preferences updated successfully.');
  };

  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Platform Config" breadcrumbs={[{ label: 'Workspace' }, { label: 'Settings' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Platform Configurations</h2>
            <p className="text-slate-500 text-xs mt-1">Configure recruiter email notifications, security permissions, and API tokens</p>
          </div>
        </div>

        <div className="max-w-3xl bg-white border border-slate-100 rounded-2xl p-6 shadow-sm text-left">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Email Notifications */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                <Bell className="h-4.5 w-4.5 text-[#0D47A1] mr-2" />
                Notification Preferences
              </h4>
              
              <div className="space-y-3.5">
                <label className="flex items-center space-x-3.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={candidateEmailNotif}
                    onChange={(e) => setCandidateEmailNotif(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-200 text-[#0D47A1] focus:ring-[#0D47A1]"
                  />
                  <span>Email me when a candidate completes an assessment</span>
                </label>

                <label className="flex items-center space-x-3.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-200 text-[#0D47A1] focus:ring-[#0D47A1]"
                  />
                  <span>Send me weekly cohort analytics summaries</span>
                </label>

                <label className="flex items-center space-x-3.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={integrityAlerts}
                    onChange={(e) => setIntegrityAlerts(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-200 text-[#0D47A1] focus:ring-[#0D47A1]"
                  />
                  <span>Notify immediately on high proctoring risk warnings</span>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6" />

            {/* Security Config */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                <Shield className="h-4.5 w-4.5 text-[#0D47A1] mr-2" />
                Access & API Telemetry
              </h4>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed font-medium">
                Configure webhook alerts or API credentials to automatically connect CAPVIA reports to external ATS engines (e.g. Greenhouse, Ashby).
              </p>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">CAPVIA API Secret Key</label>
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 focus-within:border-[#0D47A1] transition-colors max-w-md">
                  <input
                    type="password"
                    readOnly
                    value="sk_live_capvia_51Nz8bFvQ1o9M7Y"
                    className="bg-transparent border-none text-xs text-slate-800 focus:outline-none w-full font-mono"
                  />
                  <button type="button" className="text-xs text-slate-400 hover:text-slate-700">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end">
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#0D47A1] hover:bg-[#0D47A1]/95 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <Save className="h-4 w-4" />
                <span>Save Settings</span>
              </button>
            </div>

          </form>
        </div>

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
