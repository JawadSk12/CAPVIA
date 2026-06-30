"use client";

import React from "react";
import { Results } from "@/features/interview/components/Results";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";

export default function CandidateInterviewResultsPage() {
  return (
    <UnifiedLayout title="Interview Assessment Report">
      <Results />
    </UnifiedLayout>
  );
}
