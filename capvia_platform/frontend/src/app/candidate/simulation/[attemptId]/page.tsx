"use client";

import React from "react";
import { SimulationInterface } from "@/features/simulation/components/SimulationInterface";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";

export default function CandidateSimulationPage() {
  return (
    <UnifiedLayout title="Coding Simulation Workspace">
      <SimulationInterface />
    </UnifiedLayout>
  );
}
