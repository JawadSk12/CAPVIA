# HR Responsive Viewport Guide

This document defines the responsive scaling behavior, breakpoints, and grid structures designed for the CAPVIA Recruiter Suite.

---

## 1. Breakpoint Design System

The application relies on standard Tailwind CSS breakpoints to adapt the interface:

*   **Desktop & Large Monitors (`lg:` / `xl:` >= 1024px - 1280px):**
    *   Persistent open Navigation Sidebar (64px width).
    *   Full multi-column dashboard grid.
    *   Horizontal comparison matrices and full Kanban board stages showing side-by-side.
*   **Laptops & Tablets (`md:` >= 768px):**
    *   Sidebar folds into a collapsible left panel triggered by a hamburger menu.
    *   Grids scale from 4-columns down to 2-columns (KPI Analytics cards and metrics).
    *   Table columns dynamically hide non-essential metadata (Views count or founded year).
*   **Mobile Viewports (`sm:` < 768px):**
    *   Full-screen layout containing scrollable lists and cards.
    *   Kanban Board stages shift from side-by-side columns to swipeable stack view.
    *   Detailed Candidate Profile Drawer expands to take 100% viewport width.

---

## 2. Layout Grid Adaptation Mappings

| Component | Desktop (>=1280px) | Tablet (768px - 1023px) | Mobile (<768px) |
| :--- | :--- | :--- | :--- |
| **KPI analytics grid** | `grid-cols-4` | `grid-cols-2` | `grid-cols-1` |
| **Dashboard columns** | 2/3 Timeline, 1/3 Action | 100% Timeline on top | Vertical stack |
| **Comparison matrix** | 4-6 candidates | 2-3 candidates (horizontal scroll)| 1-2 candidates (horizontal scroll) |
| **Kanban Columns** | 7 stages side-by-side | Horizontal scroll panel | Horizontal scroll panel |
| **Reports history table**| Full columns | Candidate, Stage, Action | Candidate & Action only |
