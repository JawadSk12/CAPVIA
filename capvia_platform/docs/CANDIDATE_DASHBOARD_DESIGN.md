# CAPVIA Candidate Dashboard Design Document

This document outlines the design structure, visual aesthetics, layout guidelines, and color theory implemented in the redesign of the CAPVIA Candidate Dashboard.

## 1. Design System & Palette

The Candidate Dashboard adheres strictly to the official CAPVIA Design System, avoiding dark modes and high-saturation neon colors.

- **Primary Brand Color**: `#0D47A1` (Deep Corporate Blue) - Used for primary CTAs, active sidebar link backgrounds, and core branding elements.
- **Secondary Accent**: `#42A5F5` (Soft Sky Blue) - Used for secondary gradients, progress bars, and subtle highlights.
- **Accent Highlight**: `#FFC107` (Warm Amber) - Used sparingly for warning indicators, proctor alerts, and star highlights.
- **System Backgrounds**:
  - Main Body Surface: `#F8FAFC` (Slate 50)
  - Cards & Containers: `#FFFFFF` (White)
  - Borders & Gridlines: `#F1F5F9` (Slate 100) or `#E2E8F0` (Slate 200)

## 2. Layout Structure

The layout is built upon `UnifiedLayout`, offering a persistent side navigation panel (`Sidebar`) and a contextual top utility bar (`Navbar`).

- **Sidebar (Sidebar.tsx)**:
  - Width: `w-64` (Desktop)
  - Color: White background with a subtle border right.
  - Active State: Background color set to `#0D47A1/10` with text color `#0D47A1`.
  - Icon Set: Exclusively Lucide React icons.
  - Links: Includes Dashboard, Internships, Applications, ATS Analysis, Simulation, AI Interview, DNA Profile, Reports, Resume, Profile, Notifications, Settings, Help, and Logout.
- **Navbar (Navbar.tsx)**:
  - Height: `h-16`
  - Color: White background with sticky positioning and a light drop shadow.
  - Features: Notification Bell with real-time indicators, dynamic profile avatar menu, and a mobile-responsive sidebar toggle.

## 3. Main Workspace Zones

- **Personalized Welcome Banner**:
  - Gradient background from `#0D47A1` to `#42A5F5`.
  - Dynamic local time greeting ("Good morning / afternoon / evening").
  - Prominent quick actions: "Browse Internships" and "Scan Resume".
- **Quantitative Dashboard Cards**:
  - Circular progress meters and metric blocks indicating:
    - total applications and active pipelines.
    - maximum resume ATS fit percentage.
    - verified career DNA match index.
    - proctoring integrity index (defaulting to 96/100 or fetched dynamically).
- **Proctoring Results Hub (Results.tsx)**:
  - Three-column grid displaying technical speech score, webcam integrity score, video recording playback container, and area of improvements list.
