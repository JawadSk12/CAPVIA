# Operations Runbook

This runbook outlines daily maintenance schedules, monitoring indicators, log rotations, scaling processes, and emergency recovery plans.

---

## 1. Schedule of Operations

### Daily Maintenance Tasks
1. **Health Verification**: Query the health checks endpoint:
   ```bash
   curl -s -f http://localhost:8000/api/v1/health || echo "ALERT: CAPVIA backend offline"
   ```
2. **Review Failed Webhooks**: Query the `application_events` table for webhook failure statuses:
   ```sql
   SELECT id, application_id, event_metadata FROM application_events WHERE event_type LIKE '%_FAILED' AND created_at >= NOW() - INTERVAL '1 day';
   ```
3. **Storage Utilization**: Check disk space allocated to generated report PDFs:
   ```bash
   df -h /Volumes/KINGSTON/CAPVIA/storage
   ```

### Weekly Maintenance Tasks
1. **Log Rotation**: Compress and rotate log files in `/var/log/capvia/`:
   ```bash
   sudo logrotate -f /etc/logrotate.d/capvia
   ```
2. **Review Revoked Sessions**: Clear revoked and expired user sessions to maintain performance:
   ```sql
   DELETE FROM user_sessions WHERE is_revoked = TRUE OR expires_at < NOW() - INTERVAL '30 days';
   ```

### Monthly Maintenance Tasks
1. **Test Backup Restores**: Run a dummy recovery dry-run of database snapshots to verify backups.
2. **Dependency Updates**: Audit vulnerability bulletins for packages listed in `requirements.txt`:
   ```bash
   pip list --outdated
   ```

---

## 2. Infrastructure Scaling Manual

### Horizontal Scaling of API Containers
CAPVIA Core backend can be scaled horizontally. Run additional containers behind a Round-Robin load balancer (Nginx / AWS ALB).
To scale containers using Docker Compose:
```bash
docker compose up -d --scale capvia-backend=4
```
Ensure:
- Sticky sessions are not required since authentications are stored as stateless JWTs.
- `REDIS_URL` points to a shared cluster cache.

---

## 3. Incident Management & Recovery Runbooks

### Emergency Service Restart
If endpoints return 502 Bad Gateway or timeouts occur:
```bash
# 1. Gracefully stop all containers
docker compose down

# 2. Check for orphan processes
ps aux | grep uvicorn | awk '{print $2}' | xargs kill -9 2>/dev/null

# 3. Purge local Redis cache buffers
redis-cli FLUSHALL

# 4. Restart containers
docker compose up -d
```

### Webhook Event Recovery Flow
If external subsystems encountered downtime and missed callback delivery notifications:
1. Identify applications stalled in intermediate transition statuses (`ATS_PENDING`, `SIMULATION_IN_PROGRESS`, `INTERVIEW_IN_PROGRESS`).
2. Run the manual sync script:
   ```bash
   python3 scripts/resync_webhooks.py --app-id=<app_uuid>
   ```
   This script queries the remote microservices for current state metadata and triggers downstream engines locally to complete evaluations.
