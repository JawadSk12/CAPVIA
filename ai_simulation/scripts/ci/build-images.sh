#!/bin/bash
TAG=${1:-latest}
docker build -t ai-simulation/backend:$TAG -f docker/backend/Dockerfile .
docker build -t ai-simulation/frontend:$TAG -f docker/frontend/Dockerfile .
echo "Images built with tag: $TAG"
