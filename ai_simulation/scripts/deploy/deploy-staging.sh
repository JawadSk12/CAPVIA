#!/bin/bash
TAG=${1:-latest}
echo "Deploying tag $TAG to staging..."
kubectl set image deployment/backend backend=ai-simulation/backend:$TAG -n ai-simulation-staging
kubectl set image deployment/frontend frontend=ai-simulation/frontend:$TAG -n ai-simulation-staging
kubectl rollout status deployment/backend -n ai-simulation-staging
echo "Staging deploy complete."
