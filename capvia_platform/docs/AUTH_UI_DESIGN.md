# CAPVIA Authentication UI Design System

## Overview
The Authentication flow for CAPVIA has been completely redesigned to reflect a premium, minimalist, world-class SaaS product. The design prioritizes trust, ease of use, and a frictionless onboarding experience.

## Layout Structure
- **Split-Screen Design:** Used on Login and Register pages. The left side showcases a high-impact branded illustration (using the primary brand color and radial gradients), while the right side focuses purely on the form interface.
- **Centered Cards:** Used for Forgot Password, Reset Password, Email Verification, and Profile Setup pages. This focuses the user's attention on single, discrete tasks.

## Color Palette
- **Primary:** `#0D47A1` (Deep Blue) - Used for primary CTAs, active focus states, and branding.
- **Secondary:** `#42A5F5` (Light Blue) - Used for accents, secondary links, and hover states.
- **Backgrounds:** `White` for cards and `gray-50` for the page background to create depth.
- **Validation:** 
  - Error: `red-50` background, `red-600` text.
  - Success: `green-50` background, `green-500` icon.
  - Warning: `yellow-50` background, `yellow-700` text.

## Typography & Components
- **Fonts:** `Outfit` for strong, modern headings; `Inter` for highly legible body text and form labels.
- **Cards:** Clean white cards with a `24px` border radius (`rounded-[24px]`) and a soft, refined shadow (`shadow-xl shadow-gray-200/50`).
- **Inputs:** Large, accessible inputs with `16px` border radius, inline icons, and clear focus rings.
- **Animations:** Subtle `framer-motion` entry animations, animated error states, and a shimmer effect on primary buttons during hover.
