"use client";

import React, { useEffect } from "react";
import Navbar from "@/features/landing/components/Navbar";
import Hero from "@/features/landing/components/Hero";
import Companies from "@/features/landing/components/Companies";
import Stats from "@/features/landing/components/Stats";
import Timeline from "@/features/landing/components/Timeline";
import AtsSection from "@/features/landing/components/AtsSection";
import Simulation from "@/features/landing/components/Simulation";
import Interview from "@/features/landing/components/Interview";
import IntegritySection from "@/features/landing/components/IntegritySection";
import DnaSection from "@/features/landing/components/DnaSection";
import DashboardPreviews from "@/features/landing/components/DashboardPreviews";
import Comparison from "@/features/landing/components/Comparison";
import Advantages from "@/features/landing/components/Advantages";
import SecuritySection from "@/features/landing/components/SecuritySection";
import Testimonials from "@/features/landing/components/Testimonials";
import FaqSection from "@/features/landing/components/FaqSection";
import FinalCta from "@/features/landing/components/FinalCta";
import Footer from "@/features/landing/components/Footer";
import { useAuthStore } from "@/store/auth";

export default function Home() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <main className="min-h-screen bg-[#030914] text-slate-100 flex flex-col relative overflow-hidden scroll-smooth selection:bg-[#42A5F5]/20">
      {/* Sticky Navigation Bar */}
      <Navbar />

      {/* Hero Section (Dark) */}
      <div id="overview">
        <Hero />
      </div>

      {/* Trust Logos (Dark) */}
      <Companies />

      {/* Statistics Readout (Dark) */}
      <Stats />

      {/* Neural Pipeline Timeline (Dark Centerpiece) */}
      <Timeline />

      {/* Features Blueprint Section (Transitions to Light background) */}
      <div id="features" className="scroll-mt-20 bg-[#FAFCFF] text-slate-900">
        {/* Phase 1: ATS Screening */}
        <AtsSection />

        {/* Phase 2: Code Sandbox Simulation */}
        <Simulation />

        {/* Phase 3: Speech AI Interview */}
        <Interview />

        {/* Phase 4: Proctored Integrity Score */}
        <IntegritySection />

        {/* Phase 5: 9-D DNA Passport */}
        <DnaSection />

        {/* Dashboard Previews */}
        <DashboardPreviews />

        {/* Value Comparison */}
        <Comparison />

        {/* Core Advantages */}
        <Advantages />

        {/* Compliance & Security */}
        <SecuritySection />
      </div>

      {/* Testimonials (Transition back to Dark) */}
      <Testimonials />

      {/* Common FAQ accordions (Dark) */}
      <FaqSection />

      {/* Final Call to Action (Dark) */}
      <FinalCta />

      {/* Footer (Dark) */}
      <Footer />
    </main>
  );
}
