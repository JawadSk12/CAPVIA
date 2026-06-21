# CAPVIA Frontend

> Next.js 14 (App Router) production frontend for the CAPVIA ATS Analyzer platform.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, RSC) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 |
| State | Zustand (authStore, atsStore) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| HTTP | Axios + interceptors |
| Auth persistence | sessionStorage (user) + memory (token) |
| Toast | react-hot-toast |
| Icons | Lucide React |

---

## Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx                  # Root layout + providers + Toaster
│   ├── globals.css                 # Design tokens, Tailwind base, custom classes
│   ├── page.tsx                    # Landing / marketing page
│   ├── (auth)/
│   │   ├── layout.tsx              # Redirects authenticated users
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── student/
│   │   ├── dashboard/page.tsx      # Score summary, quick actions
│   │   ├── upload/page.tsx         # PDF drag-and-drop + pipeline progress
│   │   ├── analysis/
│   │   │   ├── page.tsx            # History list (search + filter)
│   │   │   └── [id]/page.tsx       # Detail: Overview, SkillGap, Heatmap, SHAP, Rewrite
│   │   ├── internship/page.tsx     # Browse JDs + trigger compare
│   │   └── progress/page.tsx       # ATS score trend + achievement badges
│   ├── hr/
│   │   ├── dashboard/page.tsx      # KPIs, funnel, score distribution
│   │   ├── candidates/page.tsx     # Filterable candidate list
│   │   ├── candidate/[id]/page.tsx # Full candidate evaluation + actions
│   │   ├── internship/
│   │   │   ├── page.tsx            # Internship listing
│   │   │   ├── new/page.tsx        # Create internship form
│   │   │   └── [id]/page.tsx       # Detail + ranked candidates
│   │   └── analytics/page.tsx      # Skill trends, funnel analytics
│   └── admin/
│       └── dashboard/page.tsx      # System health, user management
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── ats/
│   │   ├── ATSMeter.tsx            # Animated circular score gauge
│   │   ├── SkillGapChart.tsx       # Recharts RadarChart
│   │   ├── ResumeHeatmap.tsx       # Token-level colour heat map
│   │   ├── ExplainabilityPanel.tsx # SHAP feature bars
│   │   ├── ResumeRewriteAI.tsx     # SSE-streaming AI rewrite
│   │   ├── FakeSkillAlert.tsx      # Fraud flag banner
│   │   ├── ConfidenceIndicator.tsx # Colour-coded AI confidence badge
│   │   ├── InternshipComparison.tsx# JD match breakdown
│   │   └── SemanticMatchViz.tsx    # Skill scatter plot (Recharts)
│   ├── hr/
│   │   ├── CandidateCard.tsx
│   │   ├── CandidateRanking.tsx
│   │   ├── ComparisonTable.tsx
│   │   └── HiringFunnel.tsx
│   └── shared/
│       ├── FileUpload.tsx
│       ├── LoadingSpinner.tsx
│       └── ProgressBar.tsx
├── store/
│   ├── authStore.ts                # Zustand auth (user, login, register, logout)
│   └── atsStore.ts                 # Zustand ATS (upload, polling, analysis, rewrite)
├── lib/
│   └── api.ts                      # Axios instance + all typed API functions
├── types/
│   └── ats.ts                      # Shared TypeScript types (mirrors backend Pydantic)
├── public/                         # Static assets
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── postcss.config.js
```

---

## Pages & Features

### Student Flow
| Page | Route | Features |
|------|-------|---------|
| Dashboard | `/student/dashboard` | Latest score card, quick-upload CTA, progress snapshot |
| Upload | `/student/upload` | Drag-and-drop PDF, real-time Celery pipeline progress, auto-redirect |
| Analysis History | `/student/analysis` | Search + filter past scans, score trend sparklines |
| Analysis Detail | `/student/analysis/[id]` | Tabbed: Overview · Skill Gap Radar · Resume Heatmap · SHAP Explainability · AI Rewrite |
| Internships | `/student/internship` | Browse live JDs, one-click resume vs JD comparison |
| Progress | `/student/progress` | ATS score timeline (AreaChart), gamified achievement badges |

### HR Flow
| Page | Route | Features |
|------|-------|---------|
| Dashboard | `/hr/dashboard` | KPI cards, score distribution bar chart, pipeline funnel |
| Candidates | `/hr/candidates` | Multi-filter (JD, score range, status, fraud flag), paginated table |
| Candidate Detail | `/hr/candidate/[id]` | SHAP explainability, fraud alerts, Shortlist / Reject / Interview buttons |
| Internship List | `/hr/internship` | Active/expired toggle, search, applicant counts |
| Post Internship | `/hr/internship/new` | JD textarea, skill tag builder, deadline picker |
| Internship Detail | `/hr/internship/[id]` | ComparisonTable with quick actions |
| Analytics | `/hr/analytics` | Top skills bar chart, hiring funnel, role distribution |

---

## State Management

```
authStore (sessionStorage)          atsStore (memory only)
─────────────────────────           ──────────────────────
user: AuthUser | null               upload: UploadState
isAuthenticated: boolean              ├── file, resumeId
login(email, pw)                      ├── uploadProgress (0-100)
register(payload)                     ├── processingStatus
logout()                              └── stageLabel
loadMe()                            analysisResult: ATSAnalysisResponse
                                    isUploading: boolean
Selectors:                          rewrite: RewriteState (SSE)
  useIsHR()                         history: ResumeSummary[]
  useIsStudent()                    loadHistory(), loadAnalysis()
  useIsAdmin()                      startUpload(), requestRewrite()
```

---

## API Integration

All API calls live in `lib/api.ts` and are grouped into:

```typescript
authApi     →  login, register, logout, me, refresh
resumeApi   →  upload, getStatus, getAnalysis, getHistory, requestRewrite, compareWithJD
internshipApi → list, get, create, update, getCandidates
hrApi       →  getCandidates, updateCandidateStatus, getAnalytics
adminApi    →  getHealth, getUsers
```

The Axios instance automatically:
- Injects `Authorization: Bearer <token>` (from `tokenStore` — memory only)
- Intercepts 401 → attempts token refresh → retries
- Forwards `withCredentials: true` for the httpOnly refresh cookie

---

## Design System

The design follows the CAPVIA color palette defined in `globals.css` and `tailwind.config.ts`:

| Token | Color | Usage |
|-------|-------|-------|
| `indigo-600` (#4F46E5) | Primary accent | Buttons, links, active states |
| `emerald-500` (#10B981) | Success / matched | Score badges GOOD/STRONG |
| `amber-500` (#F59E0B) | Warning | Score band FAIR, alerts |
| `rose-500` (#F43F5E) | Danger | Fraud flags, score band WEAK |
| `slate-800` (#1E293B) | Body text | Headings |
| White / `slate-50` | Background | Page backgrounds |

Utility CSS classes defined in `globals.css`:

```css
.card           /* white card with shadow + border-radius */
.card-hover     /* card + hover lift animation */
.btn-primary    /* indigo filled button */
.btn-outline    /* indigo outlined button */
.btn-ghost      /* ghost button */
.badge          /* pill badge base */
.badge-emerald, .badge-rose, .badge-indigo, .badge-amber, .badge-slate
.input          /* styled text input */
.label          /* form label */
.section-title  /* page heading */
.page-container /* max-width content wrapper */
```

---

## Setup & Run

### Prerequisites
```bash
node >= 18
npm  >= 9
```

### Install
```bash
# ⚠️ Ensure you have at least 2 GB free disk space first
npm install --legacy-peer-deps
```

### Environment
```bash
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development
```bash
npm run dev
# → http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
```

### Docker
```bash
docker-compose up frontend
```

---

## Environment Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
