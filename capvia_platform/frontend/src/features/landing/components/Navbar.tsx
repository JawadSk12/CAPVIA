"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth";

const NAV_LINKS = [
  { label: "Overview",    href: "#overview" },
  { label: "How It Works",href: "#how-it-works" },
  { label: "Features",    href: "#features" },
  { label: "Why CAPVIA",  href: "#why-capvia" },
];

export default function Navbar() {
  const [isOpen,   setIsOpen]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [initialize]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const dashboardHref =
    user?.role === "admin" ? "/admin/dashboard" :
    user?.role === "hr"    ? "/hr/dashboard"    : "/dashboard";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <nav
        className="max-w-6xl mx-auto flex items-center justify-between transition-all duration-300"
        style={{
          background: scrolled
            ? "rgba(3, 9, 20, 0.82)"
            : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          border: scrolled ? "1px solid rgba(255,255,255,0.07)" : "1px solid transparent",
          borderRadius: 16,
          padding: scrolled ? "10px 20px" : "12px 20px",
          boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(13,71,161,0.9)",
              border: "1px solid rgba(66,165,245,0.3)",
              boxShadow: "0 0 16px rgba(13,71,161,0.3)",
            }}
          >
            {/* Simple geometric mark */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#42A5F5" strokeWidth="1.5" fill="none" />
              <circle cx="8" cy="8" r="2.5" fill="#42A5F5" />
              <line x1="8" y1="2" x2="8" y2="5" stroke="#42A5F5" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="8" y1="11" x2="8" y2="14" stroke="#42A5F5" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="2" y1="8" x2="5" y2="8" stroke="#42A5F5" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="11" y1="8" x2="14" y2="8" stroke="#42A5F5" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <span
            className="text-white font-outfit font-black text-[15px] tracking-tight group-hover:text-[#42A5F5] transition-colors"
          >
            CAPVIA
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[11px] font-semibold text-white/55 hover:text-white/90 transition-colors uppercase tracking-widest relative group"
            >
              {link.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#42A5F5] group-hover:w-full transition-all duration-200" />
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <Link
              href={dashboardHref}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-white tracking-wider uppercase transition-all hover:-translate-y-px"
              style={{
                background: "rgba(13,71,161,0.9)",
                border: "1px solid rgba(66,165,245,0.25)",
                boxShadow: "0 4px 16px rgba(13,71,161,0.3)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFC107]" />
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-[11px] font-semibold text-white/50 hover:text-white/80 transition-colors uppercase tracking-widest px-3 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-slate-900 bg-white hover:bg-slate-100 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-white/10 uppercase tracking-widest"
              >
                Get Started
                <ArrowRight className="w-3 h-3" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {isOpen && (
        <div
          className="md:hidden max-w-6xl mx-auto mt-2 animate-slide-down"
          style={{
            background: "rgba(5,15,32,0.97)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            padding: "20px 20px 24px",
          }}
        >
          <div className="space-y-1 mb-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center text-[13px] font-semibold text-white/55 hover:text-white py-2.5 px-3 rounded-xl hover:bg-white/5 transition-all uppercase tracking-widest"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div
            className="pt-4 space-y-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {isAuthenticated && user ? (
              <Link
                href={dashboardHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold text-white uppercase tracking-widest"
                style={{ background: "rgba(13,71,161,0.9)", border: "1px solid rgba(66,165,245,0.2)" }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FFC107]" />
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setIsOpen(false)}
                  className="block text-center py-3 rounded-xl text-[11px] font-bold text-white/60 hover:text-white uppercase tracking-widest"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setIsOpen(false)}
                  className="block text-center py-3 rounded-xl text-[11px] font-bold text-slate-900 bg-white uppercase tracking-widest"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
