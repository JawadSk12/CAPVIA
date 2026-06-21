#!/bin/bash
set -e
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..
echo "Installing backend dependencies..."
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && pip install -r requirements-dev.txt && cd ..
echo "All dependencies installed."
