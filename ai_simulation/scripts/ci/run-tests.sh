#!/bin/bash
set -e
echo "Running backend tests..."
cd backend && source venv/bin/activate && pytest tests/ --cov=app --cov-report=xml && cd ..
echo "Running frontend type check..."
cd frontend && npm run type-check && cd ..
echo "All tests passed."
