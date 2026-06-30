"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Sparkles, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/auth";

const navLinks = [
  { label: "Overview", href: "#overview" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Why CAPVIA", href: "#why-capvia" },
  { label: "Features", href: "#features" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [initialize]);

  const dashboardHref =
    user?.role === "admin" ? "/admin/dashboard"
    : user?.role === "hr" ? "/hr/dashboard"
    : "/dashboard";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-4 md:pt-6 transition-all duration-300">
      <nav className={`max-w-7xl mx-auto rounded-2xl border transition-all duration-500 ${
        scrolled
          ? "bg-slate-950/75 backdrop-blur-xl border-slate-900 shadow-[0_4px_30px_rgba(0,0,0,0.4)] py-3.5 px-6"
          : "bg-transparent border-transparent py-4 px-6"
      }`}>
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 p-1 flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
              <img src="/logo.png" alt="CAPVIA Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-outfit text-sm font-black tracking-tight text-white group-hover:text-[#42A5F5] transition-all duration-300">
              CAPVIA
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[10px] font-bold text-slate-400 hover:text-white transition-all duration-300 tracking-widest uppercase relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#42A5F5] after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && user ? (
              <Link
                href={dashboardHref}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-bold bg-[#0D47A1] text-white hover:bg-[#0A3B85] transition-all duration-300 hover:shadow-lg hover:shadow-[#0D47A1]/20 hover:-translate-y-0.5 tracking-wider uppercase"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFC107]" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-[10px] font-bold text-slate-400 hover:text-white px-4 py-2 transition-all duration-300 tracking-wider uppercase"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[10px] font-bold bg-white text-slate-900 hover:bg-slate-100 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 hover:-translate-y-0.5 tracking-widest uppercase"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3 h-3 text-slate-900" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Icon */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white transition-all duration-300"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Flyout Menu */}
        {isOpen && (
          <div className="md:hidden absolute top-full left-6 right-6 mt-2 bg-slate-950/95 backdrop-blur-xl border border-slate-900 rounded-2xl shadow-xl py-6 px-6 space-y-4 animate-slide-down">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-xs font-bold text-slate-400 hover:text-white py-1 transition-all duration-300 uppercase tracking-widest"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-900 space-y-3">
              {isAuthenticated && user ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-bold bg-[#0D47A1] text-white tracking-widest uppercase"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FFC107]" />
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="block w-full py-3 rounded-xl text-center text-[10px] font-bold text-slate-400 border border-slate-900 hover:bg-slate-900 tracking-widest uppercase"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsOpen(false)}
                    className="block w-full py-3 rounded-xl text-center text-[10px] font-bold bg-white text-slate-900 tracking-widest uppercase"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
