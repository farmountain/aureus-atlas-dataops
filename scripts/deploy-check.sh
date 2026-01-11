#!/bin/bash
# Pre-deployment validation script for AUREUS Platform
# Verifies environment configuration, dependencies, and readiness before deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${1:-production}"
NAMESPACE="${2:-aureus}"
VERBOSE=${VERBOSE:-false}

# Track validation results
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

echo "========================================"
echo "AUREUS Pre-Deployment Validation"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "========================================"
echo ""

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL_COUNT++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN_COUNT++))
}

info() {
    echo "ℹ $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "=== Prerequisites Check ==="

# Check kubectl
if command_exists kubectl; then
    KUBECTL_VERSION=$(kubectl version --client --short 2>/dev/null | grep -oP 'v\K[0-9.]+' || echo "unknown")
    pass "kubectl installed (version $KUBECTL_VERSION)"
else
    fail "kubectl not found"
fi

# Check docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+\.\d+' || echo "unknown")
    pass "docker installed (version $DOCKER_VERSION)"
else
    fail "docker not found"
fi

# Check helm (optional)
if command_exists helm; then
    HELM_VERSION=$(helm version --short | grep -oP 'v\K[0-9.]+' || echo "unknown")
    pass "helm installed (version $HELM_VERSION)"
else
    warn "helm not found (optional)"
fi

echo ""
echo "=== Kubernetes Cluster Check ==="

# Check cluster connectivity
if kubectl cluster-info >/dev/null 2>&1; then
    pass "Kubernetes cluster accessible"
    CLUSTER_VERSION=$(kubectl version --short 2>/dev/null | grep Server | grep -oP 'v\K[0-9.]+' || echo "unknown")
    info "Cluster version: $CLUSTER_VERSION"
else
    fail "Cannot connect to Kubernetes cluster"
    exit 1
fi

# Check namespace
if kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    pass "Namespace '$NAMESPACE' exists"
else
    warn "Namespace '$NAMESPACE' does not exist - will be created"
fi

# Check node status
NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
READY_NODES=$(kubectl get nodes --no-headers 2>/dev/null | grep -c " Ready " || echo "0")
if [ "$NODE_COUNT" -eq "$READY_NODES" ] && [ "$NODE_COUNT" -gt 0 ]; then
    pass "All $NODE_COUNT nodes are Ready"
else
    warn "$READY_NODES/$NODE_COUNT nodes are Ready"
fi

echo ""
echo "=== Configuration Check ==="

# Check ConfigMaps
if kubectl get configmap aureus-config -n "$NAMESPACE" >/dev/null 2>&1; then
    pass "ConfigMap 'aureus-config' exists"
    
    # Validate required keys
    REQUIRED_KEYS=("app.version" "evidence.retention.days" "audit.enabled")
    for key in "${REQUIRED_KEYS[@]}"; do
        if kubectl get configmap aureus-config -n "$NAMESPACE" -o jsonpath="{.data['$key']}" >/dev/null 2>&1; then
            pass "  ConfigMap key '$key' present"
        else
            warn "  ConfigMap key '$key' missing"
        fi
    done
else
    warn "ConfigMap 'aureus-config' not found - will be created"
fi

# Check Secrets
if kubectl get secret aureus-secrets -n "$NAMESPACE" >/dev/null 2>&1; then
    pass "Secret 'aureus-secrets' exists"
    
    # Validate required secret keys (don't print values!)
    REQUIRED_SECRET_KEYS=("database.password" "redis.password" "jwt.secret")
    for key in "${REQUIRED_SECRET_KEYS[@]}"; do
        if kubectl get secret aureus-secrets -n "$NAMESPACE" -o jsonpath="{.data['$key']}" >/dev/null 2>&1; then
            VALUE=$(kubectl get secret aureus-secrets -n "$NAMESPACE" -o jsonpath="{.data['$key']}" | base64 -d)
            if [ "${#VALUE}" -lt 16 ]; then
                warn "  Secret '$key' is too short (<16 characters)"
            else
                pass "  Secret '$key' present and adequate length"
            fi
        else
            fail "  Secret '$key' missing"
        fi
    done
else
    fail "Secret 'aureus-secrets' not found - must be created before deployment"
fi

echo ""
echo "=== Storage Check ==="

# Check PVC
if kubectl get pvc aureus-evidence-pvc -n "$NAMESPACE" >/dev/null 2>&1; then
    PVC_STATUS=$(kubectl get pvc aureus-evidence-pvc -n "$NAMESPACE" -o jsonpath='{.status.phase}')
    if [ "$PVC_STATUS" == "Bound" ]; then
        pass "PVC 'aureus-evidence-pvc' is Bound"
        PVC_SIZE=$(kubectl get pvc aureus-evidence-pvc -n "$NAMESPACE" -o jsonpath='{.spec.resources.requests.storage}')
        info "  Capacity: $PVC_SIZE"
    else
        warn "PVC 'aureus-evidence-pvc' status: $PVC_STATUS"
    fi
else
    warn "PVC 'aureus-evidence-pvc' not found - will be created"
fi

# Check storage class
STORAGE_CLASS=$(kubectl get pvc aureus-evidence-pvc -n "$NAMESPACE" -o jsonpath='{.spec.storageClassName}' 2>/dev/null || echo "default")
if kubectl get storageclass "$STORAGE_CLASS" >/dev/null 2>&1; then
    pass "StorageClass '$STORAGE_CLASS' exists"
else
    warn "StorageClass '$STORAGE_CLASS' not found"
fi

echo ""
echo "=== Container Image Check ==="

# Check if image exists (for production)
IMAGE_NAME="aureus/frontend:0.1.0"
if [ "$ENVIRONMENT" == "production" ]; then
    info "Checking image: $IMAGE_NAME"
    # Try to pull image metadata (don't actually pull)
    if docker manifest inspect "$IMAGE_NAME" >/dev/null 2>&1; then
        pass "Image '$IMAGE_NAME' exists and is accessible"
    else
        warn "Cannot verify image '$IMAGE_NAME' - may not exist or registry inaccessible"
    fi
fi

echo ""
echo "=== Resource Availability Check ==="

# Check if cluster has enough resources
TOTAL_CPU=$(kubectl top nodes --no-headers 2>/dev/null | awk '{sum+=$3} END {print sum}' || echo "0")
TOTAL_MEMORY=$(kubectl top nodes --no-headers 2>/dev/null | awk '{sum+=$5} END {print sum}' || echo "0")

if [ "$TOTAL_CPU" != "0" ]; then
    info "Cluster CPU usage: ${TOTAL_CPU}m"
    info "Cluster memory usage: ${TOTAL_MEMORY}Mi"
    pass "Resource metrics available"
else
    warn "Cannot retrieve resource metrics (metrics-server may not be installed)"
fi

# Check resource quotas
if kubectl get resourcequota -n "$NAMESPACE" >/dev/null 2>&1; then
    QUOTA_COUNT=$(kubectl get resourcequota -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
    if [ "$QUOTA_COUNT" -gt 0 ]; then
        info "Resource quotas defined for namespace"
        pass "Resource quotas present"
    fi
else
    info "No resource quotas defined (optional)"
fi

echo ""
echo "=== Network Policies Check ==="

# Check if NetworkPolicy CRD exists
if kubectl api-resources | grep -q networkpolicies; then
    pass "NetworkPolicy API available"
    
    # Check if network policy exists
    if kubectl get networkpolicy -n "$NAMESPACE" >/dev/null 2>&1; then
        NP_COUNT=$(kubectl get networkpolicy -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
        if [ "$NP_COUNT" -gt 0 ]; then
            pass "$NP_COUNT network policies defined"
        else
            warn "No network policies defined"
        fi
    fi
else
    warn "NetworkPolicy API not available (CNI may not support it)"
fi

echo ""
echo "=== Security Check ==="

# Check Pod Security Standards
if kubectl get podsecuritypolicy >/dev/null 2>&1; then
    pass "PodSecurityPolicy available"
else
    info "PodSecurityPolicy not available (deprecated in K8s 1.25+)"
fi

# Check RBAC
if kubectl auth can-i create pods -n "$NAMESPACE" >/dev/null 2>&1; then
    pass "RBAC permissions adequate (can create pods)"
else
    fail "Insufficient RBAC permissions to deploy"
fi

# Check ServiceAccount
if kubectl get serviceaccount aureus-frontend -n "$NAMESPACE" >/dev/null 2>&1; then
    pass "ServiceAccount 'aureus-frontend' exists"
else
    warn "ServiceAccount 'aureus-frontend' not found - will be created"
fi

echo ""
echo "=== Dependency Services Check ==="

# Check if postgres is running (if exists)
if kubectl get deployment aureus-postgres -n "$NAMESPACE" >/dev/null 2>&1; then
    POSTGRES_READY=$(kubectl get deployment aureus-postgres -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    POSTGRES_DESIRED=$(kubectl get deployment aureus-postgres -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
    if [ "$POSTGRES_READY" -eq "$POSTGRES_DESIRED" ]; then
        pass "Postgres deployment ready ($POSTGRES_READY/$POSTGRES_DESIRED replicas)"
    else
        warn "Postgres deployment not fully ready ($POSTGRES_READY/$POSTGRES_DESIRED replicas)"
    fi
else
    warn "Postgres deployment not found - ensure database is available"
fi

# Check if redis is running (if exists)
if kubectl get deployment aureus-redis -n "$NAMESPACE" >/dev/null 2>&1; then
    REDIS_READY=$(kubectl get deployment aureus-redis -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    REDIS_DESIRED=$(kubectl get deployment aureus-redis -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
    if [ "$REDIS_READY" -eq "$REDIS_DESIRED" ]; then
        pass "Redis deployment ready ($REDIS_READY/$REDIS_DESIRED replicas)"
    else
        warn "Redis deployment not fully ready ($REDIS_READY/$REDIS_DESIRED replicas)"
    fi
else
    warn "Redis deployment not found - ensure cache is available"
fi

echo ""
echo "=== Pre-Flight Checks (if deployment exists) ==="

# If deployment already exists, check its current state
if kubectl get deployment aureus-frontend -n "$NAMESPACE" >/dev/null 2>&1; then
    info "Existing deployment found"
    
    CURRENT_READY=$(kubectl get deployment aureus-frontend -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    CURRENT_DESIRED=$(kubectl get deployment aureus-frontend -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "3")
    
    if [ "$CURRENT_READY" -eq "$CURRENT_DESIRED" ]; then
        pass "Current deployment healthy ($CURRENT_READY/$CURRENT_DESIRED replicas ready)"
    else
        warn "Current deployment not fully healthy ($CURRENT_READY/$CURRENT_DESIRED replicas ready)"
    fi
    
    # Check recent pod restarts
    RESTART_COUNT=$(kubectl get pods -n "$NAMESPACE" -l component=frontend -o jsonpath='{.items[*].status.containerStatuses[0].restartCount}' 2>/dev/null | awk '{sum=0; for(i=1; i<=NF; i++) sum+=$i; print sum}' || echo "0")
    if [ "$RESTART_COUNT" -lt 5 ]; then
        pass "Low restart count ($RESTART_COUNT total restarts)"
    else
        warn "High restart count ($RESTART_COUNT total restarts) - investigate before deploying"
    fi
else
    info "No existing deployment found (fresh install)"
fi

echo ""
echo "=== Evidence & Audit Check ==="

# Check if evidence directory exists and is writable
if kubectl get deployment aureus-frontend -n "$NAMESPACE" >/dev/null 2>&1; then
    POD_NAME=$(kubectl get pod -n "$NAMESPACE" -l component=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$POD_NAME" ]; then
        if kubectl exec -n "$NAMESPACE" "$POD_NAME" -- test -w /app/evidence 2>/dev/null; then
            pass "Evidence directory writable"
        else
            warn "Evidence directory not writable - check permissions"
        fi
    fi
fi

echo ""
echo "========================================"
echo "Validation Summary"
echo "========================================"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${YELLOW}Warnings: $WARN_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

# Determine overall status
if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo "Please resolve the failures before deploying."
    exit 1
elif [ "$WARN_COUNT" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS${NC}"
    echo "Consider addressing warnings before deploying to production."
    echo ""
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
else
    echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
    echo "Environment is ready for deployment."
fi

echo ""
echo "Next steps:"
echo "  1. Review any warnings above"
echo "  2. Create evidence pack for deployment"
echo "  3. Deploy with: kubectl apply -f k8s/"
echo "  4. Monitor rollout: kubectl rollout status deployment/aureus-frontend -n $NAMESPACE"
echo "  5. Verify with: ./scripts/deploy-check.sh --environment $ENVIRONMENT"
echo ""

exit 0
