# HR Platform Accessibility Report

This report documents the accessibility measures and standards implemented across the redesigned CAPVIA Recruiter Dashboard to satisfy WCAG 2.1 AA guidelines.

---

## 1. Contrast & Color Standards

By adopting the CAPVIA Light Design System, all color allocations adhere to strict contrast standards:
*   **Typography:** Charcoal body text (`#334155` or `#1E293B`) on pure white (`#FFFFFF`) card backgrounds guarantees a contrast ratio exceeding **4.5:1** (WCAG AA standard).
*   **Status Badges:** Text colors on status badges (e.g. emerald text on green tint, or rose text on pink tint) are selected to remain readable at small font sizes (contrast > 4.0:1).
*   **Non-Reliance on Color:** Warnings and telemetry alerts use explicit icons (e.g. `AlertTriangle` or `ShieldCheck`) to ensure color-blind users can instantly detect risk signals without relying solely on color indicators.

---

## 2. Keyboard Navigation & Focus Mappings

All dashboard controls are keyboard-navigable:
*   **Tabbing Sequence:** Interactive controls (select dropdowns, buttons, checkboxes, input text fields) follow a natural logical focus sequence.
*   **Focus Ring Indicator:** Focus states trigger visible focus indicator rings (`focus:outline-none focus:border-[#0D47A1]`) to aid navigation for keyboard-only users.
*   **Modal & Drawer Traps:** Modals (Create Vacancy) and Side Drawers (Candidate Profile) trap keyboard focus while open, preventing tab leakage into background elements. Focus returns to the triggering button upon close.

---

## 3. ARIA Landmarks & Structural HTML

Semantic HTML tags are implemented throughout to guide screen readers:
*   `header` marks top navigation breadcrumb controls.
*   `aside` marks the collapsible persistent navigation sidebar.
*   `main` marks the core recruitment workspace panels.
*   `aria-label` descriptors are attached to icon-only buttons (such as the quick candidate comparison button, or report download actions) to convey purpose to screen readers.
*   `aria-hidden="true"` is applied to decorative Lucide icons to prevent screen reader noise.
