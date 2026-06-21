#!/bin/bash
echo "Starting CAPVIA in Production Mode..."
docker-compose --env-file .env.production -f docker-compose.yml up -d --build
