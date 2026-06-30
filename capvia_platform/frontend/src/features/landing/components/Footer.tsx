"use client";

import React from "react";
import Link from "next/link";
import { Shield, Zap, Github, Linkedin, Twitter } from "lucide-react";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "ATS Resume Parser", href: "#" },
      { label: "Coding IDE Sandbox", href: "#" },
      { label: "AI Speech Interview", href: "#" },
      { label: "DNA Competence Radar", href: "#" },
    ],
  },
  {
    heading: "For Recruiters",
    links: [
      { label: "Start Hiring", href: "/auth/register" },
      { label: "HR Dashboard", href: "/hr/dashboard" },
      { label: "Contact Sales", href: "mailto:sales@capvia.com" },
    ],
  },
  {
    heading: "For Candidates",
    links: [
      { label: "Browse Internships", href: "/internships" },
      { label: "Scan Your Resume", href: "/candidate/ats" },
      { label: "Career Dashboard", href: "/dashboard" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About CAPVIA", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto px-6 py-20">

        {/* Top Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-12 mb-16">

          {/* Brand */}
          <div className="col-span-2 space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow">
                <img src="/logo.png" alt="CAPVIA Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-outfit text-base font-black tracking-tight text-white">
                CAPVIA
              </span>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs font-medium">
              Capability Verification Intelligence Architecture. Replacing keywords with verified skills, proctored code, and adaptive AI interviews.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-2.5 pt-2">
              {[
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Linkedin, href: "#", label: "LinkedIn" },
                { icon: Github, href: "#", label: "GitHub" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300 border border-white/5"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.heading} className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {col.heading}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-xs text-slate-400 hover:text-white transition-colors font-medium"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[9px] text-slate-600 font-bold tracking-wide uppercase">
            © {new Date().getFullYear()} CAPVIA Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-slate-600 font-bold tracking-widest uppercase">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
