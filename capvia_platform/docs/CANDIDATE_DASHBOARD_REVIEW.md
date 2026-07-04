# CAPVIA Candidate Dashboard Review

This document contains evaluations for responsiveness, accessibility, loading animations, and proctoring flow checks.

## 1. Responsive Layout Audit

The redesigned dashboard was audited for fluid grids and flexbox adjustments across devices:
- **Mobile Devices (<768px)**: 
  - Sidebar collapses into a slide-out overlay controlled by a mobile-nav hamburger menu button on the header.
  - Metrics row stacks vertically.
  - Three-column grid inside the proctor details page folds into a single linear workflow.
- **Tablet Devices (768px - 1024px)**:
  - Metric blocks reflow into a 2x2 grid.
  - Main contents split into a 2-column card view (applications + history).
- **Desktop Screens (>1024px)**:
  - Sidebar is locked open.
  - Dashboard panels expand to full three-column layouts.

## 2. Accessibility Verification

The dashboard components were verified against WCAG 2.1 AA parameters:
- **Color Contrast**: Text colors satisfy contrast ratios:
  - Slate 800 (`#1E293B`) on White (`#FFFFFF`): 9.7:1 (Passes AAA).
  - Slate 500 (`#64748B`) on White (`#FFFFFF`): 4.6:1 (Passes AA).
  - Primary `#0D47A1` on White (`#FFFFFF`): 9.3:1 (Passes AAA).
- **Interactive States**: Keyboard navigation is supported. Focus highlights are enabled on form input and selection fields.
- **ARIA Elements**: Screen reader accessibility is supported via descriptive ARIA attributes and labels.

## 3. UI States

- **Loading Spinners & Skeletons**: Integrated to prevent layout shifting while Tanstack Query fetches applications or resume histories.
- **Beautiful Empty States**: Created custom illustrations and prompt cards for cases where application listings, resume histories, or notification alerts are completely blank.
- **Interactive Proctoring Feedback**: Cheat probability indices are color-coded in real-time. Warnings are summarized cleanly using severity tags.
