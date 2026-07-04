# CAPVIA AI Interview Responsive Layout & Viewport Guide

This guide details the breakpoint conventions, grid layouts, and mobile-responsive behaviors designed for the candidate evaluation terminal and recruiter portals.

---

## 1. Breakpoint Conventions

The frontend codebase utilizes Tailwind breakpoint utilities, matching standard viewport widths:

* **Mobile (default / up to `640px`)**:
  - Full-width stacked layout.
  - Video feed scales to match 100% viewport width.
  - Compact circular timers and hidden non-essential metrics.
* **Tablet (`sm` and `md` / `640px` to `1024px`)**:
  - Medium padding.
  - Progress timelines transition from vertical indices to horizontal swipe blocks.
  - Sidebar overlays collapse into tap drawers.
* **Desktop (`lg` and `xl` / `1024px` and above)**:
  - 12-column grid system layout.
  - Prominent split-screen workspace columns (5 cols for video and proctoring telemetry; 7 cols for interactive transcripts, timelines, and radial timers).
  - Pin-locked sticky sidebars and headers.

---

## 2. Component Layout Mapping

### A. Candidate Diagnostic Screen
* **Desktop**: Double card split view (diagnostics indicators on left, webcam canvas on right).
* **Mobile**: Single-column stacked stepper. Large actions buttons block the full width of the mobile viewport.

### B. Active Interview Workspace
* **Desktop**: 12-column split viewport:
  - LEFT: Camera panel (5-span) and proctoring gauges card.
  - RIGHT: Timeline trackers, circular timers, question text card, and search-filtered speech transcripts panel.
  - BOTTOM: Action bar (Mute, Fullscreen, Help, Quit).
* **Mobile / Tablet**: Vertical layout stack. The webcam preview floats at the top of the viewport or collapses into a compact floating thumbnail to maximize readability of the question card and transcript logs.

---

## 3. Viewport Verification Checklist

| Layout Page | Target Viewport | Verified Behavior |
| :--- | :--- | :--- |
| **Welcome Landing** | Mobile | Split graphics hide; core campaign cards scale to fill space. |
| **Device Diagnostics** | Desktop | Stepper fits in single row. Audio level bars animate horizontally. |
| **Interactive Terminal** | Mobile | Transcript scroll container collapses to `120px` to prevent overflow. |
| **Bypass Unlock PIN** | Mobile | Clicking numeric pad works with large touch areas (`w-14 h-14`). |
| **Recruiter Dashboard** | Tablet | Kanban stage columns scroll horizontally, preserving card layout. |
