'use client';

import React, { useState } from 'react';
import { UnifiedLayout } from '@/features/shared/UnifiedLayout';
import { Settings, Shield, User, Bell, Key, Save } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy'>('profile');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Settings saved successfully (Mock API)!');
  };

  return (
    <UnifiedLayout title="Platform Config & Settings">
      <div className="space-y-8 animate-fade-in font-sans text-slate-800">
        
        {/* Navigation Tabs */}
        <div className="border-b border-slate-100 flex gap-2 overflow-x-auto pb-px">
          {([
            { id: 'profile', label: 'Account Settings', icon: User },
            { id: 'security', label: 'Login & Security', icon: Key },
            { id: 'privacy', label: 'Proctor Privacy', icon: Shield },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === id
                  ? "border-[#0D47A1] text-[#0D47A1]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Form panel */}
        <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm max-w-3xl">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-850 font-outfit border-b border-slate-50 pb-3">Account Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Display Language</label>
                    <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-semibold focus:outline-none">
                      <option>English (IN)</option>
                      <option>English (US)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Time Zone</label>
                    <select className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-semibold focus:outline-none">
                      <option>Asia/Kolkata (IST)</option>
                      <option>UTC</option>
                    </select>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-slate-350 text-[#0D47A1] focus:ring-[#0D47A1]/20 h-4 w-4" />
                    <span className="text-xs text-slate-650 font-semibold">Subscribe to weekly assessment results digest emails</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-850 font-outfit border-b border-slate-50 pb-3">Update Authentication Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
                    <input type="password" placeholder="••••••••" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#0D47A1]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#0D47A1]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#0D47A1]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-850 font-outfit border-b border-slate-50 pb-3">Proctoring Data Consent</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  We capture video frames, gaze ratios, head stability angles, and phone presence events during interviews to run cheating evaluations. You can customize retention periods below:
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Retain Webcam Session Video Recordings</span>
                    <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none">
                      <option>30 Days</option>
                      <option>90 Days</option>
                      <option>Indefinitely</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">Anonymize Eye Gaze Metadata After Assessment</span>
                    <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-bold focus:outline-none">
                      <option>Immediately</option>
                      <option>1 Year</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-5 flex justify-end">
              <button 
                type="submit"
                className="px-5 py-2.5 bg-[#0D47A1] hover:bg-[#0b3c8a] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>

          </form>
        </div>

      </div>
    </UnifiedLayout>
  );
}
