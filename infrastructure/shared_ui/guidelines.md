# CAPVIA Unified Design System Guidelines

This document outlines the core principles, visual tokens, and layout guidelines for the **CAPVIA Platform** design system. Every module (ATS, Simulation, Interview, Gateway) must strictly adhere to these guidelines to ensure visual consistency.

---

## 1. Visual Consistency & Philosophy
The CAPVIA design system is built to feel **clean, professional, and enterprise-grade**.
*   **Minimalist Depth**: Depth is communicated using standard flat colors and soft shadows.
*   **No Neon/Glow Effects**: Do not use neon colors, glowing borders, or neon card hover effects.
*   **Tactile Elements**: Subtle animations (scale down on button click) indicate interactiveness.

---

## 2. Brand Colors Usage Matrix

| Theme Role | Hex Code | Tailwind class | Usage Guidelines |
| :--- | :--- | :--- | :--- |
| **Primary** | `#0D47A1` | `bg-primary` / `text-primary` | Main CTA buttons, sidebars, active states, key headers. |
| **Secondary**| `#42A5F5` | `bg-secondary` / `text-secondary` | Secondary actions, badges, highlights, system tabs. |
| **Accent** | `#FFC107` | `bg-accent` / `text-accent` | Scoring highlights, Tier rankings, special indicators. |
| **Success** | `#10B981` | `bg-success` / `text-success` | Verified states, high score badges, low-suspicion checks. |
| **Warning** | `#F59E0B` | `bg-warning` / `text-warning` | Medium suspicion warning, mid-tier candidate scores. |
| **Danger** | `#EF4444` | `bg-danger` / `text-danger` | Critical integrity violations, closed states, errors. |
| **Background**| `#FFFFFF` | `bg-white` | Default container and page background. |
| **Surface** | `#F8FAFC` | `bg-surface` | Table rows, card backgrounds, empty states. |

---

## 3. Typography & Hierarchy
All text layout elements must specify the correct font family to guarantee readability:
1.  **Headings (`Outfit`)**: Applied on page headers, card titles, and modal titles.
2.  **Body (`Inter`)**: Applied on all paragraph, table cell, input, and label elements.
3.  **Code (`JetBrains Mono`)**: Enforced inside the Code Simulation workspace compiler and code blocks.

### Size System
*   **Page Title**: `text-4xl` (36px) | Font: Outfit Bold | Tracking: Tight
*   **Section Title**: `text-2xl` (24px) | Font: Outfit Semibold
*   **Card Header**: `text-base` (16px) | Font: Outfit Bold
*   **Body Copy**: `text-sm` (14px) | Font: Inter Normal | Line Height: Relaxed
*   **Label/Meta text**: `text-xs` (12px) | Font: Inter Bold | Uppercase | Tracking: Wide

---

## 4. Spacing System (8px Grid)
All paddings, margins, gaps, and layouts must scale in multiples of **8px** (Tailwind equivalents):
*   `4px` - `xs` (Tailwind: `p-1`) - Smallest meta paddings.
*   `8px` - `sm` (Tailwind: `p-2`) - Label-to-input gap, icon offsets.
*   `12px` - `md` (Tailwind: `p-3`) - Card details grid spacing.
*   `16px` - `lg` (Tailwind: `p-4`) - Button padding, table cell padding.
*   `24px` - `xl` (Tailwind: `p-6`) - Inside padding of cards and modals.
*   `32px` - `2xl` (Tailwind: `p-8`) - Grid row gap, section separation.

---

## 5. Border Radius Standards
Enforce absolute consistency for corner rounding:
*   **Cards**: `20px` (or `rounded-[20px]`). Apply on Job, Candidate, and Analytics cards.
*   **Buttons**: `16px` (or `rounded-[16px]`). Apply on all clickable button elements.
*   **Inputs**: `16px` (or `rounded-[16px]`). Apply on Text inputs, textareas, selects, and file dropzones.
*   **Dialogs**: `24px` (or `rounded-[24px]`). Apply on modals and overlay alert boxes.

---

## 6. Motion Design (Framer Motion)
Animations must be **subtle, organic, and fast** so they never delay the candidate's journey:
*   **Transitions**: Duration must be between `0.15s` and `0.2s`.
*   **Easing**: Use custom bezier curves like `ease-out` or `cubic-bezier(0.16, 1, 0.3, 1)` for clean snaps.
*   **Button interactions**: Apply a micro-scale transition of `scale: 0.98` on click to give tactile feedback.
