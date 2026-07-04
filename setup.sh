#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# ANSI Color Codes
GREEN='\033[92m'
RED='\033[91m'
YELLOW='\033[93m'
BLUE='\033[94m'
RESET='\033[0m'

echo -e "${BLUE}====================================================${RESET}"
echo -e "${BLUE}         CAPVIA ECOSYSTEM SETUP SYSTEM              ${RESET}"
echo -e "${BLUE}====================================================${RESET}"

# 1. Verification of system toolchain versions
echo -e "\n${BLUE}[1/8] Verifying Toolchain Versions...${RESET}"

# Verify Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}[ERROR] Git is not installed.${RESET}"
    exit 1
fi
echo -e "${GREEN}[OK] Git: $(git --version)${RESET}"

# Verify Python 3.12
if ! command -v python3.12 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3.12 is not installed or not in PATH.${RESET}"
    exit 1
fi
echo -e "${GREEN}[OK] Python: $(python3.12 --version)${RESET}"

# Verify Node.js v20
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed.${RESET}"
    exit 1
fi
NODE_VER=$(node -v)
if [[ ! "$NODE_VER" =~ ^v20\. ]]; then
    echo -e "${YELLOW}[WARNING] Node.js version is $NODE_VER. Recommended version is v20.x.x.${RESET}"
else
    echo -e "${GREEN}[OK] Node.js: $NODE_VER${RESET}"
fi

# Verify npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed.${RESET}"
    exit 1
fi
echo -e "${GREEN}[OK] npm: $(npm -v)${RESET}"

# Verify Docker (Optional check)
if command -v docker &> /dev/null; then
    echo -e "${GREEN}[OK] Docker: $(docker --version | head -n 1)${RESET}"
else
    echo -e "${YELLOW}[WARNING] Docker is not running or not installed. Docker is optional but recommended.${RESET}"
fi

# Clean up macOS AppleDouble metadata files to prevent Alembic syntax errors
echo -e "\n${BLUE}Cleaning up macOS AppleDouble metadata files...${RESET}"
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




# 2. Virtual Environments Setup
echo -e "\n${BLUE}[2/8] Setting up Python Virtual Environments (APFS macOS SSD)...${RESET}"

setup_venv() {
    local venv_path=$1
    if [ ! -d "$venv_path" ]; then
        echo -e "Creating virtual environment at $venv_path..."
        python3.12 -m venv "$venv_path"
    else
        echo -e "Virtual environment already exists at $venv_path."
    fi
}

setup_venv "$HOME/capvia_gateway_venv"
setup_venv "$HOME/capvia_ats_venv"
setup_venv "$HOME/capvia_simulation_venv"
setup_venv "$HOME/capvia_interview_venv"


# 3. Installing Python Dependencies
echo -e "\n${BLUE}[3/8] Installing Backend Dependencies (pip requirements)...${RESET}"

# Gateway backend dependencies
echo "Installing gateway backend requirements..."
"$HOME/capvia_gateway_venv/bin/pip" install --upgrade pip
"$HOME/capvia_gateway_venv/bin/pip" install -r capvia_platform/requirements.txt
"$HOME/capvia_gateway_venv/bin/pip" install greenlet

# ATS backend dependencies
echo "Installing ATS backend requirements..."
"$HOME/capvia_ats_venv/bin/pip" install --upgrade pip
"$HOME/capvia_ats_venv/bin/pip" install -r ats_resume/backend/requirements.txt
"$HOME/capvia_ats_venv/bin/pip" install -r ats_resume/ai_engine/requirements.txt
"$HOME/capvia_ats_venv/bin/pip" install --upgrade pydantic pydantic-core

# Simulation backend dependencies
echo "Installing simulation backend requirements..."
"$HOME/capvia_simulation_venv/bin/pip" install --upgrade pip
"$HOME/capvia_simulation_venv/bin/pip" install -r ai_simulation/backend/requirements.txt

# Interview backend dependencies
echo "Installing interview backend requirements..."
"$HOME/capvia_interview_venv/bin/pip" install --upgrade pip
"$HOME/capvia_interview_venv/bin/pip" install -r ai_interview/requirements_ai.txt

echo -e "${GREEN}[OK] All Python dependencies installed successfully.${RESET}"


# 4. Installing Node Modules (with exFAT workarounds)
echo -e "\n${BLUE}[4/8] Installing Frontend & Electron Dependencies...${RESET}"

# Recruiter Dashboard
echo "Installing capvia_platform frontend node modules..."
(cd capvia_platform/frontend && npm install --no-bin-links --ignore-scripts)

# ATS Frontend
echo "Installing ats_resume frontend node modules..."
(cd ats_resume/frontend && npm install --no-bin-links --ignore-scripts)

# Simulation Frontend
echo "Installing ai_simulation frontend node modules..."
(cd ai_simulation/frontend && npm install --no-bin-links --ignore-scripts)

# Interview UI (Electron Kiosk)
echo "Installing ai_interview node modules & Electron binary..."
(cd ai_interview && npm install --no-bin-links --ignore-scripts)
(cd ai_interview && node node_modules/electron/install.js)

echo -e "${GREEN}[OK] All npm modules installed successfully.${RESET}"


# 5. Create local PostgreSQL databases if they do not exist
echo -e "\n${BLUE}[5/8] Provisioning Local PostgreSQL Databases...${RESET}"

create_db_if_not_exists() {
    local db_name=$1
    if PGPASSWORD="Almas@6060" psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        echo -e "Database '$db_name' already exists. Skipping."
    else
        echo -e "Creating database '$db_name'..."
        PGPASSWORD="Almas@6060" psql -h localhost -U postgres -c "CREATE DATABASE $db_name;"
    fi
}

create_db_if_not_exists "capvia"
create_db_if_not_exists "ats_db"
create_db_if_not_exists "ai_simulation"


# 6. Verify Connection configurations
echo -e "\n${BLUE}[6/8] Running CAPVIA Connection Verification Suite...${RESET}"
if ! "$HOME/capvia_gateway_venv/bin/python" scripts/verify_connections.py; then
    echo -e "${RED}[ERROR] Connection verification failed. Please check your services and configurations.${RESET}"
    exit 1
fi


# 7. Create local uploads folder
echo -e "\n${BLUE}[7/8] Ensuring Local Upload Folders Exist...${RESET}"
mkdir -p ats_resume/backend/uploads
echo -e "${GREEN}[OK] Local upload folders verified.${RESET}"


# 8. Run Alembic database migrations & Seed Database
echo -e "\n${BLUE}[8/8] Running Database Migrations & Seeds...${RESET}"

# Central Gateway Migrations
echo "Running Central Gateway database migrations (Neon)..."
(cd capvia_platform && DATABASE_URL="postgresql+asyncpg://neondb_owner:npg_tLEN1ylR7PGq@ep-bitter-sea-ao65dvct-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require" "$HOME/capvia_gateway_venv/bin/python" drop_tables.py)
(cd capvia_platform && "$HOME/capvia_gateway_venv/bin/alembic" upgrade head)

# Local ATS Database Reset
echo "Recreating local ATS database tables..."
(cd ats_resume/backend && PYTHONPATH=".:../ai_engine" "$HOME/capvia_ats_venv/bin/python" reset_db.py)

# Local Coding Simulation Migrations
echo "Running Coding Simulation database migrations..."
(cd ai_simulation/backend && "$HOME/capvia_simulation_venv/bin/alembic" upgrade head)

# Seed Gateway Database
echo "Seeding Central Gateway database (Neon)..."
(cd capvia_platform && PYTHONPATH="/Volumes/KINGSTON/CAPVIA" "$HOME/capvia_gateway_venv/bin/python" database/seed.py)

echo -e "\n${GREEN}====================================================${RESET}"
echo -e "${GREEN}      CAPVIA ECOSYSTEM SETUP COMPLETED SUCCESSFULLY   ${RESET}"
echo -e "${GREEN}====================================================${RESET}\n"
