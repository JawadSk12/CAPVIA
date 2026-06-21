# CAPVIA — Operations Runbook

> **Audience:** On-call engineer, DevOps, or founder managing CAPVIA in production.

---

## Emergency Contacts

| Role | Responsibility |
|------|---------------|
| Founder | Business decisions, stakeholder communication |
| Backend Lead | Gateway, engines, database issues |
| DevOps | Railway, Vercel, infrastructure |
| On-call | Primary incident responder (rotates weekly) |

---

## Daily Operations

### Morning Health Check (9:00 AM)

```bash
#!/bin/bash
echo "=== CAPVIA Daily Health Check $(date) ==="

# 1. Gateway health
echo "Gateway..."
curl -sf https://api.capvia.io/api/health && echo "✅" || echo "❌ GATEWAY DOWN"

# 2. ATS health
echo "ATS Engine..."
curl -sf https://ats.capvia.io/health && echo "✅" || echo "❌ ATS DOWN"

# 3. Interview eval
echo "Interview Eval..."
curl -sf https://interview-eval.capvia.io/health && echo "✅" || echo "❌ INTERVIEW EVAL DOWN"

# 4. Frontend
echo "Frontend..."
curl -sf -o /dev/null -w "%{http_code}" https://capvia.io | grep -q "200" && echo "✅" || echo "❌ FRONTEND DOWN"

# 5. Database
echo "Database..."
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
async def check():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as c:
        r = await c.execute(text('SELECT count(*) FROM users'))
        print(f'DB ✅ ({r.scalar()} users)')
asyncio.run(check())
"

# 6. Redis
echo "Redis..."
redis-cli --tls -u "$REDIS_URL" PING && echo "Redis ✅" || echo "Redis ❌"

echo "=== Check complete ==="
```

Schedule this with cron:
```bash
# crontab -e
0 9 * * 1-5 /path/to/daily_health_check.sh >> /var/log/capvia/health.log 2>&1
```

### Monitor Key Metrics Daily

| Metric | Location | Threshold |
|--------|----------|-----------|
| Error rate | Sentry → Issues | < 5 new issues/day |
| API response time | Railway metrics | < 500ms p95 |
| DB connections | Neon dashboard | < 80% of pool |
| Redis memory | Upstash console | < 80% of limit |
| Frontend errors | Sentry | 0 critical errors |
| Active applications | Database | Monitor growth |

---

## Weekly Operations

### Every Monday

```bash
# 1. Review Sentry error trends (week-over-week)
# Dashboard: sentry.io → Issues → This Week

# 2. Check database size growth
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
async def check():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as c:
        r = await c.execute(text(\"\"\"
            SELECT 
                table_name,
                pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size,
                (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as cols
            FROM information_schema.tables t
            WHERE table_schema='public'
            ORDER BY pg_total_relation_size(table_name::regclass) DESC
            LIMIT 10
        \"\"\"))
        for row in r:
            print(row)
asyncio.run(check())
"

# 3. Review Redis key usage
redis-cli --tls -u "$REDIS_URL" INFO keyspace

# 4. Check for pending migrations
cd capvia_platform && python -m alembic current
```

---

## Monthly Operations

```bash
# 1. Rotate SECRET_KEY (requires re-login for all users)
NEW_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
echo "New key: $NEW_KEY"
railway variables set --service capvia-gateway SECRET_KEY="$NEW_KEY"

# 2. Rotate webhook signing secret
railway variables set --service capvia-gateway SIGNING_SECRET="new_secret_here"

# 3. Database backup
pg_dump "postgresql://neondb_owner:<pw>@<host>/neondb" \
  --file="backup_$(date +%Y%m).sql" \
  --format=custom

# 4. Review and archive old activity logs (> 90 days)
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text, delete
from capvia_platform.models.models import ActivityLog
from datetime import datetime, timedelta
import os

async def archive():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    cutoff = datetime.utcnow() - timedelta(days=90)
    async with AsyncSession(engine) as s:
        r = await s.execute(
            delete(ActivityLog).where(ActivityLog.created_at < cutoff)
        )
        await s.commit()
        print(f'Archived {r.rowcount} old activity logs')
asyncio.run(archive())
"

# 5. Dependency security audit
cd capvia_platform && pip audit
cd frontend && npm audit
```

---

## Monitoring

### Sentry Alert Rules

Configure in Sentry → Alerts:

| Alert | Trigger | Action |
|-------|---------|--------|
| High error rate | >10 errors/hour | Email + Slack |
| New fatal error | Any new FATAL event | Immediate page |
| Performance regression | p95 > 2 seconds | Email |

### Upstash Redis Monitoring

Key patterns to monitor:
- `email_verify:*` — Count: should be low (spikes = registration volume)
- `reset_pass:*` — Count: should be very low (spikes = potential password attack)
- `integrity_calibration_weights` — Should exist (if missing, defaults used)

```bash
# Count active email verification tokens
redis-cli --tls -u "$REDIS_URL" KEYS "email_verify:*" | wc -l

# Count active password reset tokens
redis-cli --tls -u "$REDIS_URL" KEYS "reset_pass:*" | wc -l
```

---

## Alert Handling

### P0: Service Completely Down

```bash
# Symptom: Gateway returning 5xx or unreachable

# Step 1: Check Railway logs
railway logs --service capvia-gateway --tail 100

# Step 2: Check for deployment issue
railway deployments --service capvia-gateway

# Step 3: Rollback if recent deployment caused issue
railway rollback --service capvia-gateway

# Step 4: Check database
curl -s postgres://<host>/neondb?ssl=require  # Neon dashboard for status

# Step 5: Restart service
railway service restart --service capvia-gateway

# Step 6: Notify stakeholders
# "CAPVIA API is experiencing issues. ETA for resolution: XX minutes."
```

### P1: High Error Rate (> 5% 5xx)

```bash
# Step 1: Check Sentry for error details
# Most errors are database connectivity or misconfiguration

# Step 2: Check specific error in Railway logs
railway logs --service capvia-gateway | grep "ERROR"

# Step 3: Check database health
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
async def check():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as c:
        r = await c.execute(text('SELECT 1'))
        print('DB OK:', r.scalar())
asyncio.run(check())
"

# Step 4: Check Redis
redis-cli --tls -u "$REDIS_URL" PING

# Step 5: If DB issue — check Neon status page at status.neon.tech
```

### P2: Slow Response Times (> 500ms)

```bash
# Identify slow queries
# Add to your .env temporarily:
# SQLALCHEMY_ECHO=True

# Check for N+1 query patterns in logs

# Check Neon query statistics
# Neon dashboard → Monitoring → Query insights

# Check Redis latency
redis-cli --tls -u "$REDIS_URL" LATENCY HISTORY event
```

---

## Database Backups

### Automated Backup (Neon)

Neon automatically backs up every 24 hours with 7-day retention on the free plan, 30-day retention on Pro.

### Manual Backup

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="capvia_backup_${TIMESTAMP}.sql"

pg_dump \
  "postgresql://neondb_owner:<pw>@<host>/neondb" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"
```

Schedule:
```bash
# crontab -e
0 2 * * * /path/to/backup.sh >> /var/log/capvia/backup.log 2>&1
```

### Database Restore

```bash
# Restore from custom format dump
pg_restore \
  --dbname="postgresql://neondb_owner:<pw>@<host>/neondb" \
  --clean \
  --if-exists \
  capvia_backup_20240621_020000.sql

# Verify
python3 -c "
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
async def verify():
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.connect() as c:
        tables = await c.execute(text(\"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'\"))
        print(f'Tables restored: {tables.scalar()}')
asyncio.run(verify())
"
```

---

## Service Restart Procedures

### Restart CAPVIA Gateway

```bash
# Railway (production)
railway service restart --service capvia-gateway

# Local (development)
pkill -f "uvicorn capvia_platform"
uvicorn capvia_platform.main:app --port 8000 --reload &
```

### Restart ATS Engine

```bash
railway service restart --service capvia-ats
```

### Restart All Services

```bash
railway service restart --service capvia-gateway
railway service restart --service capvia-ats
railway service restart --service capvia-simulation
railway service restart --service capvia-interview-eval
```

---

## Redis Recovery

### Redis Connection Reset

```bash
# Test connectivity
redis-cli --tls -u "$REDIS_URL" PING

# If connection refused — check Upstash console for outage
# https://status.upstash.com

# Clear all expired keys (safe cleanup)
redis-cli --tls -u "$REDIS_URL" DEBUG SLEEP 0
```

### Clear Specific Redis Keys

```bash
# Clear email verification tokens (if stuck)
redis-cli --tls -u "$REDIS_URL" KEYS "email_verify:*" | xargs redis-cli --tls -u "$REDIS_URL" DEL

# Clear password reset tokens (if stuck)
redis-cli --tls -u "$REDIS_URL" KEYS "reset_pass:*" | xargs redis-cli --tls -u "$REDIS_URL" DEL

# Reset integrity calibration weights to defaults
redis-cli --tls -u "$REDIS_URL" DEL integrity_calibration_weights
```

---

## Webhook Recovery

If a webhook was missed or not processed:

```bash
APPLICATION_ID="<uuid_of_affected_application>"

# Re-trigger ATS webhook
curl -X POST \
  "https://api.capvia.io/api/v1/test/trigger-webhook?application_id=$APPLICATION_ID&event=ATS_PROCESSED"

# Re-trigger Simulation webhook  
curl -X POST \
  "https://api.capvia.io/api/v1/test/trigger-webhook?application_id=$APPLICATION_ID&event=SIMULATION_SUBMITTED"

# Re-trigger Interview webhook
curl -X POST \
  "https://api.capvia.io/api/v1/test/trigger-webhook?application_id=$APPLICATION_ID&event=INTERVIEW_EVALUATED"
```

---

## Scaling Procedures

### Scale CAPVIA Gateway (Railway)

```bash
# Increase worker count
railway variables set --service capvia-gateway \
  START_COMMAND="uvicorn capvia_platform.main:app --host 0.0.0.0 --port \$PORT --workers 4"

# Or scale to multiple replicas in Railway dashboard
# Service Settings → Replicas → Increase count
```

### Database Connection Scaling

When handling high load, switch to the pooled Neon endpoint if not already using it:

```
# Pooled (recommended for >10 concurrent requests)
postgresql+asyncpg://neondb_owner:<pw>@ep-xxxx-pooler.c-2.region.aws.neon.tech/neondb?ssl=require

# Direct (use for migrations only)
postgresql+asyncpg://neondb_owner:<pw>@ep-xxxx.c-2.region.aws.neon.tech/neondb?ssl=require
```

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0 | Complete service outage | Immediate (< 15 min) |
| P1 | Major feature broken (>5% error rate) | < 1 hour |
| P2 | Degraded performance | < 4 hours |
| P3 | Minor issue, workaround exists | < 24 hours |

### Incident Template

```
INCIDENT REPORT
===============
Time detected: 
Severity: P0/P1/P2/P3
Service affected: 
Impact: (# users affected, features broken)
Root cause: 
Timeline:
  HH:MM - Issue detected
  HH:MM - Investigation started
  HH:MM - Root cause identified
  HH:MM - Fix deployed
  HH:MM - Service restored
Actions taken: 
Prevention: (what to do to prevent recurrence)
```

### Post-Incident Review

After every P0/P1 incident:
1. Write incident report using template above
2. Schedule retrospective meeting within 48 hours
3. Create GitHub issue for each preventive action
4. Update runbook with lessons learned
