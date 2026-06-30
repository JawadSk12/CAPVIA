"use client";

import React from "react";
import Interview from "@/features/interview/components/Interview";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";

export default function CandidateInterviewConductPage() {
  return (
    <UnifiedLayout title="Conducting AI Interview">
      <Interview />
    </UnifiedLayout>
  );
}
