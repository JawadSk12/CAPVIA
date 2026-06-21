#!/bin/bash
TAG=${1:-latest}
echo "Deploying tag $TAG to production..."
kubectl set image deployment/backend backend=ai-simulation/backend:$TAG -n ai-simulation
kubectl set image deployment/frontend frontend=ai-simulation/frontend:$TAG -n ai-simulation
kubectl rollout status deployment/backend -n ai-simulation
echo "Production deploy complete."
