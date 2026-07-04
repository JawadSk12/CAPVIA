"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Welcome } from "@/features/interview/components/Welcome";
import RoleSetup from "@/features/interview/components/RoleSetup";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";
import { saveInterviewConfig } from "@/features/interview/data/questions";

function InterviewPageContent() {
  const [started, setStarted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleParam = searchParams.get("role");

  const handleStart = () => {
    if (roleParam) {
      saveInterviewConfig({ role: roleParam, skills: [] });
      router.push("/candidate/interview/validation");
    } else {
      setStarted(true);
    }
  };

  return (
    <UnifiedLayout title={started ? "Interview Role Selection" : "CAPVIA AI Interview"}>
      {started ? (
        <RoleSetup />
      ) : (
        <Welcome onStart={handleStart} />
      )}
    </UnifiedLayout>
  );
}

export default function CandidateInterviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading interview...</div>}>
      <InterviewPageContent />
    </Suspense>
  );
}
