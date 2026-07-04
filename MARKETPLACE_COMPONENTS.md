# Marketplace Components Documentation

This document describes the structure, props, and roles of the core React components within the modernized Internship Marketplace.

## Component Reference

### 1. `InternshipsContent` (`src/app/internships/page.tsx`)
The main dashboard controller that coordinates search inputs, filter states, bookmark list sync, and pagination.
- **State variables**:
  - `filters`: Contains query parameters for backend APIs.
  - `searchInput`, `locationInput`: Local input states.
  - `selectedDuration`: Client-side duration category (`ALL` \| `SHORT` \| `MEDIUM` \| `LONG`).
  - `savedIds`: String array of bookmarked internship IDs.
- **Responsibilities**: Triggers network requests to `internshipApi.list`, applies client-side refinements, and coordinates the rendering of grid items.

### 2. `InternshipCard` (rendered inline in `page.tsx`)
A card-style representation of a single vacancy.
- **Props**:
  - `job: Internship`: The raw internship details.
  - `isSaved: boolean`: Bookmark indicator.
  - `onToggleSave: (e: React.MouseEvent) => void`: Callback to save/unsave.
- **Interactions**:
  - Entire card click navigates to `/internships/${job.id}`.
  - Quick Apply button triggers the apply modal overlay.
  - Save button updates bookmarks state.
  - Interactive elements call `e.stopPropagation()` and `e.preventDefault()` to prevent event bubbling.

### 3. `ApplyButton` (`src/components/ApplyButton.tsx`)
An interactive action trigger that overlays a submission modal.
- **Props**:
  - `internshipId: string`: Database vacancy ID.
  - `internshipTitle: string`: Position name for context.
  - `isDeadlinePassed?: boolean`: Active status checker.
  - `onSuccess?: (applicationId: string) => void`: Completion routing callback.
- **Visuals**: Modernized to a clean white modal containing cover letter textareas and resume URL inputs.

### 4. `ApplicationProgress` (`src/components/ApplicationProgress.tsx`)
A vertical tracking stepper showing the candidacy timeline.
- **Props**:
  - `currentStatus: string`: Current DB status of the application.
  - `isTerminal?: boolean`: If the application is hired, rejected, or withdrawn.
- **Design**: Clean circular indicators colored green for completed, blue for active, red for rejected, and grey for pending steps.
