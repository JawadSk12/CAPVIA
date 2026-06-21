# Production Deployment

## Prerequisites
- Kubernetes cluster (EKS, GKE, AKS, or bare metal)
- kubectl configured
- Docker registry access

## Build & Push
```bash
docker build -t your-registry/ai-simulation/backend:latest -f docker/backend/Dockerfile .
docker build -t your-registry/ai-simulation/frontend:latest -f docker/frontend/Dockerfile .
docker push your-registry/ai-simulation/backend:latest
docker push your-registry/ai-simulation/frontend:latest
```

## Deploy to Kubernetes
```bash
kubectl apply -f kubernetes/namespaces/
kubectl apply -f kubernetes/configmaps/
kubectl apply -f kubernetes/secrets/  # Fill in real values first!
kubectl apply -f kubernetes/volumes/
kubectl apply -f kubernetes/deployments/
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/ingress/
```
