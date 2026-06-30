"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ValidationComplete } from "@/features/interview/components/ValidationComplete";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";

export default function CandidateInterviewValidationCompletePage() {
  const router = useRouter();

  return (
    <UnifiedLayout title="Validation Complete">
      <ValidationComplete onProceedToInterview={() => router.push('/candidate/interview/conduct')} />
    </UnifiedLayout>
  );
}
