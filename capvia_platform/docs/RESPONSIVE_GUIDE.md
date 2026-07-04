# CAPVIA Landing Page Responsive Guide

## Breakpoints
- **Mobile (`sm` / < 640px):** Single-column layout. Stacked elements. Full-width buttons. Hamburger menu for navigation.
- **Tablet (`md` / 640px - 1024px):** Two-column grids for features and comparisons. Adjusted padding.
- **Desktop (`lg` / > 1024px):** Multi-column grids (up to 4 columns). Full horizontal navigation. Generous margins.
- **Large Desktop (`xl` / > 1280px):** Max-width containers to ensure content doesn't stretch too far, maintaining readability.

## Mobile-First Approach
- Base Tailwind classes define the mobile layout.
- `md:`, `lg:`, and `xl:` prefixes override base styles for larger screens.

## Typography Scaling
- Fluid typography concepts implemented via Tailwind text size classes (e.g., `text-3xl md:text-5xl lg:text-7xl`) to ensure proportional text sizing across devices.
