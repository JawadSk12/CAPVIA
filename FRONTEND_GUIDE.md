# CAPVIA Core Frontend Architecture & UI/UX Technical Guide

This document is a master-level technical breakdown of the Next.js portal frontend for CAPVIA. It details the directory layout, stylesheets, Zustand stores, API interactions, core assessment workflows (ATS, Code Simulation, and Video Interview), and provides a critical evaluation of current UI/UX bottlenecks.

---

## 1. Directory Blueprint & Module Roles

The frontend is structured under a modular Next.js 14 App Router schema in `capvia_platform/frontend/src/`:

```
capvia_platform/frontend/src/
├── app/                              # Next.js App Router (Layouts, routes, global CSS)
│   ├── admin/                        # Admin-only dashboard, system logs, backend control panel
│   ├── api/                          # Next.js route handlers for server-side functions
│   ├── auth/                         # Authentication views (login, register, verification)
│   ├── candidate/                    # Candidate assessments (ATS, simulation workspace, video kiosk)
│   │   ├── ats/                      # Resume alignment scan portal
│   │   ├── interview/                # AI Video Interview workspace
│   │   │   ├── conduct/              # Active question recording view (webcam/mic)
│   │   │   ├── results/              # Post-interview evaluation feedback card
│   │   │   ├── validation/           # Client hardware/connection checks
│   │   │   └── validation-complete/  # Pre-interview handshake completion confirmation
│   │   ├── profile/                  # Personal details, resume links, application history
│   │   ├── reports/                  # View detailed skill score cards
│   │   └── results/                  # Detailed assessment metrics overview
│   │   └── simulation/               # AssessAI workspace wrapper
│   │       ├── [attemptId]/          # Dynamic page for active simulation attempts
│   │       └── page.tsx              # Attempt loading / redirection logic
│   ├── companies/                    # Recruiters' company profiles
│   ├── dashboard/                    # Primary dashboards (Candidate & Recruiter)
│   ├── globals.css                   # Global styles, variables, keyframe animations
│   ├── help/                         # FAQ and support chat components
│   ├── hr/                           # Recruiter workspaces (Job post, candidate overview, charts)
│   ├── internships/                  # Active job listings and application pages
│   ├── layout.tsx                    # Root HTML layout and Context Providers
│   ├── page.tsx                      # Root route coordinator
│   └── settings/                     # User preferences & security options
├── components/                       # Shared layout and structural components
│   ├── ApplicationProgress.tsx       # Timeline stepper displaying application status
│   ├── ApplyButton.tsx               # State-aware apply button with threshold checks
│   ├── Navbar.tsx                    # Navigation headers (candidate vs recruiter view)
│   └── Sidebar.tsx                   # Panel navigation for recruiter/admin views
├── features/                         # Domain-focused feature implementations
│   ├── interview/                    # Device checks, question queues, recording hooks
│   ├── simulation/                   # AssessAI code sandbox components
│   │   └── components/
│   │       ├── SimulationInterface.tsx # Code editor, blueprint tabs, timers
│   │       └── SimulationComplete.tsx  # Post-simulation submission page
│   └── auth/                         # Sign-up/Sign-in components
├── store/                            # Zustand global state slices
│   ├── atsStore.ts                   # ATS processing, scoring, and analysis state
│   ├── auth.ts                       # Token storage and current user attributes
│   ├── company.ts                    # Recruiter company records and analytical values
│   ├── internship.ts                 # Internship job listings state
│   └── index.ts                      # Central store exporter
├── services/                         # Business layer services
│   ├── api.ts                        # Axios API definition and interceptor configuration
│   ├── integrityService.ts           # Proctoring metrics tracker
│   └── securityLogger.ts             # Suspicious browser action recorder (clipboard, keylog)
└── types/                            # Shared TypeScript interfaces
```

---

## 2. Core Styling & CSS Variables (`app/globals.css`)

The application's design system and dynamic micro-animations are defined in [globals.css](file:///Volumes/KINGSTON/CAPVIA/capvia_platform/frontend/src/app/globals.css):

### A. Design Tokens (`:root`)
- **Primary Color (`--capvia-primary`)**: `#0D47A1` (Deep Royal Blue) - Used for primary actions, navigation, active states.
- **Secondary Color (`--capvia-secondary`)**: `#42A5F5` (Sky Blue) - Used for borders, info badges, helper states.
- **Success State (`--capvia-success`)**: `#10B981` (Green) - Signifies parsed/completed items.
- **Warning State (`--capvia-warning`)**: `#F59E0B` (Amber) - Used for warning prompts and ongoing processes.
- **Danger State (`--capvia-danger`)**: `#EF4444` (Red) - Flags proctoring alerts or errors.
- **Base Background (`--capvia-bg`)**: `#F8FAFC` (Slate Tint) - Page backgrounds.
- **Fonts**: Outward Inter (`var(--font-inter)`), JetBrains Mono (`var(--font-mono)`).

### B. Specialized Animations
- **AI Wave (`.ai-wave-bar`)**: Scaling animation representing active speech volume levels during video interview recording.
- **Recording Pulse (`.rec-dot`)**: Blinking red dot indicator inside the video interview kiosk.
- **Neon Glow (`.neon-pulse`)**: Floating box-shadow pulsing effect on highlight features.
- **Grid Background Flow (`.grid-flow-bg`)**: Background decoration that moves linearly over 20s to create a tech feel.
- **Float Slow (`.animate-float`)**: A gentle translate animation applied to cards to make the layout feel interactive.

---

## 3. State Management & API Gateway (`services/api.ts` & `store/`)

### A. Axios Client & Token Rotation
All outgoing requests are intercepted to dynamically inject the bearer credentials. If a response returns `401 Unauthorized`, the client intercepts the error, queries `/auth/refresh` with the refresh token, writes the rotated tokens back to `localStorage`, and retries the original request seamlessly. If token rotation fails, the local storage is cleared, and the user is redirected to the login page.

### B. Key API Interfaces
- **`authApi`**: Handles user authentication (`register`, `login`, `logout`, `verifyEmail`, `resetPassword`).
- **`recruitmentApi`**: Fetches candidate application lists (`getApplications`) and provides a test trigger route (`triggerWebhook`).
- **`companyApi`**: Recruiter workspace queries (list, create, update, manage members, request verification).
- **`internshipApi`**: Handles job posts (create, update, publish, archive, restore).

### C. Zustand State Management
1. **`auth` (`store/auth.ts`)**: Stores token tokens, current user role (`STUDENT`, `HR`, `ADMIN`), and manages logouts.
2. **`atsStore` (`store/atsStore.ts`)**: Tracks resume parsing states, current parse errors, and the resulting score vectors.
3. **`company` (`store/company.ts`)**: Maintains the active company context and analytics statistics.
4. **`internship` (`store/internship.ts`)**: Caches and updates job openings for the marketplaces.

---

## 4. Key Assessment Workspaces

### A. ATS Resume Parser
- **Location**: `src/app/candidate/resume/` and `src/store/atsStore.ts`.
- **Flow**:
  1. Candidate uploads a PDF/Word resume.
  2. The page calls the upload API.
  3. The parser queues the analysis on Celery (background).
  4. Returns score mappings (Technical Alignment, Experience, Domain Match, Hiring Readiness).
  5. If the resume is flagged as high-risk, a fraud probability rating is saved.

### B. Simulation Workspace (AssessAI)
- **Location**: `src/features/simulation/components/SimulationInterface.tsx`.
- **Flow**:
  1. Retrieves the role's assessment blueprint containing rounds (e.g., Round 1: Requirements analysis, Round 2: Coding, Round 3: Architecture, Round 4: Debugging).
  2. Renders the interactive layout:
     - Left: Question content, scenario descriptions, scoring criteria.
     - Right: Code editor (Monaco or textarea playground) and submission fields.
  3. **Timers**: Manages strict, per-round countdown timers. On expiration, it auto-saves and forces a transition to the next round.
  4. **Proctoring**: Leverages `integrityService.ts` to record window focus losses (tab switches), copy-pastes, and clipboard manipulations. These are sent to `/attempts/{attempt_id}/events`.

### C. AI Video Interview
- **Location**: `src/features/interview/components/Interview.tsx`.
- **Flow**:
  1. Hardware check validates camera and microphone feed (`DeviceValidation.tsx`).
  2. Questions are read aloud via text-to-speech, and the system records candidate video/audio responses.
  3. Evaluates speech flow and counts proctoring indicators (look-aways, facial presence, background noise).
  4. Encodes and uploads video packets directly to the evaluation server.

---

## 5. Exhaustive UI/UX Specifications by Page

This section details the UI/UX layout configurations, visual design properties, interaction states, and styling elements of the CAPVIA Next.js client.

### A. Authentication Views (`app/auth/`)
- **Visual Design & Grid**: 
  - Uses a double-panel split grid or centered card overlay depending on screen width. 
  - Background features a dynamic linear gradient `bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900` paired with the `.grid-flow-bg` decoration.
- **Card Hierarchy**: 
  - Outer container utilizes `bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl p-8 max-w-md w-full`.
- **Input Fields**: 
  - Designed as floating labels: `peer placeholder-shown:scale-100 placeholder-shown:translate-y-0 focus:scale-75 focus:-translate-y-4`.
  - Borders transition from `border-slate-200` to `border-indigo-500 focus:ring-4 focus:ring-indigo-100`.
- **Interactive Triggers**: 
  - The submit button contains a subtle hover transform scaling: `transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/20`.

### B. Candidate Dashboard (`app/dashboard/`)
- **Structure & Layout**:
  - Top: Hero status card summarizing active steps with Outfit font headers (`text-2xl font-black tracking-tight text-slate-800`).
  - Left Panel: Navigation items linking to My Career, Browse Jobs, Resume Scanner, Coding Test, AI Interview.
  - Center Workspace: Cards summarizing active job applications.
- **Visual Stepper (`components/ApplicationProgress.tsx`)**:
  - Renders a vertical node connector detailing the five lifecycle stages.
  - Active Node: Uses an animated pulsating green border and standard checkmark icon (`text-white bg-[#10B981]`).
  - Completed Node: Green background and white checkmark icon.
  - Inactive Node: Grey circle (`bg-slate-100 border-slate-200`).
- **Interactive Hover Indicators**:
  - Application cards utilize `hover:shadow-md hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer`.

### C. Resume Upload & ATS Scanner (`app/candidate/resume/`)
- **Upload Zone**:
  - Dashed container: `border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-400 transition-all rounded-3xl p-12 text-center`.
  - Drop Target State: Triggered via drag-over states by dynamically applying `border-indigo-500 bg-indigo-50/30`.
- **Parsing Progress Indicator**:
  - An inline horizontal loading bar using keyframe progress states (`bg-gradient-to-r from-indigo-500 to-sky-500 h-1.5 rounded-full transition-all duration-500`).
  - Displays accompanying detail cues (e.g., "Scanning experience sections...", "Mapping technical alignment scores...").
- **Score Results Display**:
  - Standardized cards displaying 0-100 scores in circular gauge formats.
  - Colors are dynamic: `>=80` uses `text-emerald-500` (Excellent), `60-79` uses `text-amber-500` (Moderate), and `<60` uses `text-rose-500` (Critical).

### D. Coding Simulation Workspace (`app/candidate/simulation/[attemptId]/`)
- **Layout & Panels**:
  - Renders a 50/50 split-screen design.
  - **Left Panel (Instructions)**: Renders scrollable Markdown text detailing the round scenario, tools, and tasks. Features `bg-slate-900 text-slate-100 overflow-y-auto px-6 py-8 border-r border-slate-800`.
  - **Right Panel (Playground)**: Features tabs (Description, Code Editor, Console Output).
- **Code Editor**:
  - Monaco Editor instance with VS-Dark skin theme integration. Includes custom font configurations: `font-family: var(--font-mono); font-size: 13px; line-height: 1.5;`.
- **Timers & Warning States**:
  - Renders a persistent round countdown timer in the header (`font-mono text-sm tracking-widest font-black`).
  - Warning Transition: If remaining time falls below 2 minutes, the timer text transitions to `text-rose-500 font-bold scale-110 duration-500 animate-pulse`.

### E. AI Video Interview Kiosk (`app/candidate/interview/`)
- **Validation Screen (`DeviceValidation.tsx`)**:
  - Hardware status cards showing checkmarks for webcam stream active, microphone level active, and internet ping.
  - Webcam viewport is framed in a smooth circle with a slate border, transforming to an emerald glow once valid.
- **Kiosk Active Interview (`Interview.tsx`)**:
  - Top center: Question cards rendered in large, readable font size (`text-xl font-bold tracking-tight text-slate-800 leading-snug`).
  - Left panel: Live video feedback container showing the webcam stream with an active red recording badge (`rec-dot`).
  - Bottom panel: Visual voice wave indicator (`ai-wave-bar`) fluctuating according to candidate speech output.
  - Answer Countdown: High-visibility countdown timer tracking remainder of speaking time.

### F. HR / Recruiter Panel (`app/hr/dashboard/`)
- **Layout Grid**:
  - Uses a fixed vertical navigation sidebar (`w-64 bg-[#0D47A1] text-white`) and a flexible main workspace container (`bg-[#F8FAFC] flex-1 min-h-screen`).
- **Applicant Data Tables**:
  - Renders clean grid lists with table headers (`text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-50`).
  - Cells feature quick-action action triggers (Inspect dossier, view submitted code, view video report).
- **Radar Charts**:
  - 8-axis canvas rendering (Problem Solving, Execution, leadership, etc.). Line colors match the Capvia theme (`stroke: var(--capvia-primary)`, fill is a translucent sky-blue tint `rgba(66, 165, 245, 0.15)`).

---

## 6. UI/UX Bottleneck Analysis & Recommendations

### A. Why the UI/UX Currently Feels Slow
1. **Blocking Lifecycle States**:
   State progression relies on backend queues. If the user completes the simulation, they are locked out until the Celery evaluation task runs, updates the DB, and the frontend refreshes. If there's high queue traffic, the client feels unresponsive.
2. **Lack of Optimistic UI Triggers**:
   When users save code or upload files, the application blocks interactive inputs until a response is received, introducing lag.
3. **No Incremental Parsing Feedback**:
   While Celery parses resumes (which can take 15s), the UI displays a blank spinner instead of step-by-step progress metrics.

### B. Recommendations for Refinement
- **Establish SSE/WebSockets**: Implement a WebSocket route to push stage completions (e.g., `SIMULATION_COMPLETED_SUCCESSFULLY`) directly to the client instead of page refreshes.
- **Implement skeleton loaders**: Replace full-screen loading spinners with card-level layout skeletons.
- **Deploy Optimistic UI Updates**: Immediately transition the timeline step inside the Zustand store on submission, reverting only on error catch.
