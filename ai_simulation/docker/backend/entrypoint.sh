#!/bin/bash
set -e
echo "Running migrations..."
alembic upgrade head
echo "Starting server..."
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --workers 4
