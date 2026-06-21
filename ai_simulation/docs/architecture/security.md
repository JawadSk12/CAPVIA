# Security Architecture

## Authentication
- JWT tokens with expiry (access: 60m, refresh: 7d)
- bcrypt password hashing
- Token rotation on refresh

## Anti-Cheat
- Browser tab visibility tracking
- Copy/paste monitoring
- Right-click disabled during test
- AI-generated content detection
- Plagiarism comparison across submissions

## Data Protection
- HTTPS/TLS in production
- Secrets managed via environment variables or Kubernetes Secrets
- Database connections over encrypted channels
