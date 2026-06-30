'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, Building, Camera, UploadCloud, CheckCircle2,
  Briefcase, MapPin, GraduationCap, Link as LinkIcon, 
  Github, Linkedin, Globe, BrainCircuit, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState<'candidate' | 'hr'>('candidate');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // General Form Handlers (Mock logic for UI presentation)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call for Profile Completion
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      // Redirect to Dashboard (which routes based on backend role)
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">
        
        {/* Branding & Header */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="bg-[#0D47A1] p-2 rounded-xl shadow-md">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#0D47A1] tracking-tight font-outfit">CAPVIA</span>
          </Link>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-outfit">
            Complete Your Profile
          </h2>
          <p className="text-gray-500 font-inter text-lg max-w-2xl mx-auto">
            Set up your profile to personalize your experience and access tailored opportunities.
          </p>
        </div>

        {!success ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-[24px] shadow-xl shadow-gray-200/50 overflow-hidden"
          >
            {/* Role Toggle for Demo purposes (assuming backend dynamically serves this based on user session) */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setRole('candidate')}
                className={`flex-1 py-4 flex items-center justify-center space-x-2 font-semibold text-sm transition-all ${
                  role === 'candidate' ? 'text-[#0D47A1] border-b-2 border-[#0D47A1] bg-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Candidate Profile</span>
              </button>
              <button
                onClick={() => setRole('hr')}
                className={`flex-1 py-4 flex items-center justify-center space-x-2 font-semibold text-sm transition-all ${
                  role === 'hr' ? 'text-[#0D47A1] border-b-2 border-[#0D47A1] bg-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Building className="h-4 w-4" />
                <span>Company / HR Profile</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              
              <AnimatePresence mode="wait">
                {role === 'candidate' ? (
                  <motion.div 
                    key="candidate"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-8"
                  >
                    {/* Basic Info & Photo */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="w-32 h-32 bg-gray-100 rounded-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 hover:text-[#0D47A1] hover:border-[#0D47A1] hover:bg-blue-50 transition-colors cursor-pointer group">
                        <Camera className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Upload Photo</span>
                      </div>
                      
                      <div className="flex-1 space-y-5 w-full">
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700">Professional Headline</label>
                          <input type="text" placeholder="e.g. Senior Frontend Developer | React Enthusiast" required className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Expected Stipend / Salary</label>
                            <input type="text" placeholder="e.g. $120k/yr or $50/hr" className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Preferred Locations</label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <input type="text" placeholder="e.g. New York, Remote" className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Education & Skills */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-sm font-semibold text-gray-700">College / University</label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input type="text" placeholder="University Name" className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                        </div>
                      </div>
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-sm font-semibold text-gray-700">Degree</label>
                        <input type="text" placeholder="e.g. B.S. Computer Science" className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                      </div>
                      <div className="space-y-1.5 md:col-span-1">
                        <label className="text-sm font-semibold text-gray-700">Branch</label>
                        <input type="text" placeholder="e.g. Software Engineering" className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Top Skills (Comma separated)</label>
                      <input type="text" placeholder="React, TypeScript, Node.js, Python" className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Preferred Roles</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input type="text" placeholder="e.g. Frontend Engineer, Full Stack Developer" className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                      </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Links & Resume */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">LinkedIn Profile</label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input type="url" placeholder="https://linkedin.com/in/username" className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">GitHub Profile</label>
                        <div className="relative">
                          <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input type="url" placeholder="https://github.com/username" className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                        </div>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-semibold text-gray-700">Portfolio Website</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input type="url" placeholder="https://yourportfolio.com" className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Resume Upload (PDF)</label>
                      <div className="border-2 border-dashed border-gray-300 rounded-[16px] p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <UploadCloud className="h-6 w-6 text-[#0D47A1]" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, DOCX up to 10MB</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="hr"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-8"
                  >
                    {/* HR Flow */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="w-32 h-32 bg-gray-100 rounded-[20px] flex flex-col items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 hover:text-[#0D47A1] hover:border-[#0D47A1] hover:bg-blue-50 transition-colors cursor-pointer group">
                        <UploadCloud className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-center">Company<br/>Logo</span>
                      </div>
                      
                      <div className="flex-1 space-y-5 w-full">
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-gray-700">Company Name</label>
                          <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="text" placeholder="Acme Corporation" required className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Industry</label>
                            <input type="text" placeholder="e.g. FinTech, SaaS, Healthcare" className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700">Company Size</label>
                            <select className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow appearance-none">
                              <option value="">Select size...</option>
                              <option value="1-10">1-10 Employees</option>
                              <option value="11-50">11-50 Employees</option>
                              <option value="51-200">51-200 Employees</option>
                              <option value="201-500">201-500 Employees</option>
                              <option value="500+">500+ Employees</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-100" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Website</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input type="url" placeholder="https://company.com" className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Headquarters Location</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input type="text" placeholder="e.g. San Francisco, CA" className="block w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Company Description</label>
                      <textarea rows={4} placeholder="Tell us about what your company does, its mission, and its values..." className="block w-full px-4 py-3 bg-white border border-gray-200 rounded-[12px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/20 focus:border-[#0D47A1] shadow-sm transition-shadow" />
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Action */}
              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative flex items-center justify-center py-3.5 px-8 border border-transparent rounded-[16px] shadow-sm text-sm font-bold text-white bg-[#0D47A1] hover:bg-[#0A367A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0D47A1] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group min-w-[200px]"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </div>
                  ) : (
                    <span>Complete Setup</span>
                  )}
                </button>
              </div>

            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-100 rounded-[24px] shadow-xl shadow-gray-200/50 p-12 text-center space-y-6 max-w-lg mx-auto"
          >
            <div className="mx-auto w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900 font-outfit">All Set!</h2>
              <p className="text-gray-500 font-inter">
                Your profile has been completed successfully. We're redirecting you to your dashboard now.
              </p>
            </div>
            <div className="pt-4 flex justify-center">
              <div className="flex items-center space-x-2 text-[#0D47A1] font-semibold text-sm">
                <div className="w-4 h-4 border-2 border-[#0D47A1]/30 border-t-[#0D47A1] rounded-full animate-spin" />
                <span>Redirecting...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
