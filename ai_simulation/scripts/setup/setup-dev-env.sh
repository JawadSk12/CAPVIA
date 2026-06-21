#!/bin/bash
set -e
bash scripts/setup/install-dependencies.sh
docker compose up postgres redis -d
echo "Waiting for services to be ready..."
sleep 5
cd backend && source venv/bin/activate && alembic upgrade head && python scripts/seed_data.py && cd ..
echo "Development environment ready!"
echo "Start backend: cd backend && uvicorn app.main:socket_app --reload"
echo "Start frontend: cd frontend && npm run dev"
