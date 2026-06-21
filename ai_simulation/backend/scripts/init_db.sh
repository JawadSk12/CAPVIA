#!/bin/bash

# Initialize Database Script
# Creates database tables and initial data

set -e

echo "========================================"
echo "AI Simulation Engine - Database Init"
echo "========================================"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
while ! nc -z ${POSTGRES_SERVER:-localhost} ${POSTGRES_PORT:-5432}; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Run Alembic migrations
echo "Running database migrations..."
cd /app
alembic upgrade head

# Initialize database with seed data
echo "Initializing database..."
python -c "
from app.db.session import SessionLocal
from app.db.init_db import init_db, create_sample_questions

db = SessionLocal()
try:
    init_db(db)
    create_sample_questions(db)
    print('Database initialized successfully!')
except Exception as e:
    print(f'Error initializing database: {e}')
    raise
finally:
    db.close()
"

echo "========================================"
echo "Database initialization complete!"
echo "========================================"