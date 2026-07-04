#!/usr/bin/env bash

# ANSI Color Codes
GREEN='\033[92m'
RED='\033[91m'
YELLOW='\033[93m'
BLUE='\033[94m'
RESET='\033[0m'

echo -e "${BLUE}====================================================${RESET}"
echo -e "${BLUE}         CAPVIA ECOSYSTEM STARTUP SYSTEM            ${RESET}"
echo -e "${BLUE}====================================================${RESET}"

PID_FILE=".capvia_pids"
LOG_DIR="logs"

mkdir -p "$LOG_DIR"

# Configure Redis to handle bgsave issues on full disks gracefully
if command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}Configuring Redis to disable stop-writes-on-bgsave-error...${RESET}"
    redis-cli config set stop-writes-on-bgsave-error no || true
fi

# Clean old PID file if it exists
if [ -f "$PID_FILE" ]; then
    echo -e "${YELLOW}[WARNING] PID file $PID_FILE exists. Some services might already be running.${RESET}"
    echo -e "${YELLOW}Please run ./stop.sh first or clean the file if they crashed.${RESET}"
fi

check_port_in_use() {
    local port=$1
    if lsof -i :"$port" -sTCP:LISTEN -t &> /dev/null; then
        return 0 # port is in use
    else
        return 1 # port is free
    fi
}

wait_for_service() {
    local url=$1
    local name=$2
    local timeout=45
    local interval=2
    local elapsed=0

    echo -n "Waiting for $name to become healthy at $url..."
    while [ $elapsed -lt $timeout ]; do
        # We check if curl returns 200 or 401 or 404 (for active next.js routes)
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -qE "(200|301|302|307|308|401|404)"; then
            echo -e " ${GREEN}[OK]${RESET}"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        echo -n "."
    done
    echo -e " ${RED}[FAILED]${RESET}"
    echo -e "${RED}[ERROR] Service $name failed to become healthy at $url within $timeout seconds.${RESET}"
    return 1
}

# 1. ATS Backend
echo -e "\n${BLUE}Starting ATS Backend (Port 8001)...${RESET}"
if check_port_in_use 8001; then
    echo -e "${RED}[ERROR] Port 8001 is already in use.${RESET}"
    exit 1
fi
(cd ats_resume/backend && PYTHONPATH=".:../ai_engine" "$HOME/capvia_ats_venv/bin/uvicorn" main:app --host 127.0.0.1 --port 8001) > "$LOG_DIR/ats_backend.log" 2>&1 &
ATS_BACKEND_PID=$!
echo "$ATS_BACKEND_PID:ATS_Backend" >> "$PID_FILE"
if ! wait_for_service "http://127.0.0.1:8001/api/v1/health/ping" "ATS Backend"; then
    exit 1
fi

# 2. ATS Celery Worker
echo -e "\n${BLUE}Starting ATS Celery Worker...${RESET}"
(cd ats_resume/backend && PYTHONPATH=".:../ai_engine" "$HOME/capvia_ats_venv/bin/celery" -A workers.celery_app worker --loglevel=info --concurrency=4) > "$LOG_DIR/ats_worker.log" 2>&1 &
ATS_WORKER_PID=$!
echo "$ATS_WORKER_PID:ATS_Celery_Worker" >> "$PID_FILE"
echo -e "${GREEN}[OK] ATS Celery Worker started (PID: $ATS_WORKER_PID)${RESET}"

# 3. ATS Frontend (Decommissioned - unified under Next.js on port 3000)
# (Frontend now running inside CAPVIA Next.js portal)

# 4. Simulation Backend
echo -e "\n${BLUE}Starting Simulation Backend (Port 8002)...${RESET}"
if check_port_in_use 8002; then
    echo -e "${RED}[ERROR] Port 8002 is already in use.${RESET}"
    exit 1
fi
(cd ai_simulation/backend && "$HOME/capvia_simulation_venv/bin/uvicorn" app.main:app --host 127.0.0.1 --port 8002) > "$LOG_DIR/simulation_backend.log" 2>&1 &
SIM_BACKEND_PID=$!
echo "$SIM_BACKEND_PID:Simulation_Backend" >> "$PID_FILE"
if ! wait_for_service "http://127.0.0.1:8002/api/v1/" "Simulation Backend"; then
    exit 1
fi

# 5. Simulation Worker
echo -e "\n${BLUE}Starting Simulation Worker...${RESET}"
(cd ai_simulation/backend && "$HOME/capvia_simulation_venv/bin/celery" -A app.tasks.celery_app worker --loglevel=info) > "$LOG_DIR/simulation_worker.log" 2>&1 &
SIM_WORKER_PID=$!
echo "$SIM_WORKER_PID:Simulation_Worker" >> "$PID_FILE"
echo -e "${GREEN}[OK] Simulation Worker started (PID: $SIM_WORKER_PID)${RESET}"

# 6. Simulation Frontend (Decommissioned - unified under Next.js on port 3000)
# (Frontend now running inside CAPVIA Next.js portal)

# 7. Interview Backend (Evaluation Server)
echo -e "\n${BLUE}Starting Interview Evaluation Server (Port 8765)...${RESET}"
if check_port_in_use 8765; then
    echo -e "${RED}[ERROR] Port 8765 is already in use.${RESET}"
    exit 1
fi
(cd ai_interview && "$HOME/capvia_interview_venv/bin/python" evaluation_server.py) > "$LOG_DIR/interview_backend.log" 2>&1 &
INT_BACKEND_PID=$!
echo "$INT_BACKEND_PID:Interview_Backend" >> "$PID_FILE"
if ! wait_for_service "http://127.0.0.1:8765/health" "Interview Evaluation Server"; then
    exit 1
fi

# 8. Interview Kiosk UI (Electron - Decommissioned in favor of Web-native security proctoring)
# (Interview conducted inside CAPVIA Next.js portal at /candidate/interview)

# 9. CAPVIA Backend (Core Gateway)
echo -e "\n${BLUE}Starting CAPVIA Core Backend Gateway (Port 8000)...${RESET}"
if check_port_in_use 8000; then
    echo -e "${RED}[ERROR] Port 8000 is already in use.${RESET}"
    exit 1
fi
(cd capvia_platform && PYTHONPATH="/Volumes/KINGSTON/CAPVIA" "$HOME/capvia_gateway_venv/bin/uvicorn" main:app --host 127.0.0.1 --port 8000) > "$LOG_DIR/capvia_backend.log" 2>&1 &
CAP_BACKEND_PID=$!
echo "$CAP_BACKEND_PID:CAPVIA_Backend" >> "$PID_FILE"
if ! wait_for_service "http://127.0.0.1:8000/api/health" "CAPVIA Backend Gateway"; then
    exit 1
fi

# 10. CAPVIA Frontend (Recruiter Dashboard)
echo -e "\n${BLUE}Starting CAPVIA Recruiter Dashboard (Port 3000)...${RESET}"
if check_port_in_use 3000; then
    echo -e "${RED}[ERROR] Port 3000 is already in use.${RESET}"
    exit 1
fi
(cd capvia_platform/frontend && PORT=3000 node node_modules/next/dist/bin/next dev -H 127.0.0.1) > "$LOG_DIR/capvia_frontend.log" 2>&1 &
CAP_FRONTEND_PID=$!
echo "$CAP_FRONTEND_PID:CAPVIA_Frontend" >> "$PID_FILE"
if ! wait_for_service "http://127.0.0.1:3000" "CAPVIA Recruiter Dashboard"; then
    exit 1
fi

# Verification and success summary
echo -e "\n${GREEN}========================================================================${RESET}"
echo -e "${GREEN}             CAPVIA PLATFORM ECOSYSTEM RUNNING SUCCESSFULLY             ${RESET}"
echo -e "${GREEN}========================================================================${RESET}"
printf "%-30s | %-10s | %-40s | %-10s\n" "Service" "Port" "Health URL" "Status"
printf "%-30s | %-10s | %-40s | %-10s\n" "------------------------------" "----------" "----------------------------------------" "----------"
printf "%-30s | %-10s | %-40s | %-10s\n" "CAPVIA Backend" "8000" "http://localhost:8000/api/health" "RUNNING"
printf "%-30s | %-10s | %-40s | %-10s\n" "CAPVIA Unified UI" "3000" "http://localhost:3000" "RUNNING"
printf "%-30s | %-10s | %-40s | %-10s\n" "ATS Backend" "8001" "http://localhost:8001/api/v1/health/ping" "RUNNING"
printf "%-30s | %-10s | %-40s | %-10s\n" "Simulation Backend" "8002" "http://localhost:8002/api/v1/" "RUNNING"
printf "%-30s | %-10s | %-40s | %-10s\n" "Interview Backend" "8765" "http://localhost:8765/health" "RUNNING"
echo -e "${GREEN}========================================================================${RESET}\n"
echo -e "Logs are stored in the '${LOG_DIR}/' directory."
echo -e "To stop the ecosystem, run: ./stop.sh"
