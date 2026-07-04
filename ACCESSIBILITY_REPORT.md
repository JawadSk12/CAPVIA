# CAPVIA AI Interview Accessibility Audit Report

This report evaluates and documents the web accessibility standards (WCAG 2.1 Compliance) implemented during the browser-native migration.

---

## 1. Compliance Standard (WCAG 2.1 AA)

To support candidates with diverse accessibility needs:

* **Keyboard Operability**: Core actions (starting diagnostics, submitting speech answers, unlocking proctor screens, launching terminals) can be executed using keyboard shortcuts.
* **Screen Reader Accessibility**: Native HTML5 semantic tags (`header`, `main`, `footer`, `nav`, `section`) delineate workspace boundaries.
* **Color Contrast**: Background canvases are absolute white (`#FFFFFF`) or light slate (`#F8FAFC`), while text elements leverage highly legible charcoal weights (`#0F172A` or `#334155`), ensuring a minimum contrast ratio of **4.5:1** for standard copy.

---

## 2. Accessibility Engineering Details

### A. Supervisor Bypass Numeric Keyboard Intercepts
* **Keyboard entry support**: When `AdminUnlockModal.tsx` opens, keys `0-9` map directly to PIN inputs. `Backspace` clears the last digit, `Escape` dismisses the prompt, and `Enter` submits verification.
* **ARIA Indicators**: Interactive modals contain `role="dialog"` and `aria-modal="true"`. Focus is trapped inside the PIN pad frame.

### B. High-Contrast Interactive Indicators
* Badges indicating webcam detection status, mic muted states, and security locks dynamically transition colors (e.g., `#EF4444` for red alerts, `#10B981` for green passes), accompanied by text markers (e.g., `✓ PASSED` or `✗ FAILED`) to avoid color-only reliance.

---

## 3. Recommended Accessibility Intercepts

| Target Component | Accessibility Enhancement | ARIA Attribute / Selector |
| :--- | :--- | :--- |
| **Circular Timer SVGs** | Screen reader readable aria-labels | `aria-label="Question timer: 45 seconds remaining"` |
| **Speech Transcript Search** | Clear accessible search labels | `<input aria-label="Search live answers history" />` |
| **Diagnostics Stepper** | Visual indicators of current active step | `aria-current="step"` on the active step circle |
| **Video Recording Badge** | Pulsing visual badge accompanied by text | `role="status"` on the "REC" live indicator |
