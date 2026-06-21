# CAPVIA — Production Launch Guide

> **Audience:** Founder + DevOps — the final checklist before opening CAPVIA to users.

---

## Pre-Launch Checklist

Complete every item. Do not skip.

### Infrastructure

- [ ] Neon database migrations run (`alembic current` shows `head`)
- [ ] All 17 tables exist in production database
- [ ] Upstash Redis responding (`PING → PONG`)
- [ ] Supabase buckets created: `resumes`, `interview-videos`
- [ ] Resend domain verified (DNS SPF/DKIM/DMARC records active)
- [ ] All Railway services deployed and running
- [ ] Vercel frontend deployed
- [ ] Custom domains configured and SSL certificates active
- [ ] Sentry projects connected

### Security

- [ ] `SECRET_KEY` is at least 32 random bytes (not the default `supersecretkey_change_in_production`)
- [ ] CORS `allow_origins` restricted to production domains only
- [ ] Webhook signing secret changed from default (`whsec_prod_default_secret_key_change_me`)
- [ ] All `.env` files excluded from git (verify with `git ls-files capvia_platform/.env`)
- [ ] Database passwords are strong (16+ chars, mixed case, symbols)
- [ ] Supabase `service_role` key not exposed in frontend bundles

### Configuration

- [ ] `ENVIRONMENT=production` on all services
- [ ] `NEXT_PUBLIC_API_URL` points to production API (`https://api.capvia.io`)
- [ ] Interview engine URL is reachable from Gateway service
- [ ] ATS engine URL is reachable from Gateway service

---

## Smoke Testing

Execute these tests immediately after deployment.

### Test 1: Health Endpoints

```bash
#!/bin/bash
set -e

BASE="https://api.capvia.io"

echo "Testing Gateway health..."
curl -sf "$BASE/api/health" | grep -q '"status"' && echo "✅ Gateway OK"

echo "Testing ATS health..."
curl -sf "https://ats.capvia.io/health" | grep -q '"status"' && echo "✅ ATS OK"

echo "Testing Interview eval health..."
curl -sf "https://interview-eval.capvia.io/health" | grep -q '"status"' && echo "✅ Interview Eval OK"

echo "Testing Frontend..."
curl -sf -o /dev/null -w "%{http_code}" "https://capvia.io" | grep -q "200" && echo "✅ Frontend OK"
```

### Test 2: Auth Flow

```bash
BASE="https://api.capvia.io/api/v1"

# Register
REGISTER=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoketest@capvia.io","password":"SmokeTest2024!","full_name":"Smoke Test"}')
echo "Register: $REGISTER"
TOKEN=$(echo $REGISTER | python3 -c "import sys,json; print(json.load(sys.stdin).get('simulated_token',''))")

# Verify email (dev/staging only — check logs for token)
VERIFY=$(curl -s -X POST "$BASE/auth/verify-email" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}")
echo "Verify: $VERIFY"

# Login
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoketest@capvia.io","password":"SmokeTest2024!"}')
echo "Login: $LOGIN"
ACCESS=$(echo $LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

# Protected route
curl -s -H "Authorization: Bearer $ACCESS" "$BASE/internships" | python3 -m json.tool
```

Expected: All calls return `2xx` with valid JSON.

### Test 3: Webhook Signature

```bash
# Trigger a test webhook for an existing application
APPLICATION_ID="<valid_application_uuid>"

curl -s -X POST \
  "https://api.capvia.io/api/v1/test/trigger-webhook?application_id=$APPLICATION_ID&event=ATS_PROCESSED" \
  | python3 -m json.tool

# Expected: {"success": true, "event": "ATS_PROCESSED", ...}
```

---

## End-to-End Testing

Run the full pipeline with a test candidate.

### E2E Pipeline Steps

```bash
# 1. Create HR user (admin action)
ADMIN_TOKEN="<admin_access_token>"
BASE="https://api.capvia.io/api/v1"

# 2. Create company
COMPANY=$(curl -s -X POST "$BASE/companies" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"E2E Test Company","industry":"Technology"}')
COMPANY_ID=$(echo $COMPANY | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "Company: $COMPANY_ID"

# 3. Create internship
INTERNSHIP=$(curl -s -X POST "$BASE/internships" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"company_id\": \"$COMPANY_ID\",
    \"title\": \"E2E Test Internship\",
    \"required_skills\": [\"Python\",\"FastAPI\"],
    \"technologies\": [\"Python\"],
    \"experience_level\": \"ENTRY\",
    \"work_mode\": \"REMOTE\",
    \"openings\": 10
  }")
INTERNSHIP_ID=$(echo $INTERNSHIP | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "Internship: $INTERNSHIP_ID"

# 4. Publish internship
curl -s -X POST "$BASE/internships/$INTERNSHIP_ID/publish" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 5. Candidate applies
CANDIDATE_TOKEN="<candidate_access_token>"
APPLICATION=$(curl -s -X POST "$BASE/applications" \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"internship_id\": \"$INTERNSHIP_ID\", \"cover_letter\": \"E2E test application\"}")
APP_ID=$(echo $APPLICATION | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "Application: $APP_ID"

# 6. Trigger evaluation pipeline
curl -s -X POST "https://api.capvia.io/api/v1/test/trigger-webhook?application_id=$APP_ID&event=ATS_PROCESSED"
curl -s -X POST "https://api.capvia.io/api/v1/test/trigger-webhook?application_id=$APP_ID&event=SIMULATION_SUBMITTED"
curl -s -X POST "https://api.capvia.io/api/v1/test/trigger-webhook?application_id=$APP_ID&event=INTERVIEW_EVALUATED"

# 7. Verify ranking was computed
sleep 3
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$BASE/rankings/$APP_ID" | python3 -m json.tool
```

Expected final state: Application has `final_score`, `recommendation_tier`, `internship_rank` values.

---

## Security Validation

### 1. JWT Expiry Enforcement

```bash
# Obtain a token, wait 31 minutes, then use it
curl -s -H "Authorization: Bearer <expired_token>" \
  "https://api.capvia.io/api/v1/companies"
# Expected: 401 Unauthorized
```

### 2. Role Enforcement

```bash
CANDIDATE_TOKEN="<candidate_access_token>"

# Attempt HR action with candidate token
curl -s -X POST \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  "https://api.capvia.io/api/v1/applications/<app_id>/shortlist"
# Expected: 403 Forbidden
```

### 3. Webhook Signature Rejection

```bash
# Send webhook with invalid signature
curl -s -X POST https://api.capvia.io/api/v1/gateway/webhooks \
  -H "Content-Type: application/json" \
  -H "X-CAPVIA-Signature: t=000000,v1=invalidsignature" \
  -d '{"event":"ATS_PROCESSED","data":{"application_id":"test"}}'
# Expected: 401 Unauthorized
```

### 4. SQL Injection Resistance

```bash
curl -s "https://api.capvia.io/api/v1/internships?search='; DROP TABLE users;--"
# Expected: 422 or 200 with empty results — NOT a 500 error
```

### 5. Rate Limiting

```bash
# Send 10 requests rapidly to the login endpoint
for i in {1..10}; do
  curl -s -X POST https://api.capvia.io/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"notexist@test.com","password":"wrong"}' &
done
# Expected: Mix of 401 and 429 Too Many Requests
```

---

## Performance Validation

### API Response Times

```bash
# Benchmark the health endpoint
ab -n 100 -c 10 https://api.capvia.io/api/health

# Expected:
# Requests per second: >50 req/sec
# Mean time per request: <200ms
# Failed requests: 0
```

### Frontend Core Web Vitals

1. Open Chrome DevTools → **Lighthouse** tab
2. Run audit on `https://capvia.io`
3. Target scores:
   - Performance: >80
   - Accessibility: >90
   - Best Practices: >90
   - SEO: >90

---

## Load Testing

### Basic Load Test with `wrk`

```bash
# Install wrk
brew install wrk

# 60-second test: 10 threads, 100 connections
wrk -t10 -c100 -d60s https://api.capvia.io/api/health

# Expected output:
# Requests/sec: >200
# Latency avg: <100ms
# Errors: 0
```

### Auth Load Test

```lua
-- auth_load.lua
wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.body = '{"email":"loadtest@capvia.io","password":"wrong"}'

function response(status, headers, body)
  if status ~= 401 then
    print("Unexpected status: " .. status)
  end
end
```

```bash
wrk -t5 -c50 -d30s -s auth_load.lua \
  https://api.capvia.io/api/v1/auth/login
```

---

## Monitoring Validation

### Sentry Error Capture

```bash
# Trigger a 500 error (intentionally)
curl -X POST https://api.capvia.io/api/v1/integrity/<invalid_uuid>/calculate
# Check Sentry dashboard for captured event within 30 seconds
```

### Upstash Redis Metrics

1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your database
3. Verify **Commands/sec** > 0 during load test
4. Monitor **Memory usage** < 80% of limit

---

## Go-Live Checklist

- [ ] All smoke tests pass
- [ ] E2E pipeline produces ranked candidate
- [ ] JWT role enforcement verified
- [ ] Webhook signature rejection verified
- [ ] Response times < 500ms for all critical endpoints
- [ ] Lighthouse score > 80 on frontend
- [ ] Sentry capturing errors
- [ ] DNS propagated (verify at: https://dnschecker.org)
- [ ] SSL certificates valid (verify at: https://ssllabs.com/ssltest/)
- [ ] Founder manual read and demo rehearsed
- [ ] Support email configured and tested

---

## Post-Launch Checklist (First 24 Hours)

- [ ] Monitor Sentry for new errors every 2 hours
- [ ] Check Railway service memory/CPU usage
- [ ] Verify database query performance (Neon metrics)
- [ ] Check Redis hit rate (Upstash metrics)
- [ ] Confirm first real user can register and verify email
- [ ] Confirm HR user can create internship and see applications

---

## Rollback Triggers

Roll back immediately if any of these occur:

| Symptom | Action |
|---------|--------|
| Gateway returning 5xx for >5% of requests | Rollback Railway deployment |
| Database migrations fail | Rollback Alembic: `alembic downgrade -1` |
| Frontend showing blank page or JS errors | Rollback Vercel deployment |
| Redis connection failures | Check Upstash status page; update `REDIS_URL` |
| JWT tokens rejected en masse | Verify `SECRET_KEY` matches across all replicas |

---

## Disaster Recovery

### Database Recovery

```bash
# Neon automatically creates point-in-time backups
# To restore: Neon dashboard → Backups → Restore to timestamp

# Manual backup
pg_dump "postgresql://..." > backup_$(date +%Y%m%d).sql
```

### Full Service Recovery

```bash
# 1. Restore database from backup
psql "postgresql://..." < backup_YYYYMMDD.sql

# 2. Roll migrations to correct state
python -m alembic stamp <last_known_good_revision>

# 3. Redeploy all services
railway up --service capvia-gateway
railway up --service capvia-ats

# 4. Verify health
curl https://api.capvia.io/api/health
```
