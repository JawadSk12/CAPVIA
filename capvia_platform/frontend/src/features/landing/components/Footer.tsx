"use client";

import React from "react";
import Link from "next/link";
import { BrainCircuit, Twitter, Linkedin, Github, ArrowRight } from "lucide-react";

const LINKS = {
  Product: [
    { label: "How It Works",   href: "#how-it-works" },
    { label: "AI Interview",   href: "#features" },
    { label: "DNA Profiles",   href: "#features" },
    { label: "Integrity Engine",href: "#features" },
  ],
  Platform: [
    { label: "Browse Jobs",    href: "/internships" },
    { label: "Post a Role",    href: "/auth/register" },
    { label: "HR Dashboard",   href: "/auth/login" },
    { label: "Pricing",        href: "#" },
  ],
  Company: [
    { label: "About",          href: "#" },
    { label: "Blog",           href: "#" },
    { label: "Privacy",        href: "#" },
    { label: "Terms",          href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer
      className="pt-16 pb-8"
      style={{
        background: "#030914",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10 mb-14">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(13,71,161,0.8)",
                  border: "1px solid rgba(66,165,245,0.25)",
                  boxShadow: "0 0 16px rgba(13,71,161,0.25)",
                }}
              >
                <BrainCircuit className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-outfit font-black text-white text-[15px] tracking-tight">
                CAPVIA
              </span>
            </Link>
            <p
              className="text-[13px] leading-relaxed max-w-xs"
              style={{ color: "rgba(100,116,139,0.8)" }}
            >
              AI-verified hiring that surfaces genuine talent through evidence,
              not assumptions.
            </p>

            {/* Newsletter */}
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                Get product updates
              </p>
              <div
                className="flex gap-2"
              >
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="flex-1 h-9 px-3 text-[12px] text-white placeholder-slate-600 rounded-xl focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
                <button
                  type="button"
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all hover:opacity-80"
                  style={{
                    background: "#0D47A1",
                    border: "1px solid rgba(66,165,245,0.2)",
                  }}
                >
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group} className="col-span-1 md:col-span-2 md:col-start-auto">
              <p
                className="text-[9px] font-black uppercase tracking-widest mb-4"
                style={{ color: "rgba(100,116,139,0.6)" }}
              >
                {group}
              </p>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[13px] font-medium transition-colors"
                      style={{ color: "rgba(100,116,139,0.75)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "rgba(100,116,139,0.75)";
                      }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Social */}
          <div className="col-span-1 md:col-span-2">
            <p
              className="text-[9px] font-black uppercase tracking-widest mb-4"
              style={{ color: "rgba(100,116,139,0.6)" }}
            >
              Connect
            </p>
            <div className="flex flex-col gap-3">
              {[
                { Icon: Twitter,  label: "Twitter",  href: "#" },
                { Icon: Linkedin, label: "LinkedIn",  href: "#" },
                { Icon: Github,   label: "GitHub",    href: "#" },
              ].map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="flex items-center gap-2.5 text-[13px] font-medium transition-colors"
                  style={{ color: "rgba(100,116,139,0.75)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "rgba(100,116,139,0.75)";
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p
            className="text-[11px] font-medium"
            style={{ color: "rgba(100,116,139,0.5)" }}
          >
            © {new Date().getFullYear()} CAPVIA Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#10B981", boxShadow: "0 0 6px #10B981" }}
            />
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "rgba(100,116,139,0.5)" }}
            >
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
