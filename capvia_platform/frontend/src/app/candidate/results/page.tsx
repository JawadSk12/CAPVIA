"use client";

import React from "react";
import { Results } from "@/features/interview/components/Results";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";

export default function CandidateGeneralResultsPage() {
  return (
    <UnifiedLayout title="Assessment Results & Profile DNA">
      <Results />
    </UnifiedLayout>
  );
}
