#!/bin/bash
set -e
echo "Linting backend..."
cd backend && source venv/bin/activate && flake8 app/ && black --check app/ && cd ..
echo "Linting frontend..."
cd frontend && npm run lint && cd ..
echo "All linting passed."
