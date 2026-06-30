'use client';

import React, { useState } from 'react';
import { UnifiedLayout } from '@/features/shared/UnifiedLayout';
import { HelpCircle, ChevronRight, MessageSquare, Search, BookOpen } from 'lucide-react';
import clsx from 'clsx';

export default function HelpPage() {
  const [faqs, setFaqs] = useState([
    {
      q: 'How does the webcam eye gaze tracking work?',
      a: 'During the proctored interview, we load a MediaPipe model inside your browser client. The model estimates your head pitch/yaw/roll and iris position relative to your webcam frame to verify you are looking at the screen.',
      open: false,
    },
    {
      q: 'Are my video recordings shared with other companies?',
      a: 'No. Video streams and audio transcripts are securely encrypted and only accessible by authorized hiring recruiters at the specific company you applied to. They are never shared publicly or globally.',
      open: false,
    },
    {
      q: 'What should I do if my camera disconnects during the test?',
      a: 'Our browser proctor has a webcam watchdog. If the feed is lost, the test will pause automatically. Make sure your device webcam is plugged in and click "Resume Feed" to re-authenticate.',
      open: false,
    },
  ]);

  const toggleFaq = (index: number) => {
    setFaqs(faqs.map((faq, i) => i === index ? { ...faq, open: !faq.open } : faq));
  };

  return (
    <UnifiedLayout title="Help & Support Desk">
      <div className="space-y-8 animate-fade-in font-sans text-slate-800">
        
        {/* Help Center Hero */}
        <div className="bg-gradient-to-br from-[#0D47A1] to-[#42A5F5] rounded-[24px] p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight font-outfit">How can we help you today?</h2>
            <p className="text-xs text-blue-105 font-medium">Browse FAQs or reach out directly to support facilitators.</p>
          </div>
          <div className="relative flex items-center bg-white/10 border border-white/20 rounded-xl px-3 w-full md:w-80 backdrop-blur-md">
            <Search size={14} className="text-blue-100 shrink-0" />
            <input 
              type="text" 
              placeholder="Search help articles..."
              className="bg-transparent border-none py-2 px-2 text-white placeholder-blue-200 text-xs focus:outline-none w-full font-medium"
            />
          </div>
        </div>

        {/* FAQs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-850 font-outfit flex items-center gap-1.5 mb-2">
              <BookOpen size={16} className="text-[#0D47A1]" />
              Frequently Asked Questions
            </h3>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-4 text-left focus:outline-none"
                  >
                    <span className="text-xs font-bold text-slate-800 font-outfit">{faq.q}</span>
                    <ChevronRight 
                      size={14} 
                      className={clsx("text-slate-400 transition-transform duration-200 shrink-0", faq.open && "transform rotate-90")} 
                    />
                  </button>
                  {faq.open && (
                    <div className="px-4 pb-4 text-xs text-slate-500 font-medium leading-relaxed border-t border-slate-50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div>
            <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-850 font-outfit flex items-center gap-1.5 border-b border-slate-50 pb-3">
                <MessageSquare size={16} className="text-[#0D47A1]" />
                Contact Helpdesk
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Subject</label>
                  <input type="text" placeholder="Hardware issue, login error..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#0D47A1]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Message Body</label>
                  <textarea rows={3} placeholder="Provide details on the error message..." className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs font-semibold focus:outline-none focus:border-[#0D47A1] resize-none" />
                </div>
                <button
                  type="button"
                  onClick={() => alert('Support ticket filed successfully!')}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Submit Ticket
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </UnifiedLayout>
  );
}
