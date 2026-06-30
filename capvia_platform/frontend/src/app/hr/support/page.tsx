'use client';

import React from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import UnifiedLayout from '../../../features/shared/UnifiedLayout';
import { HelpCircle, Mail, MessageSquare, PhoneCall, ShieldCheck } from 'lucide-react';

export default function HRSupportPage() {
  return (
    <ProtectedRoute allowedRoles={['hr', 'admin']}>
      <UnifiedLayout title="Help & Support" breadcrumbs={[{ label: 'Workspace' }, { label: 'Support' }]}>
        
        {/* Upper Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-outfit">Recruiter Help Desk</h2>
            <p className="text-slate-500 text-xs mt-1">Submit support tickets, review proctoring FAQs, or schedule calendar training sessions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-[#0D47A1]/5 rounded-xl flex items-center justify-center text-[#0D47A1] mb-4">
                <Mail className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Email Support Desk</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Submit queries or report anomalies. Enterprise plans include direct technical support.
              </p>
            </div>
            <a 
              href="mailto:support@capvia.com" 
              className="mt-6 text-xs text-[#0D47A1] font-bold hover:underline"
            >
              support@capvia.com
            </a>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-[#10B981]/5 rounded-xl flex items-center justify-center text-[#10B981] mb-4">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Platform Live Chat</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Recruiters enjoy live chat access for immediate verification support or vacancy calibrations.
              </p>
            </div>
            <button 
              onClick={() => alert('Launching Recruiter Support chat...')}
              className="mt-6 text-left text-xs text-[#10B981] font-bold hover:underline"
            >
              Start Live Chat
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 mb-4">
                <PhoneCall className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Recruitment Helpline</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Urgent platform access issues or proctoring configuration errors can be escalated by phone.
              </p>
            </div>
            <a 
              href="tel:+18005550199" 
              className="mt-6 text-xs text-amber-500 font-bold hover:underline"
            >
              +1 (800) 555-0199
            </a>
          </div>

        </div>

      </UnifiedLayout>
    </ProtectedRoute>
  );
}
