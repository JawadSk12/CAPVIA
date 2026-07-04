# CAPVIA Landing Page & Authentication Accessibility Report

## Color Contrast
- Verified that primary (`#0D47A1`) and secondary (`#42A5F5`) colors provide sufficient contrast against the white and gray-50 backgrounds.
- Text colors utilize deep grays (`text-gray-900`, `text-gray-700`, `text-gray-600`) to ensure readability.
- Error states use high-contrast red (`text-red-600`, `bg-red-50`), and success states use green.

## Semantic HTML
- Proper use of `<header>`, `<main>`, `<section>`, `<article>`, and `<footer>` tags.
- Auth pages utilize `<main>` and proper semantic `<form>` boundaries.
- Correct heading hierarchy (`<h1>` to `<h6>`) maintained throughout the page.

## ARIA Attributes
- `aria-label` used on icon-only buttons, especially the password visibility toggle (Eye/EyeOff).
- `aria-expanded` and `aria-controls` implemented in the FAQ accordion section.
- Semantic labels linked to inputs via the `htmlFor` and `id` pairing in auth forms.

## Keyboard Navigation & Focus
- All interactive elements (links, buttons, accordion headers, inputs) are focusable and navigable via the `Tab` key.
- `autoFocus` is implemented on the primary input of the Login and Forgot Password pages to reduce friction.
- Distinct focus rings (`focus:ring-2 focus:ring-[#0D47A1]`) applied to ensure clear focus states for keyboard users.
- Tab order flows logically through the forms, ending at the submit button.
