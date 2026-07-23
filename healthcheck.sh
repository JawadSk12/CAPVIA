#!/usr/bin/env bash

# ANSI Color Codes
GREEN='\033[92m'
RED='\033[91m'
YELLOW='\033[93m'
BLUE='\033[94m'
RESET='\033[0m'

echo -e "${BLUE}====================================================${RESET}"
echo -e "${BLUE}        CAPVIA ECOSYSTEM HEALTHCHECK SYSTEM         ${RESET}"
echo -e "${BLUE}====================================================${RESET}"

# Initialize overall state
OVERALL_STATUS="Healthy"

check_http_service() {
    local url=$1
    local name=$2
    local http_code
    
    # Fetch HTTP status code with 2 seconds timeout
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$url" || true)
    
    # 200, 301, 302, 307, 308 are healthy. 401 and 404 mean endpoint is up and listening.
    if [[ "$http_code" =~ ^(200|301|302|307|308|401|404)$ ]]; then
        printf "%-35s | %-12s | %-12b\n" "$name" "$http_code" "${GREEN}Healthy${RESET}"
    else
        printf "%-35s | %-12s | %-12b\n" "$name" "$http_code" "${RED}Failed${RESET}"
        OVERALL_STATUS="Failed"
    fi
}

check_tcp_service() {
    local host=$1
    local port=$2
    local name=$3
    
    if nc -zv "$host" "$port" &>/dev/null; then
        printf "%-35s | %-12s | %-12b\n" "$name" "$port" "${GREEN}Healthy${RESET}"
    else
        printf "%-35s | %-12s | %-12b\n" "$name" "$port" "${RED}Failed${RESET}"
        OVERALL_STATUS="Failed"
    fi
}

check_process_service() {
    local pattern=$1
    local name=$2
    
    if pgrep -f "$pattern" &>/dev/null; then
        printf "%-35s | %-12s | %-12b\n" "$name" "Process Run" "${GREEN}Healthy${RESET}"
    else
        printf "%-35s | %-12s | %-12b\n" "$name" "Not Found" "${YELLOW}Warning${RESET}"
        if [ "$OVERALL_STATUS" = "Healthy" ]; then
            OVERALL_STATUS="Warning"
        fi
    fi
}

echo -e "\n${BLUE}--- Infrastructure & Databases ---${RESET}"
printf "%-35s | %-12s | %-12b\n" "Resource" "Port/Details" "Status"
printf "%-35s | %-12s | %-12b\n" "-----------------------------------" "------------" "------------"

# Neon check via Python helper
if "$HOME/capvia_gateway_venv/bin/python" -c "
import asyncio, urllib.request
from sqlalchemy.ext.asyncio import create_async_engine
async def test():
    import os
    from pathlib import Path
    # Load env
    def load_env(p):
        env={}
        if not os.path.exists(p): return env
        with open(p) as f:
            for l in f:
                if '=' in l and not l.startswith('#'):
                    k, v = l.strip().split('=', 1)
                    env[k.strip()] = v.strip().strip('\'\"')
        return env
    e = load_env(Path('/Volumes/KINGSTON/CAPVIA/capvia_platform/.env'))
    url = e.get('DATABASE_URL')
    if not url: return False
    url = url.replace('postgresql://', 'postgresql+asyncpg://')
    engine = create_async_engine(url)
    async with engine.connect() as c:
        from sqlalchemy import text
        await c.execute(text('SELECT 1'))
    await engine.dispose()
    return True
import sys
sys.exit(0 if asyncio.run(test()) else 1)
" &>/dev/null; then
    printf "%-35s | %-12s | %-12b\n" "Neon Postgres DB" "Cloud" "${GREEN}Healthy${RESET}"
else
    printf "%-35s | %-12s | %-12b\n" "Neon Postgres DB" "Cloud" "${RED}Failed${RESET}"
    OVERALL_STATUS="Failed"
fi

# Local Postgres
check_tcp_service "127.0.0.1" 5432 "Local PostgreSQL"

# Local Redis
check_tcp_service "127.0.0.1" 6379 "Local Redis"

# Local MongoDB
check_tcp_service "127.0.0.1" 27017 "Local MongoDB"

# Upstash Redis REST
if "$HOME/capvia_gateway_venv/bin/python" -c "
import urllib.request, json, os, sys
def load_env():
    env={}
    paths=['/Volumes/KINGSTON/CAPVIA/capvia_platform/frontend/.env.local', '/Volumes/KINGSTON/CAPVIA/capvia_platform/.env', '/Volumes/KINGSTON/CAPVIA/.env']
    for p in paths:
        if os.path.exists(p):
            with open(p) as f:
                for l in f:
                    if '=' in l and not l.startswith('#'):
                        k,v=l.strip().split('=',1)
                        if k.strip() not in env:
                            env[k.strip()]=v.strip().strip('\'\"')
    return env
e=load_env()
url=e.get('UPSTASH_REDIS_REST_URL')
tok=e.get('UPSTASH_REDIS_REST_TOKEN')
if not url or not tok: sys.exit(1)
req=urllib.request.Request(f'{url}/ping', headers={'Authorization':f'Bearer {tok}'})
with urllib.request.urlopen(req, timeout=2.0) as r:
    res=json.loads(r.read().decode('utf-8'))
    sys.exit(0 if res.get('result') == 'PONG' else 1)
" &>/dev/null; then
    printf "%-35s | %-12s | %-12b\n" "Upstash Redis REST" "Cloud REST" "${GREEN}Healthy${RESET}"
else
    printf "%-35s | %-12s | %-12b\n" "Upstash Redis REST" "Local Fallback" "${YELLOW}Warning${RESET}"
    if [ "$OVERALL_STATUS" = "Healthy" ]; then OVERALL_STATUS="Warning"; fi
fi

# Supabase REST endpoint
if "$HOME/capvia_gateway_venv/bin/python" -c "
import urllib.request, os, sys
def load_env():
    env={}
    paths=['/Volumes/KINGSTON/CAPVIA/capvia_platform/frontend/.env.local', '/Volumes/KINGSTON/CAPVIA/capvia_platform/.env', '/Volumes/KINGSTON/CAPVIA/.env']
    for p in paths:
        if os.path.exists(p):
            with open(p) as f:
                for l in f:
                    if '=' in l and not l.startswith('#'):
                        k,v=l.strip().split('=',1)
                        if k.strip() not in env:
                            env[k.strip()]=v.strip().strip('\'\"')
    return env
e=load_env()
url=e.get('NEXT_PUBLIC_SUPABASE_URL') or e.get('SUPABASE_URL')
key=e.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') or e.get('SUPABASE_PUBLISHABLE_KEY')
if not url or not key: sys.exit(1)
req=urllib.request.Request(f'{url}/rest/v1/', headers={'apikey':key})
try:
    with urllib.request.urlopen(req, timeout=2.0) as r:
        sys.exit(0 if r.getcode() in (200, 201, 204) else 1)
except Exception as e:
    # 401 indicates Supabase responded and is active
    if getattr(e, 'code', None) in (200, 401, 406): sys.exit(0)
    sys.exit(1)
" &>/dev/null; then
    printf "%-35s | %-12s | %-12b\n" "Supabase API" "Cloud REST" "${GREEN}Healthy${RESET}"
else
    printf "%-35s | %-12s | %-12b\n" "Supabase API" "Local Fallback" "${YELLOW}Warning${RESET}"
    if [ "$OVERALL_STATUS" = "Healthy" ]; then OVERALL_STATUS="Warning"; fi
fi

# Resend Check
if "$HOME/capvia_gateway_venv/bin/python" -c "
import os, sys
p1='/Volumes/KINGSTON/CAPVIA/capvia_platform/.env'
p2='/Volumes/KINGSTON/CAPVIA/capvia_platform/frontend/.env.local'
def check(p):
    if not os.path.exists(p): return False
    with open(p) as f:
        for l in f:
            if 'RESEND_API_KEY' in l and '=' in l and not l.strip().startswith('#'):
                v = l.split('=', 1)[1].strip().strip('\'\"')
                if v.startswith('re_'): return True
    return False
if check(p1) or check(p2): sys.exit(0)
sys.exit(1)
" &>/dev/null; then
    printf "%-35s | %-12s | %-12b\n" "Resend Email Service" "Configured" "${GREEN}Healthy${RESET}"
else
    printf "%-35s | %-12s | %-12b\n" "Resend Email Service" "Console Mock" "${YELLOW}Warning${RESET}"
fi


echo -e "\n${BLUE}--- Application Services & Backends ---${RESET}"
printf "%-35s | %-12s | %-12b\n" "Service Name" "Port/Response" "Status"
printf "%-35s | %-12s | %-12b\n" "-----------------------------------" "------------" "------------"

# 1. CAPVIA Core Gateway Backend (Port 8000)
check_http_service "http://127.0.0.1:8000/api/health" "CAPVIA Core Backend"

# 2. ATS Backend (Port 8001)
check_http_service "http://127.0.0.1:8001/api/v1/health/ping" "ATS Backend"

# 3. Simulation Backend (Port 8002)
check_http_service "http://127.0.0.1:8002/api/v1/docs" "Simulation Backend"

# 4. Interview Evaluation Server (Port 8765)
check_http_service "http://127.0.0.1:8765/health" "Interview Evaluation Server"


echo -e "\n${BLUE}--- Application Frontends ---${RESET}"
printf "%-35s | %-12s | %-12b\n" "Frontend Name" "Port/Response" "Status"
printf "%-35s | %-12s | %-12b\n" "-----------------------------------" "------------" "------------"

# 5. CAPVIA Unified Portal UI (Port 3000)
check_http_service "http://127.0.0.1:3000" "CAPVIA Unified UI"


echo -e "\n${BLUE}--- Background Workers ---${RESET}"
printf "%-35s | %-12s | %-12b\n" "Worker Name" "Type" "Status"
printf "%-35s | %-12s | %-12b\n" "-----------------------------------" "------------" "------------"

# 9. ATS Celery Worker
check_process_service "celery.*workers.celery_app" "ATS Celery Worker"

# 10. Simulation Celery Worker
check_process_service "celery.*app.tasks.celery_app" "Simulation Celery Worker"


echo -e "\n${BLUE}=============================================${RESET}"
if [ "$OVERALL_STATUS" = "Healthy" ]; then
    echo -e "Ecosystem Status: ${GREEN}Healthy${RESET}"
    EXIT_CODE=0
elif [ "$OVERALL_STATUS" = "Warning" ]; then
    echo -e "Ecosystem Status: ${YELLOW}Warning (Some optional components missing)${RESET}"
    EXIT_CODE=0
else
    echo -e "Ecosystem Status: ${RED}Failed (Critical components offline)${RESET}"
    EXIT_CODE=1
fi
echo -e "${BLUE}=============================================${RESET}\n"

exit $EXIT_CODE
