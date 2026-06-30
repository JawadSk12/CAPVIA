"use client";

import React from "react";
import { SimulationComplete } from "@/features/simulation/components/SimulationComplete";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";

export default function CandidateSimulationCompletePage() {
  return (
    <UnifiedLayout title="Simulation Evaluation Result">
      <SimulationComplete />
    </UnifiedLayout>
  );
}
