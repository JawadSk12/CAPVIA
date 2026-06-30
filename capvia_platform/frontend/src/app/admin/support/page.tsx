'use client';
import React from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import { HelpCircle, MessageSquare, FileText, ExternalLink, ChevronRight, Mail, Book } from 'lucide-react';

const FAQS = [
  { q: 'How do I reset a candidate password?', a: 'Navigate to Admin → Users, find the user, and click the Reset Password action icon.' },
  { q: 'How do I verify a new company?', a: 'Go to Admin → Companies, find the company, and click the Verify button on their card.' },
  { q: 'Why is the ATS engine not processing?', a: 'Check Engine Monitor for queue depth and errors. Verify Celery workers are running via Platform Health.' },
  { q: 'How do I enable/disable a feature?', a: 'Go to Admin → Settings → Feature Flags and toggle the relevant flag.' },
  { q: 'How do I export audit logs?', a: 'Navigate to Admin → Audit Logs and click "Export Logs" in the top-right corner.' },
];

export default function AdminSupportPage() {
  return (
    <UnifiedLayout title="Support"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Support' }]}>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 font-outfit">Admin Support</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resources and help for platform administrators</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {[
          { icon: Book,         label: 'Platform Docs',   desc: 'Full documentation for all CAPVIA modules',   href: '#', color: '#0D47A1' },
          { icon: MessageSquare,label: 'Contact Support', desc: 'Reach the CAPVIA engineering team directly',  href: 'mailto:support@capvia.ai', color: '#10B981' },
          { icon: FileText,     label: 'Release Notes',   desc: 'Latest feature releases and bug fixes',        href: '#', color: '#7C3AED' },
        ].map(({ icon: Icon, label, desc, href, color }) => (
          <a key={label} href={href}
            className="flex items-start gap-4 bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}12` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-slate-900 flex items-center gap-1">
                {label} <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-black text-slate-900 mb-5">Frequently Asked Questions</h3>
        <div className="space-y-0">
          {FAQS.map((faq, i) => (
            <details key={i} className="group border-b border-slate-100 last:border-0">
              <summary className="flex items-center justify-between cursor-pointer py-4 text-[13px] font-bold text-slate-800 list-none hover:text-[#0D47A1] transition-colors">
                {faq.q}
                <ChevronRight className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform flex-shrink-0" />
              </summary>
              <p className="text-[12px] text-slate-500 leading-relaxed pb-4">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="mt-5 p-5 rounded-2xl border border-[#0D47A1]/15 bg-[#0D47A1]/3 flex items-center justify-between">
        <div>
          <div className="text-[13px] font-bold text-slate-900">Need more help?</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Contact the CAPVIA engineering team</div>
        </div>
        <a href="mailto:support@capvia.ai"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all"
          style={{ background: '#0D47A1' }}>
          <Mail className="h-3.5 w-3.5" /> Email Support
        </a>
      </div>
    </UnifiedLayout>
  );
}
