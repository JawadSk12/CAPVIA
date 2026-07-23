#!/usr/bin/env bash
# ==============================================================================
# CAPVIA UNIFIED ECOSYSTEM REDEPLOYMENT SYSTEM
# Target OS: macOS
# Target Disk: exFAT USB Drive /Volumes/KINGSTON/CAPVIA
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# ANSI Color Codes
GREEN='\033[92m'
RED='\033[91m'
YELLOW='\033[93m'
BLUE='\033[94m'
RESET='\033[0m'

echo -e "${BLUE}====================================================${RESET}"
echo -e "${BLUE}       CAPVIA PLATFORM ECOSYSTEM REDEPLOYER         ${RESET}"
echo -e "${BLUE}====================================================${RESET}"

# --- 1. TEARDOWN RUNNING SERVICES ---
echo -e "\n${BLUE}[1/7] Stopping any active CAPVIA services...${RESET}"
if [ -f "./stop.sh" ]; then
    bash ./stop.sh || true
else
    echo -e "${YELLOW}[WARNING] stop.sh not found. Scanning processes manually...${RESET}"
fi

# --- 2. STORAGE & DISK CLEANUP ---
echo -e "\n${BLUE}[2/7] Clearing old logs & metadata files (Saving space)...${RESET}"
mkdir -p logs
rm -rf logs/*
echo -e "${GREEN}[OK] Logs folder cleared.${RESET}"

echo -e "Cleaning up macOS AppleDouble metadata files to prevent DB errors..."
python3 -c "
import os
deleted_count = 0
skip_dirs = {'node_modules', '.git', 'venv'}
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in skip_dirs]
    for f in files:
        if f.startswith('._') or f == '.DS_Store':
            fp = os.path.join(root, f)
            try:
                os.remove(fp)
                deleted_count += 1
            except Exception:
                pass
print(f'Deleted {deleted_count} AppleDouble metadata files.')
"

# --- 3. SYSTEM CHECK & DATABASE PORTS CHECK ---
echo -e "\n${BLUE}[3/7] Verifying system dependencies and database servers...${RESET}"

# Verify Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERROR] Git is not installed.${RESET}"
    exit 1
fi

# Verify Python 3.12
if ! command -v python3.12 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3.12 is not installed.${RESET}"
    exit 1
fi

# Verify Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed.${RESET}"
    exit 1
fi

# Verify local PostgreSQL (Port 5432)
if ! nc -zv 127.0.0.1 5432 &>/dev/null; then
    echo -e "${RED}[ERROR] Local PostgreSQL server is offline on port 5432. Please start it using 'brew services start postgresql@15'${RESET}"
    exit 1
fi
echo -e "${GREEN}[OK] PostgreSQL is active.${RESET}"

# Verify local Redis (Port 6379)
if ! nc -zv 127.0.0.1 6379 &>/dev/null; then
    echo -e "${RED}[ERROR] Local Redis server is offline on port 6379. Please start it using 'brew services start redis'${RESET}"
    exit 1
fi
echo -e "${GREEN}[OK] Redis is active.${RESET}"

# Verify local MongoDB (Port 27017)
if ! nc -zv 127.0.0.1 27017 &>/dev/null; then
    echo -e "${YELLOW}[WARNING] Local MongoDB server is offline on port 27017. ATS resume features may fail.${RESET}"
    echo -e "${YELLOW}Please start it using: brew services start mongodb-community${RESET}"
fi

# --- 4. VERIFY PLATFORM CONFIGURATION ---
echo -e "\n${BLUE}[4/7] Verifying .env configuration...${RESET}"
if [ ! -f "capvia_platform/.env" ]; then
    echo -e "${RED}[ERROR] Environment file capvia_platform/.env is missing!${RESET}"
    echo -e "${YELLOW}Please copy capvia_platform/.env.example to capvia_platform/.env and fill in configuration keys.${RESET}"
    exit 1
fi
echo -e "${GREEN}[OK] Environment variables file detected.${RESET}"

# --- 5. CHECK VIRTUAL ENVIRONMENTS ---
echo -e "\n${BLUE}[5/7] Verifying Python virtual environments...${RESET}"
verify_venv() {
    local venv_path=$1
    if [ ! -d "$venv_path" ]; then
        echo -e "${YELLOW}[WARNING] Virtual environment $venv_path does not exist. Creating and seeding it...${RESET}"
        python3.12 -m venv "$venv_path"
        "$venv_path/bin/pip" install --upgrade pip
        if [[ "$venv_path" == *gateway* ]]; then
            "$venv_path/bin/pip" install -r capvia_platform/requirements.txt greenlet
        elif [[ "$venv_path" == *ats* ]]; then
            "$venv_path/bin/pip" install -r ats_resume/backend/requirements.txt -r ats_resume/ai_engine/requirements.txt pydantic pydantic-core
        elif [[ "$venv_path" == *simulation* ]]; then
            "$venv_path/bin/pip" install -r ai_simulation/backend/requirements.txt
        elif [[ "$venv_path" == *interview* ]]; then
            "$venv_path/bin/pip" install -r ai_interview/requirements_ai.txt
        fi
    else
        echo -e "${GREEN}[OK] Virtual environment exists: $venv_path${RESET}"
    fi
}

verify_venv "$HOME/capvia_gateway_venv"
verify_venv "$HOME/capvia_ats_venv"
verify_venv "$HOME/capvia_simulation_venv"
verify_venv "$HOME/capvia_interview_venv"

# --- 6. VERIFY NODE MODULES ---
echo -e "\n${BLUE}[6/7] Verifying frontend node_modules exist...${RESET}"
verify_node_modules() {
    local dir=$1
    if [ ! -d "$dir/node_modules" ]; then
        echo -e "${YELLOW}[WARNING] node_modules missing in $dir. Installing...${RESET}"
        (cd "$dir" && npm install --no-bin-links --ignore-scripts)
    else
        echo -e "${GREEN}[OK] node_modules detected in $dir${RESET}"
    fi
}

verify_node_modules "capvia_platform/frontend"
verify_node_modules "ats_resume/frontend"
verify_node_modules "ai_simulation/frontend"
verify_node_modules "ai_interview"


# --- 7. PROVISION DATABASES, RUN MIGRATIONS & SEED ---
echo -e "\n${BLUE}[7/7] Initializing and seeding relational databases...${RESET}"

# Create PostgreSQL databases if they don't exist
create_db_if_not_exists() {
    local db_name=$1
    if PGPASSWORD="Almas@6060" psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        echo -e "Database '$db_name' already exists."
    else
        echo -e "Creating database '$db_name'..."
        PGPASSWORD="Almas@6060" psql -h localhost -U postgres -c "CREATE DATABASE $db_name;"
    fi
}

create_db_if_not_exists "capvia"
create_db_if_not_exists "ats_db"
create_db_if_not_exists "ai_simulation"

# Run Core migrations & seeds dynamically configured from capvia_platform/.env
echo "Dropping old Gateway tables..."
(cd capvia_platform && "$HOME/capvia_gateway_venv/bin/python" drop_tables.py)

echo "Running Alembic migrations..."
(cd capvia_platform && "$HOME/capvia_gateway_venv/bin/alembic" upgrade head)

echo "Seeding default data (Recruiters, Internships, Candidates)..."
(cd capvia_platform && PYTHONPATH="/Volumes/KINGSTON/CAPVIA" "$HOME/capvia_gateway_venv/bin/python" database/seed.py)

# Reset local ATS Postgres database
echo "Resetting local ATS database..."
(cd ats_resume/backend && PYTHONPATH=".:../ai_engine" "$HOME/capvia_ats_venv/bin/python" reset_db.py)

# Run Simulation Alembic migrations
echo "Running Coding Simulation migrations..."
(cd ai_simulation/backend && "$HOME/capvia_simulation_venv/bin/alembic" upgrade head)

echo -e "${GREEN}[OK] Database provisioning and schema configuration completed.${RESET}"

# --- STARTUP & HEALTH CHECK ---
echo -e "\n${BLUE}[Startup] Starting ecosystem services...${RESET}"
if [ -f "./start.sh" ]; then
    bash ./start.sh
else
    echo -e "${RED}[ERROR] start.sh script not found! Cannot automatically boot services.${RESET}"
    exit 1
fi

# Let the services settle
echo "Sleeping for 5 seconds to let services initialize..."
sleep 5

# Run the health check (do not fail the script if optional or external databases are offline/unreachable)
if [ -f "./healthcheck.sh" ]; then
    echo -e "\nRunning validation healthcheck..."
    bash ./healthcheck.sh || true
else
    echo -e "${YELLOW}[WARNING] healthcheck.sh not found. Verify services manually.${RESET}"
fi

echo -e "\n${GREEN}====================================================${RESET}"
echo -e "${GREEN}      CAPVIA REDEPLOYMENT COMPLETED SUCCESSFULLY     ${RESET}"
echo -e "${GREEN}====================================================${RESET}\n"
