#!/bin/bash
echo "Starting CAPVIA in Development Mode..."
docker-compose --env-file .env.development up --build
