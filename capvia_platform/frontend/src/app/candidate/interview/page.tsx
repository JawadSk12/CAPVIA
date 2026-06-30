"use client";

import React, { useState } from "react";
import { Welcome } from "@/features/interview/components/Welcome";
import RoleSetup from "@/features/interview/components/RoleSetup";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";

export default function CandidateInterviewPage() {
  const [started, setStarted] = useState(false);

  return (
    <UnifiedLayout title={started ? "Interview Role Selection" : "CAPVIA AI Interview"}>
      {started ? (
        <RoleSetup />
      ) : (
        <Welcome onStart={() => setStarted(true)} />
      )}
    </UnifiedLayout>
  );
}
