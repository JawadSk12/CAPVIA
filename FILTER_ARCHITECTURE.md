# Filter Architecture Documentation

This document explains the filtering mechanism designed for the CAPVIA Internship Marketplace. To ensure maximum flexibility while keeping backend APIs unchanged, the filtering layer uses a hybrid model of **API-Level Filters** and **Client-Side Filters**.

## Hybrid Filtering Strategy

```
                          ┌───────────────────────────┐
                          │    Internship API Query   │
                          └─────────────┬─────────────┘
                                        │ (page, work_mode, exp_level, search, location)
                                        ▼
                          ┌───────────────────────────┐
                          │   Raw Internship Results  │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │   Client-Side Refinement  │
                          │   (duration, skills)      │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │   Rendered Grid display   │
                          └───────────────────────────┘
```

### 1. API-Level Filters (Backend Executed)
These parameters are forwarded directly as query parameters to `/api/v1/internships` to minimize database bandwidth:
- **Work Mode**: Maps to `work_mode` (`REMOTE` \| `HYBRID` \| `ONSITE`).
- **Experience Level**: Maps to `experience_level` (`ENTRY` \| `MID` \| `SENIOR`).
- **Stipend presence**: Maps to `has_stipend` (`true` for paid-only, `false` for unpaid-only).
- **Location**: Maps to `location` (partial string match).
- **Sorting**: Maps to `sort_by` (`created_at` \| `view_count` \| `stipend_min` \| `application_deadline`) and `sort_dir` (`asc` \| `desc`).

### 2. Client-Side Filters (Frontend Refined)
These parameters are applied in-memory over the fetched array of jobs to support advanced filters without changing API schemas:
- **Duration (Weeks)**: Filters by `duration_weeks` values:
  - **Short**: `duration_weeks` <= 8.
  - **Medium**: `duration_weeks` > 8 and <= 16.
  - **Long**: `duration_weeks` > 16.
- **Skills Check (Future Ready)**: Refines jobs by checking if the listing contains skills matching candidate preferences.

## State Lifecycle Management

All filters are reactive and bind directly to React components:
- Modifying a filter automatically resets the active page to `1` and triggers a fetch.
- Skeletons are rendered during fetches to preserve layout stability.
- A "Clear all" action resets all filter state variables to defaults in a single batch.
