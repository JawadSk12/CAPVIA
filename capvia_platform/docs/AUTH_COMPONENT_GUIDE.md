# CAPVIA Authentication Component Guide

## Components Directory
Location: `frontend/src/app/auth/`

### 1. `login/page.tsx`
- **Purpose:** Primary authentication entry point.
- **UI Elements:** Split-screen layout, email/password inputs, password visibility toggle, remember me checkbox, Google OAuth placeholder.
- **Integration:** Calls `authApi.login`. On success, writes to Zustand `useAuthStore` and redirects to `/dashboard`.

### 2. `register/page.tsx`
- **Purpose:** New user creation.
- **UI Elements:** Split-screen layout, role selector (Candidate/HR), dynamic company name field, password strength indicator.
- **Integration:** Calls `authApi.register`. Redirects to `/auth/verify-email`.

### 3. `forgot-password/page.tsx`
- **Purpose:** Initiate password recovery.
- **UI Elements:** Centered card, single email input, success state with simulated reset token link.
- **Integration:** Calls `authApi.forgotPassword`.

### 4. `reset-password/page.tsx`
- **Purpose:** Finalize password recovery using a token.
- **UI Elements:** Centered card, new password, confirm password, password strength indicator. Wrapped in `Suspense` due to `useSearchParams`.
- **Integration:** Calls `authApi.resetPassword`.

### 5. `verify-email/page.tsx`
- **Purpose:** Handle email verification from registration or direct link.
- **UI Elements:** Centered card, success/error states, simulated "Verify Instantly" button. Wrapped in `Suspense`.
- **Integration:** Calls `authApi.verifyEmail`. Redirects to `/auth/profile-setup`.

### 6. `profile-setup/page.tsx`
- **Purpose:** Onboarding profile completion for Candidate and HR roles.
- **UI Elements:** Segmented control for role toggle, complex form grid layouts, custom file upload dropzones, success animation.
- **Integration:** Mocked API submission timeout; ultimately redirects to `/dashboard`.
