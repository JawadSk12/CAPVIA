'use client';

import React, { useState } from 'react';
import { UnifiedLayout } from '@/features/shared/UnifiedLayout';
import { User, Mail, Globe, Github, Linkedin, Briefcase, Plus, Save, Award } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState({
    name: user?.full_name || 'Jawad S',
    email: user?.email || 'jawad@example.com',
    phone: '+91 98765 43210',
    website: 'https://jawad.dev',
    github: 'https://github.com/jawad',
    linkedin: 'https://linkedin.com/in/jawad',
    education: 'B.Tech in Computer Science, NIT',
    experience: 'Web Developer Intern at TechCorp (3 months)',
    skills: ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Profile saved successfully (Mock API)!');
  };

  return (
    <UnifiedLayout title="Candidate Profile">
      <form onSubmit={handleSave} className="space-y-8 animate-fade-in font-sans text-slate-800">
        
        {/* Profile Card Header */}
        <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-[#0D47A1]/10 text-[#0D47A1] rounded-full flex items-center justify-center font-black text-2xl border border-slate-100">
            {profile.name[0].toUpperCase()}
          </div>
          <div className="flex-1 text-center md:text-left space-y-1">
            <h2 className="text-xl font-bold text-slate-900 font-outfit">{profile.name}</h2>
            <p className="text-xs text-slate-400 font-bold capitalize">{user?.role || 'Candidate'} • Bangalore, India</p>
            <p className="text-xs text-slate-500 font-medium">Verify your profile metadata to speed up recruiter validations.</p>
          </div>
          <button 
            type="submit"
            className="px-5 py-2.5 bg-[#0D47A1] hover:bg-[#0b3c8a] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
          >
            <Save size={14} />
            Save Profile
          </button>
        </div>

        {/* Form Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left panel: Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Personal Details */}
            <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-850 font-outfit border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <User size={16} className="text-[#0D47A1]" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.name} 
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-[#0D47A1] text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={profile.email} 
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 text-xs font-semibold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Number</label>
                  <input 
                    type="text" 
                    value={profile.phone} 
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-[#0D47A1] text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Highest Education</label>
                  <input 
                    type="text" 
                    value={profile.education} 
                    onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-[#0D47A1] text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Experience details */}
            <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-850 font-outfit border-b border-slate-100 pb-3 flex items-center gap-1.5">
                <Briefcase size={16} className="text-[#0D47A1]" />
                Professional Summary
              </h3>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Work Experience Summary</label>
                <textarea 
                  rows={3}
                  value={profile.experience} 
                  onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:border-[#0D47A1] text-xs font-semibold resize-none"
                />
              </div>
            </div>

          </div>

          {/* Right panel: Social Links & Skills */}
          <div className="space-y-6">
            
            {/* Social handles */}
            <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-850 font-outfit border-b border-slate-100 pb-3">Online Footprints</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 bg-slate-50/50">
                  <Globe size={14} className="text-slate-400" />
                  <input 
                    type="text" 
                    value={profile.website} 
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    className="bg-transparent border-none py-3 text-slate-700 text-xs font-semibold focus:outline-none w-full"
                    placeholder="Website URL"
                  />
                </div>
                <div className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 bg-slate-50/50">
                  <Github size={14} className="text-slate-400" />
                  <input 
                    type="text" 
                    value={profile.github} 
                    onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                    className="bg-transparent border-none py-3 text-slate-700 text-xs font-semibold focus:outline-none w-full"
                    placeholder="Github Profile"
                  />
                </div>
                <div className="flex items-center gap-2 border border-slate-100 rounded-xl px-3 bg-slate-50/50">
                  <Linkedin size={14} className="text-slate-400" />
                  <input 
                    type="text" 
                    value={profile.linkedin} 
                    onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                    className="bg-transparent border-none py-3 text-slate-700 text-xs font-semibold focus:outline-none w-full"
                    placeholder="Linkedin Profile"
                  />
                </div>
              </div>
            </div>

            {/* Skills lists */}
            <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-850 font-outfit flex items-center gap-1.5">
                  <Award size={16} className="text-[#0D47A1]" />
                  Skills Directory
                </h3>
                <button 
                  type="button"
                  onClick={() => alert('Skill addition popup...')}
                  className="p-1 text-[#0D47A1] hover:bg-blue-50 rounded-lg transition"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span key={skill} className="px-2.5 py-1 bg-blue-50 text-[#0D47A1] border border-blue-100/50 rounded-lg text-xs font-bold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

          </div>

        </div>

      </form>
    </UnifiedLayout>
  );
}
