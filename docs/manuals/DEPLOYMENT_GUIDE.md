# Deployment Guide

This guide details the infrastructure, environment variables, and Docker patterns required to run CAPVIA in a production environment.

---

## 1. Production Architecture Setup

In production, CAPVIA uses:
- **Database**: Managed Serverless PostgreSQL (e.g. Neon, AWS Aurora Serverless) for scalability.
- **Cache**: Managed Redis cluster (e.g., Upstash, ElastiCache) with eviction policies.
- **File Storage**: Persistent storage (AWS S3 or Google Cloud Storage) for PDF dossiers.
- **Compute**: Containerized microservices (AWS ECS, Google Cloud Run, or Docker Compose).

---

## 2. Production Environment Configurations

Create a `.env.production` file on your host compute machine:
```ini
ENV=production
DEBUG=False
PORT=8000

# Security (Set high entropy strings)
JWT_SECRET=super_secret_production_jwt_signing_key_at_least_64_characters_long
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Neon Serverless PostgreSQL Connection String (requires SSL)
DATABASE_URL=postgresql+asyncpg://user:password@ep-neon-host.us-east-2.aws.neon.tech/capvia_prod_db?ssl=require

# Managed Redis URL (requires SSL if configured)
REDIS_URL=rediss://default:password@redis-host.upstash.io:30000/0

# Production API Endpoints for Subsystems
ATS_API_URL=https://ats.capvia.com/api/v1
SIMULATION_API_URL=https://assess.capvia.com/api/v1
INTERVIEW_API_URL=https://interview.capvia.com/api/v1

# HMAC Signing Keys for Webhook Verifications
ATS_WEBHOOK_SECRET=ats_prod_webhook_hmac_secret_token_at_least_32_chars
SIMULATION_WEBHOOK_SECRET=sim_prod_webhook_hmac_secret_token_at_least_32_chars
INTERVIEW_WEBHOOK_SECRET=interview_prod_webhook_hmac_secret_token_at_least_32_chars
```

---

## 3. Containerization via Docker Compose

Deploy the backend and frontend services using the provided production Docker Compose files:

### Build & Start Containers
```bash
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
```
This launches:
1. **`capvia-backend`**: FastAPI application container.
2. **`capvia-frontend`**: Next.js production server.
3. **`redis`**: Local fallback cache container if managed Redis is not used.

### Run Database Migrations on Startup
Apply migrations inside the running backend container:
```bash
docker compose exec capvia-backend alembic upgrade head
```

---

## 4. Reverse Proxy & SSL Configuration (Nginx)

Place CAPVIA behind Nginx to handle SSL termination. Example configuration file (`/etc/nginx/sites-available/capvia`):

```nginx
server {
    listen 80;
    server_name recruit.capvia.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name recruit.capvia.com;

    ssl_certificate /etc/letsencrypt/live/recruit.capvia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/recruit.capvia.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000; # Route to Next.js
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8000; # Route to FastAPI backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Reload Nginx to apply:
```bash
sudo systemctl reload nginx
```

---

## 5. Monitoring, Logging, and Rollbacks

### Health checks
The load balancer should query the health endpoint:
```http
GET https://recruit.capvia.com/api/v1/health
```

### Rollback Strategy
If a deployment fails:
1. Revert container image tags to the previous stable release version:
   ```bash
   docker compose down
   # Modify image tag in docker-compose.yml
   docker compose up -d
   ```
2. Rollback the database migration state if necessary (exercise caution to prevent data loss):
   ```bash
   docker compose exec capvia-backend alembic downgrade -1
   ```
3. Purge the Redis cache keys to prevent stale state mapping references:
   ```bash
   redis-cli -u $REDIS_URL FLUSHDB
   ```
