#!/bin/bash
echo "Running database migrations..."
cd "$(dirname "$0")/.."
alembic upgrade head
echo "Migrations complete."
