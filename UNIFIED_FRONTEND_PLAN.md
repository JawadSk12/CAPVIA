# CAPVIA Unified Frontend Integration Plan

This document outlines the architectural blueprint for consolidating the **CAPVIA Platform** user interfaces into **one unified web application** using the Next.js App Router frontend at `capvia_platform/frontend` as the single frontend.

---

## 1. Unified Architecture Goals
*   **Single Codebase**: Eliminate separate frontend servers (ATS on 3001, Interview on 3002, Simulation on 3003) and build/bundle a single Next.js project.
*   **Unbroken User Experience**: Candidates and HR managers navigate between resume upload, coding tests, video interviews, and leaderboard reviews within a single domain and session.
*   **No API Redesign**: The backends, AI models, scoring algorithms, and database schemas remain 100% unchanged. The unified frontend communicates with existing REST endpoints.
*   **Shared Design Tokens**: All elements use the design system (Outfit/Inter/JetBrains Mono typography, `20px`/`16px` rounded corners, `#0D47A1` primary blue, `#42A5F5` sky blue, and `#FFC107` amber accent).

---

## 2. Directory Layout Structure

The consolidated frontend codebase is organized as follows:

```
capvia_platform/frontend/src/
├── app/                        # Next.js App Router Pages
│   ├── layout.tsx              # Root layout injecting Google Fonts
│   ├── page.tsx                # Unified landing page
│   ├── (auth)/                 # Credentials routing group
│   │   ├── login/              # Unified sign-in page
│   │   ├── register/           # Candidate registration
│   │   ├── forgot-password/    # Credentials recovery
│   │   └── reset-password/     # Password reset
│   ├── dashboard/              # Candidate dashboard
│   ├── internships/            # Vacancy list and detail routes
│   │   ├── page.tsx            # Internship search grid
│   │   └── [id]/               # Vacancy detail and apply
│   ├── application/[id]/       # Candidate progress stepper & results feed
│   ├── candidate/              # Candidate-specific feature routes
│   │   ├── ats/                # Resume upload & semantic match analysis
│   │   ├── simulation/         # Code compiler workspace
│   │   ├── interview/          # Webcam test & speech evaluation
│   │   └── results/            # Performance review feedback
│   ├── hr/                     # Recruiter-specific feature routes
│   │   ├── dashboard/          # Recruiter workspace & radar grids
│   │   ├── company/            # Company settings
│   │   ├── internships/        # Job listing builder
│   │   ├── candidates/         # Applicants database list
│   │   ├── rankings/           # Leaderboards & composite score tables
│   │   ├── reports/            # PDF download trackers
│   │   └── analytics/          # Proctoring flags & activity logs
│   └── admin/                  # System Administrator routes
│       ├── dashboard/          # Platform stats overview
│       ├── users/              # User account provisioning
│       ├── companies/          # Company verification approvals
│       └── settings/           # Global overrides configuration
├── features/                   # Core business modules (State + Components)
│   ├── ats/                    # ATS Resume parser components & Zustand slices
│   ├── simulation/             # Monaco editor, execution sockets & stores
│   ├── interview/              # MediaPipe tracker hook, WebRTC recorder & TTS services
│   ├── candidate/              # Candidate profile forms and dashboards
│   ├── hr/                     # Leaderboards, Radar visualizers, PDF downloaders
│   └── shared/                 # Core layout layouts
│       ├── Navbar.tsx          # Unified navigation header
│       ├── Sidebar.tsx         # Contextual sidebar (Candidate vs HR vs Admin)
│       └── Footer.tsx          # Shared brand footer
└── hooks/                      # Custom hooks (e.g. useBrowserSecurity.ts)
```

---

## 3. Key Layout Strategy
*   **Route Guards**: Next.js middleware and React Route Guards verify JWT token roles and redirect users dynamically.
*   **Modular Stores**: Feature-specific stores (e.g. `useSimulationStore.ts`) manage isolated module states without polluting the main auth store.
*   **Dynamic Component Loading**: Monaco Editor and MediaPipe wrappers are imported dynamically (`ssr: false`) to avoid server-side bundling errors.
