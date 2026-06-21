# Troubleshooting Guide

This guide compiles common runtime exceptions, network disruptions, integration errors, and debugging workflows.

---

## 1. Database Connectivity Issues

### Problem: `sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) connection timeout expired`
- **Root Cause**: The FastAPI backend cannot reach the PostgreSQL database server (local port block or Neon server sleep).
- **Diagnosis**:
  ```bash
  # Check if PostgreSQL service is running locally
  brew services list | grep postgresql
  
  # Or test connectivity to database port
  nc -zv localhost 5432
  ```
- **Fix**:
  - **Local Database**: Restart the service:
    ```bash
    brew services restart postgresql@15
    ```
  - **Neon/Serverless**: Verify if the serverless compute has scaled down or reached its active connection limit. Check connection parameters and ensure `?ssl=require` is appended to the connection string.

### Problem: `sqlalchemy.exc.MissingGreenlet: Parent greenlet, list, or context is not active`
- **Root Cause**: Accessing a SQLAlchemy relationship attributes synchronously within an asynchronous event session context.
- **Fix**: Use `selectinload` or `joinedload` on the query to eagerly retrieve the related entity before referencing properties.
  *Example Fix in API router:*
  ```python
  # Instead of:
  application = (await session.execute(select(Application).where(Application.id == app_id))).scalar_one()
  # Do:
  application = (await session.execute(
      select(Application)
      .options(selectinload(Application.candidate))
      .where(Application.id == app_id)
  )).scalar_one()
  ```

---

## 2. Redis & Cache Faults

### Problem: `redis.exceptions.ConnectionError: Error 61 connecting to localhost:6379. Connection refused.`
- **Root Cause**: Redis cache is offline or connection string is misconfigured.
- **Fix**: Start the local Redis daemon:
  ```bash
  brew services restart redis
  ```

### Problem: `Redis OOM command not allowed when used memory > 'maxmemory'`
- **Root Cause**: Redis cache memory is full, and keys are not being evicted.
- **Fix**: Connect via Redis CLI and adjust the eviction policy to remove volatile refresh keys:
  ```redis
  127.0.0.1:6379> CONFIG SET maxmemory-policy allkeys-lru
  ```

---

## 3. Webhook Authentication Failures

### Problem: `401 Unauthorized` or `Invalid Webhook Signature`
- **Root Cause**: The signature hash sent by the subsystem in the `X-CAPVIA-Signature` header does not match the computed HMAC signature.
- **Diagnosis**:
  1. Check `.env` configuration. Ensure the secret token used by the sender microservice matches the local secret parameter (`ATS_WEBHOOK_SECRET`, `SIMULATION_WEBHOOK_SECRET`, `INTERVIEW_WEBHOOK_SECRET`).
  2. Verify signature format (hex-encoded vs. base64-encoded). CAPVIA expects hex encoding.
- **Fix**: Update secret variables in `.env` to match, then reload:
  ```bash
  kill -HUP $(pgrep uvicorn)
  ```

---

## 4. Integration & Downstream Engine Errors

### Problem: `INTEVAL_LOCAL_BASELINE` state triggered
- **Root Cause**: The remote IntelliRecruit interview microservice (port `8003`) was unavailable during candidate video submission, triggering local baseline evaluation.
- **Diagnosis**: Check the backend application log. If `Interview connector request failed, falling back to local proctoring calibration` appears, the client triggered fallback logic.
- **Fix**:
  1. Verify the microservice is running:
     ```bash
     curl -i http://localhost:8003/api/v1/health
     ```
  2. Restart the microservice. Once online, recruiters can trigger an evaluation recalculation via the Recruiter Dashboard to re-sync stats from the remote engine.

---

## 5. Report Dossier Generation Issues

### Problem: `reportlab.platypus.doctemplate.LayoutError: Flowable (...) too large on page`
- **Root Cause**: The AI evaluation text (strengths, weaknesses, summaries) is too long for the ReportLab layout parameters, overflowing the page margins.
- **Fix**:
  1. Wrap paragraphs inside table cells in a `Paragraph` flowable with explicit column width.
  2. Adjust spacer heights (`Spacer(1, 10)` rather than `Spacer(1, 20)`).
  3. Ensure `keepWithNext=True` properties on headers are only applied when necessary.
