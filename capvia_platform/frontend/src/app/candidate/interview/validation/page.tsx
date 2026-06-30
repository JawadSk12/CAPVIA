"use client";

import React from "react";
import DeviceValidation from "@/features/interview/components/DeviceValidation";
import { UnifiedLayout } from "@/features/shared/UnifiedLayout";

export default function CandidateInterviewValidationPage() {
  return (
    <UnifiedLayout title="Device Validation">
      <DeviceValidation />
    </UnifiedLayout>
  );
}
