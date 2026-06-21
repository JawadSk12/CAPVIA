# Scaling Guide

## Horizontal Scaling
- Backend: Scale replicas based on CPU/memory metrics
- Celery: Add more workers for evaluation throughput
- Frontend: Stateless, scale freely

## Database Scaling
- Read replicas for analytics queries
- Connection pooling via PgBouncer
- Redis Cluster for high availability

## Auto-scaling (HPA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```
