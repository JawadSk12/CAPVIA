#!/bin/bash
set -e
echo "Setting up production environment..."
kubectl apply -f kubernetes/namespaces/
kubectl apply -f kubernetes/secrets/
kubectl apply -f kubernetes/configmaps/
kubectl apply -f kubernetes/volumes/
kubectl apply -f kubernetes/deployments/
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/ingress/
echo "Production environment deployed."
