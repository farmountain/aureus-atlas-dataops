# Deployment Guide

## Overview
This guide provides comprehensive procedures for deploying the AUREUS Platform to development, staging, and production environments.

**Audience**: DevOps Engineers, SREs, Platform Engineers  
**Prerequisites**: Docker, Kubernetes, kubectl, helm (optional)  
**Last Updated**: 2024-01-15

---

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Docker Compose Deployment](#docker-compose-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Health Checks & Validation](#health-checks--validation)
6. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites
```bash
# Required tools
- Node.js 20+
- npm 10+
- Docker 24+
- Docker Compose 2.20+

# Verify installations
node --version  # v20.x.x
npm --version   # 10.x.x
docker --version
docker compose version
```

### Quick Start (Spark Environment)

This application is optimized for the Spark runtime and runs without additional setup:

```bash
# The app is pre-configured for Spark
# Simply open in your Spark environment and it will run

# For local development outside Spark:
npm install
npm run dev

# Application available at http://localhost:5173
```

---

## Docker Compose Deployment

### Development Environment

```bash
# Clone repository
git clone https://github.com/yourorg/aureus-platform.git
cd aureus-platform

# Create environment file
cp .env.example .env

# Edit .env with development settings
vim .env

# Start services (development mode)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker compose logs -f aureus-frontend

# Access application
# http://localhost:5173 (dev with hot reload)
```

**Development Mode Features**:
- Hot module replacement
- Source maps enabled
- Debug logging
- Local volume mounts for live code changes

### Production Environment

```bash
# Build production images
docker compose build --no-cache

# Start production services
docker compose up -d

# Verify services
docker compose ps

# Expected output:
# NAME                  STATUS              PORTS
# aureus-frontend       running (healthy)   0.0.0.0:5000->5000/tcp
# aureus-postgres       running (healthy)   0.0.0.0:5432->5432/tcp
# aureus-redis          running (healthy)   0.0.0.0:6379->6379/tcp

# Access application
# http://localhost:5000
```

### Environment Variables

Create `.env` file in project root:

```bash
# Application
APP_VERSION=0.1.0
NODE_ENV=production
EVIDENCE_RETENTION_DAYS=90

# Database
POSTGRES_USER=aureus
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=aureus_metadata

# Redis
REDIS_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Optional: LLM API Keys (if using external LLM)
OPENAI_API_KEY=sk-...

# Security
JWT_SECRET=CHANGE_ME_RANDOM_STRING_64_CHARS
EVIDENCE_ENCRYPTION_KEY=CHANGE_ME_32_BYTE_KEY
```

---

## Kubernetes Deployment

### Prerequisites

```bash
# Required tools
- kubectl 1.28+
- helm 3.12+ (optional)
- Access to Kubernetes cluster (1.28+)

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### Namespace Setup

```bash
# Create namespace
kubectl create namespace aureus

# Set as default (optional)
kubectl config set-context --current --namespace=aureus

# Create secrets (CRITICAL: Replace placeholder values!)
kubectl create secret generic aureus-secrets \
  --from-literal=database.username=aureus \
  --from-literal=database.password='CHANGE_ME_STRONG_PASSWORD' \
  --from-literal=redis.password='CHANGE_ME_STRONG_PASSWORD' \
  --from-literal=jwt.secret='CHANGE_ME_RANDOM_64_CHARS' \
  --from-literal=evidence.encryption_key='CHANGE_ME_32_BYTES' \
  --from-literal=openai.api_key='sk-...' \
  -n aureus

# Verify secret
kubectl get secret aureus-secrets -n aureus
```

### Deploy Infrastructure Services

```bash
# Apply ConfigMaps
kubectl apply -f k8s/configmap.yaml

# Deploy Postgres
kubectl apply -f k8s/postgres-deployment.yaml

# Deploy Redis
kubectl apply -f k8s/redis-deployment.yaml

# Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l app=aureus,component=postgres -n aureus --timeout=120s
kubectl wait --for=condition=ready pod -l app=aureus,component=redis -n aureus --timeout=120s
```

### Build and Push Container Image

```bash
# Build image
docker build -t aureus/frontend:0.1.0 .

# Tag for registry (replace with your registry)
docker tag aureus/frontend:0.1.0 your-registry.example.com/aureus/frontend:0.1.0

# Push to registry
docker push your-registry.example.com/aureus/frontend:0.1.0

# Update deployment manifest with correct image
sed -i 's|aureus/frontend:0.1.0|your-registry.example.com/aureus/frontend:0.1.0|' k8s/deployment.yaml
```

### Deploy Application

```bash
# Apply deployment
kubectl apply -f k8s/deployment.yaml

# Apply services
kubectl apply -f k8s/service.yaml

# Wait for deployment to complete
kubectl rollout status deployment/aureus-frontend -n aureus

# Verify pods are running
kubectl get pods -n aureus -l component=frontend

# Expected output:
# NAME                               READY   STATUS    RESTARTS   AGE
# aureus-frontend-7d5c8d9f4b-abc12   1/1     Running   0          2m
# aureus-frontend-7d5c8d9f4b-def34   1/1     Running   0          2m
# aureus-frontend-7d5c8d9f4b-ghi56   1/1     Running   0          2m
```

### Configure Ingress (Optional)

```bash
# Update ingress hostname in k8s/service.yaml
# Replace aureus.example.com with your domain

# Apply ingress
kubectl apply -f k8s/service.yaml

# Verify ingress
kubectl get ingress -n aureus

# Get external IP/hostname
kubectl get svc aureus-frontend -n aureus
```

### DNS Configuration

Point your domain to the LoadBalancer IP or Ingress:

```bash
# Get LoadBalancer IP
kubectl get svc aureus-frontend -n aureus -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Example output: 34.123.45.67

# Create DNS A record:
# aureus.example.com -> 34.123.45.67
```

---

## Environment Configuration

### Development Environment

```yaml
environment: development
replicas: 1
resources:
  requests: {cpu: 100m, memory: 128Mi}
  limits: {cpu: 500m, memory: 512Mi}
evidence_retention_days: 30
rate_limits: relaxed
monitoring: basic
tls: false
```

### Staging Environment

```yaml
environment: staging
replicas: 2
resources:
  requests: {cpu: 250m, memory: 256Mi}
  limits: {cpu: 500m, memory: 512Mi}
evidence_retention_days: 60
rate_limits: production
monitoring: full
tls: true
data_source: staging_database
```

### Production Environment

```yaml
environment: production
replicas: 3
resources:
  requests: {cpu: 250m, memory: 256Mi}
  limits: {cpu: 500m, memory: 512Mi}
evidence_retention_days: 90
rate_limits: strict
monitoring: full
tls: true
high_availability: true
auto_scaling: enabled
backup: enabled
```

---

## Health Checks & Validation

### Post-Deployment Validation

Run the deployment check script:

```bash
# Automated validation
./scripts/deploy-check.sh --environment production

# Manual validation checklist:

# 1. Health endpoints
curl -f https://aureus.example.com/health
# Expected: {"status":"healthy","timestamp":"..."}

# 2. API connectivity
curl -f https://aureus.example.com/api/health
# Expected: {"status":"ok","database":"connected","redis":"connected"}

# 3. Frontend loads
curl -I https://aureus.example.com
# Expected: HTTP/2 200

# 4. Authentication works (if enabled)
curl -X POST https://aureus.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# 5. Database connectivity
kubectl exec -it -n aureus deployment/aureus-frontend -- \
  curl -f http://aureus-postgres:5432
# Expected: connection established

# 6. Evidence storage writable
kubectl exec -it -n aureus deployment/aureus-frontend -- \
  sh -c 'echo "test" > /app/evidence/test.txt && cat /app/evidence/test.txt'
# Expected: test

# 7. Policy engine functional
# Via UI: Navigate to Guard Demo, execute test action
# Expected: Policy checks pass, audit log entry created

# 8. Query execution (end-to-end)
# Via UI: Go to Query tab, ask "Show total loan count"
# Expected: Query executes, returns results, evidence generated
```

### Smoke Tests

```bash
# Run automated smoke tests
npm run test:smoke

# Or manually:
kubectl exec -it -n aureus deployment/aureus-frontend -- npm test -- --run smoke
```

### Performance Validation

```bash
# Query latency (should be <3s per SLO)
curl -w "@curl-format.txt" -o /dev/null -s https://aureus.example.com/api/query \
  -X POST -H "Content-Type: application/json" \
  -d '{"question":"test query"}'

# Expected: time_total < 3.0s

# Evidence generation time (should be <5s per SLO)
# Via UI: Execute action, measure time to evidence pack display
# Expected: <5s
```

---

## Deployment Strategies

### Blue-Green Deployment

```bash
# Deploy green environment
kubectl apply -f k8s/deployment-green.yaml

# Wait for green to be healthy
kubectl wait --for=condition=ready pod -l app=aureus,environment=green -n aureus

# Switch traffic to green
kubectl patch service aureus-frontend -n aureus \
  -p '{"spec":{"selector":{"environment":"green"}}}'

# Verify traffic switched
curl -I https://aureus.example.com

# If successful, scale down blue
kubectl scale deployment/aureus-frontend-blue -n aureus --replicas=0

# If issues, rollback to blue
kubectl patch service aureus-frontend -n aureus \
  -p '{"spec":{"selector":{"environment":"blue"}}}'
```

### Canary Deployment

```bash
# Deploy canary with 10% traffic
kubectl apply -f k8s/deployment-canary.yaml

# Monitor canary metrics for 30 minutes
kubectl logs -n aureus -l version=canary --tail=100

# If metrics good, increase to 50%
kubectl scale deployment/aureus-frontend-canary -n aureus --replicas=2
kubectl scale deployment/aureus-frontend-stable -n aureus --replicas=2

# If metrics still good, promote canary to stable
kubectl apply -f k8s/deployment-stable.yaml
# (deployment-stable.yaml points to new version)

# Scale down old stable
kubectl scale deployment/aureus-frontend-canary -n aureus --replicas=0
```

### Rolling Update (Default)

```bash
# Update image in deployment
kubectl set image deployment/aureus-frontend \
  frontend=aureus/frontend:0.1.1 \
  -n aureus

# Monitor rollout
kubectl rollout status deployment/aureus-frontend -n aureus

# Verify new version
kubectl get pods -n aureus -l component=frontend \
  -o jsonpath='{.items[0].spec.containers[0].image}'
```

---

## Rollback Procedures

See [Rollback Runbook](../runbooks/rollback-procedure.md) for detailed procedures.

**Quick Rollback**:
```bash
# Rollback to previous version
kubectl rollout undo deployment/aureus-frontend -n aureus

# Verify rollback
kubectl rollout status deployment/aureus-frontend -n aureus
```

---

## Monitoring & Observability

### Logs

```bash
# View application logs
kubectl logs -n aureus -l component=frontend --tail=100 -f

# View specific pod
kubectl logs -n aureus aureus-frontend-7d5c8d9f4b-abc12 -f

# Export logs for analysis
kubectl logs -n aureus -l component=frontend --tail=10000 \
  > /tmp/aureus-logs-$(date +%Y%m%d-%H%M%S).txt
```

### Metrics

```bash
# View resource usage
kubectl top pods -n aureus -l component=frontend

# View node allocation
kubectl top nodes

# Get detailed pod metrics
kubectl describe pod -n aureus -l component=frontend | grep -A 10 Requests
```

### Alerts

Configure alerts in your monitoring system (Prometheus, Datadog, etc.):

```yaml
# Example Prometheus alert rules
groups:
  - name: aureus_alerts
    rules:
      - alert: AureusHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "AUREUS error rate above 5%"
      
      - alert: AureusHighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "AUREUS p95 latency above 3s SLO"
```

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n aureus -l component=frontend

# Describe pod for events
kubectl describe pod -n aureus <pod-name>

# Check pod logs
kubectl logs -n aureus <pod-name>

# Common issues:
# - Image pull errors: Check image name and registry access
# - CrashLoopBackOff: Check logs for startup errors
# - Pending: Check resource constraints and node availability
```

### Service Not Accessible

```bash
# Check service
kubectl get svc -n aureus aureus-frontend

# Check endpoints
kubectl get endpoints -n aureus aureus-frontend

# Port forward for testing
kubectl port-forward -n aureus svc/aureus-frontend 8080:5000

# Access locally
curl http://localhost:8080/health
```

### Database Connection Issues

```bash
# Check postgres pod
kubectl get pods -n aureus -l component=postgres

# Test connection from frontend
kubectl exec -it -n aureus deployment/aureus-frontend -- \
  curl -v telnet://aureus-postgres:5432

# Check postgres logs
kubectl logs -n aureus -l component=postgres --tail=100
```

### Storage Issues

```bash
# Check PVC status
kubectl get pvc -n aureus

# Check disk usage
kubectl exec -it -n aureus deployment/aureus-frontend -- df -h /app/evidence

# Expand PVC if needed (if storage class supports it)
kubectl patch pvc aureus-evidence-pvc -n aureus \
  -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

---

## Security Considerations

### TLS/SSL Configuration

```bash
# Install cert-manager for automatic TLS
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f k8s/cert-issuer.yaml

# TLS will be automatically provisioned by ingress annotation:
# cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

### Secrets Management

```bash
# Never commit secrets to git!
# Use external secret management:

# Option 1: Kubernetes Secrets (basic)
kubectl create secret generic aureus-secrets --from-env-file=.env -n aureus

# Option 2: HashiCorp Vault (recommended)
# Configure vault injector to inject secrets as files

# Option 3: AWS Secrets Manager / Azure Key Vault
# Use CSI driver to mount secrets
```

### Network Policies

Network policies are included in `k8s/service.yaml` to restrict traffic:
- Frontend can only talk to Postgres, Redis, and external HTTPS
- Ingress only from ingress controller
- Egress only to required services

---

## CI/CD Integration

### Example GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build and push image
        run: |
          docker build -t aureus/frontend:${{ github.sha }} .
          docker push aureus/frontend:${{ github.sha }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/aureus-frontend \
            frontend=aureus/frontend:${{ github.sha }} \
            -n aureus
          kubectl rollout status deployment/aureus-frontend -n aureus
      
      - name: Run smoke tests
        run: ./scripts/deploy-check.sh --environment production
      
      - name: Generate evidence
        run: ./scripts/evidence-export.sh --deployment ${{ github.sha }}
```

---

## Backup & Disaster Recovery

### Database Backups

```bash
# Automated daily backups (configure in postgres deployment)
# Manual backup:
kubectl exec -it -n aureus -l component=postgres -- \
  pg_dump -U aureus aureus_metadata | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore from backup:
gunzip < backup-20240115.sql.gz | \
  kubectl exec -i -n aureus -l component=postgres -- \
  psql -U aureus aureus_metadata
```

### Evidence Backups

```bash
# Export evidence to external storage
./scripts/evidence-export.sh --archive --destination s3://aureus-backups/

# Automated via cron job in cluster
kubectl create cronjob evidence-backup -n aureus \
  --image=aureus/frontend:0.1.0 \
  --schedule="0 2 * * *" \
  --restart=OnFailure \
  -- /scripts/evidence-export.sh --archive
```

---

## References

- [Rollback Procedure](../runbooks/rollback-procedure.md)
- [Incident Response](../runbooks/incident-response.md)
- [Architecture Documentation](../ARCHITECTURE.md)
- [SLO Definitions](./slo-definitions.md)

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Maintained By**: DevOps Team  
**Contact**: devops@example.com
