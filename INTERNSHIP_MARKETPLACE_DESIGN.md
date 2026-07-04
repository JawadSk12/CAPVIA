# Internship Marketplace Design Documentation

This document describes the design language, UI/UX aesthetics, color tokens, and layout guidelines implemented during the Internship Marketplace modernization.

## Design Aesthetic & Tone

The UI/UX has been modernized to provide a premium, clean, and highly professional internship browsing experience comparable to top-tier career platforms.

- **Theme**: Light-themed, high-contrast, professional workspace. (No dark mode, no neon).
- **Core Font Family**: `Inter` for functional user interfaces, and `Outfit` for display headings and titles.
- **Micro-Animations**: Smooth, professional, subtle hover and transition effects powered by Framer Motion. Motion transitions have durations under `200ms` to feel fast and responsive.

## Color Palette Tokens

All layouts utilize the official **CAPVIA Design System** tokens:

| Name | Hex Value | Role / Usage in UI |
| :--- | :--- | :--- |
| **Primary** | `#0D47A1` | Primary brand accent, primary CTA buttons, active sidebar navigation highlights, bold title links. |
| **Secondary** | `#42A5F5` | Secondary text details, work mode tags, sub-headings. |
| **Accent** | `#FFC107` | Bookmark indicators, save highlights, specialized highlights. |
| **Background** | `#FFFFFF` | Standard background of cards, containers, dialog modals. |
| **Surface** | `#F8FAFC` | Page backgrounds, tab lists backgrounds, inactive chip fills. |
| **Success** | `#10B981` | Completed application timeline states, verification badges, hired state panels. |
| **Warning** | `#F59E0B` | Pending timeline states, draft tags, warning callouts. |
| **Danger** | `#EF4444` | Rejected/withdrawn states, error boundaries, dangerous actions (e.g. withdraw confirms). |

## Key Redesigned Screens

1. **Marketplace Home (`/internships`)**:
   - Clean slate-100 borders, large card structures, white surface cards.
   - Distinctive search hero and horizontal category quick-filters.

2. **Internship Details (`/internships/[id]`)**:
   - Clean 2-column details split.
   - Right-side sticky CTA card grouping stipend, duration, openings, and application deadline info.
   - Mock recruiter and location map sections.

3. **Saved Jobs (`/internships/saved`)**:
   - A bookmark dashboard with a Collections management sidebar.
   - Skeletons and friendly illustrative empty states.

4. **Company Profile (`/companies/[id]`)**:
   - Tabbed view (Overview, Open Roles, Hiring Stats, Reviews).
   - Dynamically fetches and lists other open internships from the same organization.

5. **Application Dossier Details (`/applications/[id]`)**:
   - Full light-theme alignment.
   - Light-themed SVG Radar Chart showing the candidate's capability dimension matches.
