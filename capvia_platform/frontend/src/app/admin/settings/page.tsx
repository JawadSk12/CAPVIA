'use client';
import React, { useState } from 'react';
import UnifiedLayout from '@/features/shared/UnifiedLayout';
import {
  Settings, Globe, Mail, Shield, HardDrive, KeyRound, ToggleLeft,
  ToggleRight, Save, Eye, EyeOff, CheckCircle2,
} from 'lucide-react';

type SettingsTab = 'brand' | 'email' | 'security' | 'storage' | 'apikeys' | 'features';

const TABS: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: 'brand',    label: 'Brand',          icon: Globe },
  { key: 'email',    label: 'Email',          icon: Mail },
  { key: 'security', label: 'Security',       icon: Shield },
  { key: 'storage',  label: 'Storage',        icon: HardDrive },
  { key: 'apikeys',  label: 'API Keys',       icon: KeyRound },
  { key: 'features', label: 'Feature Flags',  icon: ToggleRight },
];

function FormField({ label, type = 'text', defaultValue, hint, masked }: {
  label: string; type?: string; defaultValue?: string; hint?: string; masked?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={masked && !show ? 'password' : type}
          defaultValue={defaultValue}
          className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-xl focus:outline-none focus:border-[#0D47A1] focus:ring-1 focus:ring-[#0D47A1]/20 bg-white font-mono"
        />
        {masked && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function FeatureFlag({ label, desc, defaultOn }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn ?? false);
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div>
        <div className="text-[13px] font-bold text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
      </div>
      <button onClick={() => setOn(!on)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
          on ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-slate-100 text-slate-400'
        }`}>
        {on ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
        {on ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  );
}

function SaveBar({ tab }: { tab: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 mt-6">
      {saved && (
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#10B981]">
          <CheckCircle2 className="h-4 w-4" /> Saved successfully
        </div>
      )}
      <button
        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
        style={{ background: '#0D47A1' }}>
        <Save className="h-3.5 w-3.5" /> Save Changes
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('brand');

  return (
    <UnifiedLayout title="Settings"
      breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Settings' }]}>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 font-outfit">Platform Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Global CAPVIA configuration · Admin only</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] font-semibold text-left transition-all ${
                  tab === key
                    ? 'bg-blue-50 text-[#0D47A1]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}>
                <Icon className={`h-4 w-4 ${tab === key ? 'text-[#0D47A1]' : 'text-slate-400'}`} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-6">

          {tab === 'brand' && (
            <div className="space-y-5">
              <h3 className="text-sm font-black text-slate-900">Brand Settings</h3>
              <FormField label="Platform Name" defaultValue="CAPVIA" />
              <FormField label="Platform Tagline" defaultValue="Hiring Reimagined" />
              <FormField label="Support Email" defaultValue="support@capvia.ai" type="email" />
              <FormField label="Platform URL" defaultValue="https://capvia.ai" type="url" />
              <FormField label="Logo URL" defaultValue="/logo.svg" hint="SVG recommended. Max 2MB." />
              <SaveBar tab={tab} />
            </div>
          )}

          {tab === 'email' && (
            <div className="space-y-5">
              <h3 className="text-sm font-black text-slate-900">Email Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email Provider" defaultValue="Resend" />
                <FormField label="From Address" defaultValue="noreply@capvia.ai" type="email" />
              </div>
              <FormField label="Resend API Key" defaultValue="re_xxxxxxxxxxxxxxxxxxxx" masked />
              <FormField label="Admin Alert Address" defaultValue="admin@capvia.ai" type="email" hint="System alerts and notifications." />
              <SaveBar tab={tab} />
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-5">
              <h3 className="text-sm font-black text-slate-900">Security Settings</h3>
              <FormField label="JWT Secret Key" defaultValue="••••••••••••••••••••" masked hint="Changing this invalidates all active sessions." />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Access Token TTL (minutes)" defaultValue="30" type="number" />
                <FormField label="Refresh Token TTL (days)" defaultValue="7" type="number" />
              </div>
              <FormField label="Allowed CORS Origins" defaultValue="https://capvia.ai, http://localhost:3000"
                hint="Comma-separated list of allowed origins." />
              <FormField label="Rate Limit (req/min per IP)" defaultValue="100" type="number" />
              <SaveBar tab={tab} />
            </div>
          )}

          {tab === 'storage' && (
            <div className="space-y-5">
              <h3 className="text-sm font-black text-slate-900">Storage Settings</h3>
              <FormField label="Supabase Project URL" defaultValue="https://xxxxx.supabase.co" type="url" />
              <FormField label="Supabase Service Role Key" defaultValue="eyJhb…" masked />
              <FormField label="Storage Bucket (Resumes)" defaultValue="capvia-resumes" />
              <FormField label="Storage Bucket (Interviews)" defaultValue="capvia-interviews" />
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-slate-700 mb-2">Current Storage Usage</div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-[#0D47A1] rounded-full" style={{ width: '68%' }} />
                </div>
                <div className="text-[10px] text-slate-500">6.8 GB / 10 GB used (68%)</div>
              </div>
              <SaveBar tab={tab} />
            </div>
          )}

          {tab === 'apikeys' && (
            <div className="space-y-5">
              <h3 className="text-sm font-black text-slate-900">API Keys</h3>
              <FormField label="OpenAI API Key" defaultValue="sk-…" masked hint="Used for interview question generation." />
              <FormField label="Neon Database URL" defaultValue="postgresql://…" masked hint="Primary application database connection." />
              <FormField label="Redis / Upstash URL" defaultValue="redis://…" masked hint="Celery task broker and result backend." />
              <FormField label="Resend API Key" defaultValue="re_…" masked />
              <SaveBar tab={tab} />
            </div>
          )}

          {tab === 'features' && (
            <div>
              <h3 className="text-sm font-black text-slate-900 mb-4">Feature Flags</h3>
              <FeatureFlag label="AI DNA Profiling" desc="Generate candidate capability profiles after interviews" defaultOn />
              <FeatureFlag label="Behavioral Integrity Engine" desc="Run proctoring analysis on completed interviews" defaultOn />
              <FeatureFlag label="AI Hiring Recommendations" desc="Show HIRE / REJECT / CONSIDER recommendation on rankings" defaultOn />
              <FeatureFlag label="Multi-face Detection" desc="Trigger integrity alerts when multiple faces detected in video" defaultOn />
              <FeatureFlag label="PDF Report Generation" desc="Allow HR to download PDF reports for evaluated candidates" defaultOn />
              <FeatureFlag label="Email Notifications" desc="Send automated emails at each pipeline stage" defaultOn />
              <FeatureFlag label="Candidate Phone Detection" desc="Detect phone usage during interview via MediaPipe" defaultOn />
              <FeatureFlag label="Analytics Dashboard (HR)" desc="Show analytics charts on HR dashboard" defaultOn />
              <FeatureFlag label="Company Verification Gate" desc="Require admin verification before HR can publish internships" />
              <FeatureFlag label="Maintenance Mode" desc="Block all user access except admin — shows maintenance banner" />
              <SaveBar tab={tab} />
            </div>
          )}

        </div>
      </div>
    </UnifiedLayout>
  );
}
