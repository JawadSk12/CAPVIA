#!/usr/bin/env bash

# ANSI Color Codes
GREEN='\033[92m'
RED='\033[91m'
YELLOW='\033[93m'
BLUE='\033[94m'
RESET='\033[0m'

echo -e "${BLUE}====================================================${RESET}"
echo -e "${BLUE}         CAPVIA ECOSYSTEM SHUTDOWN SYSTEM           ${RESET}"
echo -e "${BLUE}====================================================${RESET}"

PID_FILE=".capvia_pids"

clean_dangling_processes() {
    # Fallback to general process matching to ensure everything is stopped
    echo "Scanning for dangling CAPVIA processes..."
    local DANGLING=$(pgrep -f "uvicorn.*(8000|8001|8002)" || true)
    local DANGLING_NEXT=$(pgrep -f "next-server|next dev" || true)
    local DANGLING_VITE=$(pgrep -f "vite.js --port 5173" || true)
    local DANGLING_CELERY=$(pgrep -f "celery -A" || true)
    local DANGLING_EVAL=$(pgrep -f "evaluation_server.py" || true)
    local DANGLING_ELECTRON=$(pgrep -f "Electron \." || true)
    
    local PIDS_TO_KILL="$DANGLING $DANGLING_NEXT $DANGLING_VITE $DANGLING_CELERY $DANGLING_EVAL $DANGLING_ELECTRON"
    
    if [ -n "$(echo $PIDS_TO_KILL | xargs)" ]; then
        echo -e "${YELLOW}Found dangling processes: $PIDS_TO_KILL. Terminating them...${RESET}"
        for pid in $PIDS_TO_KILL; do
            kill -15 "$pid" 2>/dev/null || true
        done
        sleep 2
        for pid in $PIDS_TO_KILL; do
            kill -9 "$pid" 2>/dev/null || true
        done
        echo -e "${GREEN}[OK] Dangling services stopped.${RESET}"
    else
        echo -e "${GREEN}[OK] No active CAPVIA processes detected.${RESET}"
    fi
}

if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}[WARNING] No PID file ($PID_FILE) found. Checking if any orphan services are running...${RESET}"
    clean_dangling_processes
    exit 0
fi

# Store pids in array to kill them
declare -a PIDS
declare -a NAMES

while IFS=: read -r pid name; do
    if [ -n "$pid" ] && [ -n "$name" ]; then
        PIDS+=("$pid")
        NAMES+=("$name")
    fi
done < "$PID_FILE"

echo -e "\nSending SIGTERM to services..."
for i in "${!PIDS[@]}"; do
    pid="${PIDS[$i]}"
    name="${NAMES[$i]}"
    
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "Stopping $name (PID: $pid)..."
        kill -15 "$pid" 2>/dev/null || true
    else
        echo -e "$name (PID: $pid) is already stopped."
    fi
done

# Wait and check if they are dead
echo -e "\nWaiting for services to exit..."
timeout=5
elapsed=0
while [ $elapsed -lt $timeout ]; do
    all_dead=true
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            all_dead=false
            break
        fi
    done
    
    if [ "$all_dead" = true ]; then
        break
    fi
    sleep 1
    elapsed=$((elapsed + 1))
done

# Force kill any survivors
for i in "${!PIDS[@]}"; do
    pid="${PIDS[$i]}"
    name="${NAMES[$i]}"
    
    if kill -0 "$pid" 2>/dev/null; then
        echo -e "${YELLOW}Force stopping $name (PID: $pid) with SIGKILL...${RESET}"
        kill -9 "$pid" 2>/dev/null || true
    else
        echo -e "${GREEN}[OK] $name stopped.${RESET}"
    fi
done

clean_dangling_processes
rm -f "$PID_FILE"
echo -e "\n${GREEN}CAPVIA Ecosystem Stopped successfully.${RESET}\n"
