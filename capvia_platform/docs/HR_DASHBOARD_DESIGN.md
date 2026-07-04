# HR Dashboard Modernization Style Guide

This document defines the design guidelines, aesthetics, and implementation choices for the modern CAPVIA Recruiter Platform.

---

## 1. Visual Aesthetics & Philosophy

The redesigned HR Recruiter Dashboard transitions from dark, high-contrast layouts to a sleek, premium, light-themed SaaS dashboard environment similar to Stripe, Notion, and Ashby.

*   **Theme:** Pure Light Mode. Dark modes, hacker themes, and neon borders have been entirely eliminated.
*   **Colors:** Curated HSL-tailored branding tokens to feel premium and corporate.
*   **Typography:** Strict sans-serif system utilizing Inter and Outfit fonts for high readability and professional typography scaling.
*   **Shadows & Boarders:** Very subtle slate borders (`border-slate-100`) combined with soft blur-shadows (`shadow-sm`) to define container bounds.

---

## 2. Design Token System

Only the CAPVIA Design System tokens are used for all component coloring:

| Category | Token Value | Description |
| :--- | :--- | :--- |
| **Primary** | `#0D47A1` | Deep Blue for active states, headers, primary buttons, and accent indicators |
| **Secondary** | `#42A5F5` | Sky Blue for active selections, progress indicators, and visual accents |
| **Accent** | `#FFC107` | Amber Gold for top candidate indicators, badges, and warning accents |
| **Success** | `#10B981` | Emerald Green for hired status indicators and completed action highlights |
| **Warning** | `#F59E0B` | Amber Warning for alerts and calibration indicators |
| **Danger** | `#EF4444` | Rose Red for rejected cards, violation telemetry, and warning flags |
| **Background**| `White` | Pure White (`#FFFFFF`) background for all cards, forms, and tables |
| **Surface** | `#F8FAFC` | Light slate blue background for general workspace areas |

---

## 3. Structural Design Modules

The dashboard incorporates three core design spaces:

1.  **Persistent Navigation Sidebar:** Handles quick context shifts between vacancies, applicant Kanban, settings, and billing. Collapsible and fully responsive.
2.  **Breadcrumb Header:** Guides recruiter routing and workspace state.
3.  **Analytics KPI Grid:** Premium cards displaying real-time averages, ratios, and counts.
