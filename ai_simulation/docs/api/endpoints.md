# API Endpoints Reference

## Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register a new user |
| POST | /api/v1/auth/login | Login and get JWT tokens |
| POST | /api/v1/auth/logout | Invalidate session |
| GET | /api/v1/auth/me | Get current user info |
| POST | /api/v1/auth/refresh | Refresh access token |

## Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/sessions/ | Create a new test session |
| GET | /api/v1/sessions/{id} | Get session details |
| PATCH | /api/v1/sessions/{id} | Update session state |
| POST | /api/v1/sessions/{id}/complete | Mark session complete |

## Questions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/questions/{test_id} | Get all questions for a test |
| POST | /api/v1/questions/ | Create a question (admin) |

## Submissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/sessions/{id}/submissions/ | Submit an answer |
| POST | /api/v1/sessions/{id}/submissions/batch | Submit all answers |
| PATCH | /api/v1/sessions/{id}/submissions/autosave | Auto-save draft |

## Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/admin/stats | Platform statistics |
| GET | /api/v1/admin/sessions/live | Active live sessions |
| GET | /api/v1/admin/candidates | List all candidates |
