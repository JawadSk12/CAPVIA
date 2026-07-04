# Search Architecture Documentation

This document explains the search query model and frontend interaction design implemented in the Internship Marketplace.

## Interaction Workflow

```
[Search Input Fields] ──► [Component State] ──► [Search Action / Category Click]
                                                          │
                                                          ▼
[API Telemetry] ◄── [Render UI Grid] ◄── [apiClient Endpoint]
```

1. **User Input Binds**: The user fills the primary search query field (Role/Skills/Technology/Company) or the location field.
2. **Category Quick-Select**: Clicking any Popular Category pill (e.g. "AI", "Frontend") immediately synchronizes the search query field to the category name, clears active pagination, and triggers the query.
3. **Trigger Event**: Pressing Enter, clicking the "Search Jobs" button, or selecting a category triggers the form submission callback.
4. **Backend Fetch**: The component invokes `internshipApi.list` passing the search and location inputs.

## Search Request Schema Mapping

The search parameters map directly to the backend FastAPI endpoints:

| UI Input | API Parameter | Backend Query Execution |
| :--- | :--- | :--- |
| **Search Input** | `search` | Performed as full-text search on `title`, `description`, and `location` fields in SQL databases. |
| **Location Input** | `location` | Performed as a case-insensitive partial match on the `location` database field. |

## Client-Side Refinements

To maintain performance, search queries are bounded:
- Submissions are debounced through the standard HTML Form Submission wrapper.
- Pagination is reset to page 1 upon new search submissions to ensure the candidate reviews fresh result sets.
