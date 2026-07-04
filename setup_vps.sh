#!/bin/bash
# ==============================================================================
# CAPVIA VPS AUTOMATED ONE-CLICK DEPLOYMENT SCRIPT
# Target OS: Ubuntu 22.04 LTS or 24.04 LTS (x86_64)
# Run command: sudo bash setup_vps.sh
# ==============================================================================

set -e

# --- 1. Check Permissions & System ---
if [ "$EUID" -ne 0 ]; then
  echo "[-] Please run this script as root (sudo bash setup_vps.sh)"
  exit 1
fi

echo "[+] Starting CAPVIA Production Deployment on VPS..."
export DEBIAN_FRONTEND=noninteractive

# --- 2. Install System Package Prerequisites ---
echo "[+] Installing system prerequisites (Nginx, Git, Python 3.12, Node.js)..."
apt-get update -y
apt-get install -y curl git build-essential certbot python3-certbot-nginx software-properties-common

# Add Python 3.12 repo if not present
add-apt-repository ppa:deadsnakes/ppa -y
apt-get update -y
apt-get install -y python3.12 python3.12-venv python3.12-dev

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 globally for managing Next.js frontends
npm install -g pm2

# --- 3. Read Unified Environment Variables ---
REPO_DIR="/opt/capvia"
ENV_FILE="${REPO_DIR}/.env"

if [ ! -d "$REPO_DIR" ]; then
  echo "[+] Setting up repository path at ${REPO_DIR}..."
  mkdir -p "$REPO_DIR"
  cp -r . "$REPO_DIR"
fi

cd "$REPO_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "[-] No root .env file found at ${ENV_FILE}."
  echo "[*] Creating template .env file. Please edit it with your real keys and rerun the script."
  cp capvia_platform/.env.example "$ENV_FILE"
  echo "[-] Action Required: Please edit ${ENV_FILE} and run this script again."
  exit 1
fi

# Load variables
source "$ENV_FILE"

# --- 4. Setup Python Virtual Environments & Build Services ---

# A. CAPVIA Gateway
echo "[+] Building CAPVIA Gateway..."
python3.12 -m venv "${REPO_DIR}/capvia_platform/venv"
"${REPO_DIR}/capvia_platform/venv/bin/pip" install --upgrade pip
"${REPO_DIR}/capvia_platform/venv/bin/pip" install -r "${REPO_DIR}/capvia_platform/requirements.txt"

# B. ATS Resume Backend
echo "[+] Building ATS Resume Backend..."
python3.12 -m venv "${REPO_DIR}/ats_resume/backend/venv"
"${REPO_DIR}/ats_resume/backend/venv/bin/pip" install --upgrade pip
"${REPO_DIR}/ats_resume/backend/venv/bin/pip" install -r "${REPO_DIR}/ats_resume/backend/requirements.txt"

# C. Simulation Backend
echo "[+] Building Simulation Backend..."
python3.12 -m venv "${REPO_DIR}/ai_simulation/backend/venv"
"${REPO_DIR}/ai_simulation/backend/venv/bin/pip" install --upgrade pip
"${REPO_DIR}/ai_simulation/backend/venv/bin/pip" install -r "${REPO_DIR}/ai_simulation/backend/requirements.txt"

# D. Interview Evaluation Backend
echo "[+] Building Interview Evaluation Server..."
python3.12 -m venv "${REPO_DIR}/ai_interview/venv"
"${REPO_DIR}/ai_interview/venv/bin/pip" install --upgrade pip
"${REPO_DIR}/ai_interview/venv/bin/pip" install -r "${REPO_DIR}/ai_interview/requirements_ai.txt"

# --- 5. Configure Systemd Services for Backends ---
echo "[+] Creating systemd service configurations..."

# Gateway Service
cat <<EOF > /etc/systemd/system/capvia-gateway.service
[Unit]
Description=CAPVIA Central Gateway API
After=network.target

[Service]
User=root
WorkingDirectory=${REPO_DIR}/capvia_platform
EnvironmentFile=${ENV_FILE}
Environment=PYTHONPATH=${REPO_DIR}
ExecStart=${REPO_DIR}/capvia_platform/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# ATS Backend Service
cat <<EOF > /etc/systemd/system/capvia-ats-backend.service
[Unit]
Description=CAPVIA ATS Backend API
After=network.target

[Service]
User=root
WorkingDirectory=${REPO_DIR}/ats_resume/backend
EnvironmentFile=${ENV_FILE}
Environment=PYTHONPATH=${REPO_DIR}/ats_resume/backend:${REPO_DIR}/ats_resume/ai_engine
ExecStart=${REPO_DIR}/ats_resume/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# ATS Celery Worker Service
cat <<EOF > /etc/systemd/system/capvia-ats-celery.service
[Unit]
Description=CAPVIA ATS Celery Background Worker
After=network.target

[Service]
User=root
WorkingDirectory=${REPO_DIR}/ats_resume/backend
EnvironmentFile=${ENV_FILE}
Environment=PYTHONPATH=${REPO_DIR}/ats_resume/backend:${REPO_DIR}/ats_resume/ai_engine
ExecStart=${REPO_DIR}/ats_resume/backend/venv/bin/celery -A workers.celery_app worker --loglevel=info
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Simulation Backend Service
cat <<EOF > /etc/systemd/system/capvia-simulation-backend.service
[Unit]
Description=CAPVIA Simulation Backend API
After=network.target

[Service]
User=root
WorkingDirectory=${REPO_DIR}/ai_simulation/backend
EnvironmentFile=${ENV_FILE}
Environment=PYTHONPATH=${REPO_DIR}/ai_simulation/backend
ExecStart=${REPO_DIR}/ai_simulation/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8002
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Interview Evaluation Backend Service
cat <<EOF > /etc/systemd/system/capvia-interview-backend.service
[Unit]
Description=CAPVIA Speech & Video Evaluation Server
After=network.target

[Service]
User=root
WorkingDirectory=${REPO_DIR}/ai_interview
EnvironmentFile=${ENV_FILE}
Environment=PYTHONPATH=${REPO_DIR}/ai_interview
ExecStart=${REPO_DIR}/ai_interview/venv/bin/python evaluation_server.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start and Enable Services
systemctl daemon-reload
systemctl enable --now capvia-gateway capvia-ats-backend capvia-ats-celery capvia-simulation-backend capvia-interview-backend
systemctl restart capvia-gateway capvia-ats-backend capvia-ats-celery capvia-simulation-backend capvia-interview-backend

# --- 6. Build and Start Node.js Next.js Frontends ---
echo "[+] Deploying Next.js Frontends using PM2..."

# A. Recruiter Frontend
cd "${REPO_DIR}/capvia_platform/frontend"
npm install
# Set build-time env vars
export NEXT_PUBLIC_API_URL="https://api.capvia.in/api/v1"
export NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL}"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${SUPABASE_PUBLISHABLE_KEY}"
npm run build
pm2 delete recruiter-frontend || true
pm2 start "npm run start -- -p 3000" --name recruiter-frontend

# B. ATS Frontend
cd "${REPO_DIR}/ats_resume/frontend"
npm install
export NEXT_PUBLIC_API_URL="https://ats-api.capvia.in"
export NEXT_PUBLIC_APP_NAME="CAPVIA ATS"
npm run build
pm2 delete ats-frontend || true
pm2 start "npm run start -- -p 3001" --name ats-frontend

# --- 7. Build Static Simulation Vite Frontend ---
echo "[+] Deploying Vite Simulation Frontend to Nginx..."
cd "${REPO_DIR}/ai_simulation/frontend"
npm install
export VITE_API_URL="https://simulation-api.capvia.in/api/v1"
npm run build
mkdir -p /var/www/capvia-simulation
cp -r dist/* /var/www/capvia-simulation/

# Save PM2 state
pm2 save
pm2 startup | tail -n 1 | bash

# --- 8. Configure Nginx Server Blocks ---
echo "[+] Creating Nginx site configurations..."

cat <<EOF > /etc/nginx/sites-available/capvia
# 1. Recruiter Frontend UI (capvia.in)
server {
    server_name capvia.in www.capvia.in;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

# 2. ATS Candidate UI (ats.capvia.in)
server {
    server_name ats.capvia.in;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

# 3. Simulation Candidate UI (simulation.capvia.in)
server {
    server_name simulation.capvia.in;
    root /var/www/capvia-simulation;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

# 4. CAPVIA API Gateway (api.capvia.in)
server {
    server_name api.capvia.in;
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# 5. ATS Backend API (ats-api.capvia.in)
server {
    server_name ats-api.capvia.in;
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# 6. Simulation Backend API (simulation-api.capvia.in)
server {
    server_name simulation-api.capvia.in;
    location / {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# 7. Interview Backend API (interview-api.capvia.in)
server {
    server_name interview-api.capvia.in;
    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/capvia /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default || true

nginx -t
systemctl restart nginx

echo "[+] Nginx reverse proxy configured successfully."

# --- 9. Request SSL Certificates via Certbot ---
echo "[+] Obtaining SSL Certificates automatically from Let's Encrypt..."
certbot --nginx -d capvia.in -d www.capvia.in -d ats.capvia.in -d simulation.capvia.in -d api.capvia.in -d ats-api.capvia.in -d simulation-api.capvia.in -d interview-api.capvia.in --non-interactive --agree-tos --email webmaster@capvia.in --redirect

echo "=============================================================================="
echo "[+] SUCCESS: CAPVIA HAS BEEN DEPLOYED SUCCESSFULLY ON THE VPS!"
echo "[+] All backend servers are running via systemd."
echo "[+] Next.js frontends are running via PM2."
echo "[+] Nginx has reverse-proxied and SSL-encrypted all 7 subdomains."
echo "=============================================================================="
