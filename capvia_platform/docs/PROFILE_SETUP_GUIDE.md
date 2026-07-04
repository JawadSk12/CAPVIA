# CAPVIA Profile Setup Guide

## Overview
The Profile Setup UI (`app/auth/profile-setup/page.tsx`) provides a unified onboarding experience for both Candidates and HR professionals. It is designed to capture the necessary metadata immediately after email verification, ensuring the user's dashboard is fully populated upon first entry.

## Candidate Profile Flow
When the "Candidate" role is selected, the form dynamically renders fields tailored to job seekers:

### Core Fields:
- **Profile Photo:** Custom drag-and-drop/click target zone.
- **Professional Headline:** Short description (e.g., "Senior React Developer").
- **Expected Stipend/Salary:** Financial expectations.
- **Preferred Locations:** Geographic preferences.

### Education & Skills:
- **College/University:** Institution name.
- **Degree & Branch:** Academic qualifications.
- **Top Skills:** Comma-separated list for matching algorithms.
- **Preferred Roles:** Target job titles.

### External Links & Documents:
- **LinkedIn, GitHub, Portfolio:** URL inputs with appropriate icons.
- **Resume Upload:** File dropzone for PDF/DOCX files.

## HR / Company Profile Flow
When the "HR / Company" role is selected, the form switches to capture organizational data:

### Core Fields:
- **Company Logo:** Custom upload zone.
- **Company Name:** Required string.
- **Industry:** Sector classification.
- **Company Size:** Dropdown select (1-10, 11-50, 51-200, etc.).

### Additional Details:
- **Website:** Company URL.
- **Headquarters Location:** Primary operating city/country.
- **Company Description:** Multi-line textarea for mission and values.

## Technical Implementation
- The page uses a single form with conditional rendering via `framer-motion`'s `<AnimatePresence>` to smoothly swap between Candidate and HR fields.
- Submissions are currently mocked in the UI and redirect to `/dashboard` upon completion. In a production environment, this would call a respective `usersApi.updateProfile` or `companyApi.create` endpoint.
