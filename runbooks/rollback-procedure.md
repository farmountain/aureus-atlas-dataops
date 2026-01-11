# Rollback Procedure Runbook

## Overview
This runbook provides step-by-step procedures for rolling back deployments and reverting configuration changes in the AUREUS Platform.

**Critical**: All rollbacks must be audited and evidence-backed per CONTROL EDIT principles.

**Audience**: SREs, DevOps, Release Managers  
**Last Updated**: 2024-01-15  
**Review Cycle**: Quarterly

---

## Pre-Rollback Checklist

Before initiating any rollback:

- [ ] **Identify the problematic change**: Deployment version, config change, policy update
- [ ] **Assess impact**: Users affected, data at risk, business impact
- [ ] **Capture current state**: Logs, metrics, error messages
- [ ] **Get approval** (if not P0 emergency): From change approver or incident commander
- [ ] **Notify stakeholders**: Post in #deployments channel
- [ ] **Create evidence pack**: Document reason for rollback

---

## Rollback Types

### 1. Application Deployment Rollback

#### Kubernetes Deployment Rollback

**When to use**: Bad code deployment, breaking changes, performance regression

**Quick Rollback (Emergency P0):**
```bash
# Immediately rollback to previous version
kubectl rollout undo deployment/aureus-frontend -n aureus

# Verify rollback status
kubectl rollout status deployment/aureus-frontend -n aureus

# Check pod versions
kubectl get pods -n aureus -l component=frontend \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}'
```

**Controlled Rollback (P1/P2):**
```bash
# View deployment history
kubectl rollout history deployment/aureus-frontend -n aureus

# Example output:
# REVISION  CHANGE-CAUSE
# 1         Initial deployment
# 2         Update to v0.1.1
# 3         Update to v0.1.2 (current - problematic)

# Rollback to specific revision
kubectl rollout undo deployment/aureus-frontend -n aureus --to-revision=2

# Monitor rollback progress
kubectl rollout status deployment/aureus-frontend -n aureus --watch

# Verify health
kubectl get pods -n aureus -l component=frontend
curl https://aureus.example.com/health
```

**Evidence Capture:**
```bash
# Create evidence directory
ROLLBACK_ID="rollback-$(date +%Y%m%d-%H%M%S)"
mkdir -p /tmp/$ROLLBACK_ID

# Capture deployment state before rollback
kubectl describe deployment aureus-frontend -n aureus > /tmp/$ROLLBACK_ID/deployment-before.txt
kubectl get pods -n aureus -l component=frontend -o yaml > /tmp/$ROLLBACK_ID/pods-before.yaml

# Capture logs from problematic version
kubectl logs -n aureus -l component=frontend --all-containers=true \
  --tail=1000 > /tmp/$ROLLBACK_ID/logs-before-rollback.txt

# After rollback: capture success state
kubectl describe deployment aureus-frontend -n aureus > /tmp/$ROLLBACK_ID/deployment-after.txt
kubectl get pods -n aureus -l component=frontend -o yaml > /tmp/$ROLLBACK_ID/pods-after.yaml

# Create rollback manifest
cat > /tmp/$ROLLBACK_ID/rollback-manifest.json <<EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "component": "frontend",
  "from_version": "v0.1.2",
  "to_version": "v0.1.1",
  "reason": "Breaking UI changes affecting user workflows",
  "approver": "$USER",
  "incident_id": "INC-12345",
  "verification": {
    "health_check": "passed",
    "smoke_tests": "passed",
    "user_validation": "pending"
  }
}
EOF

# Archive evidence
tar -czf /tmp/$ROLLBACK_ID.tar.gz -C /tmp $ROLLBACK_ID
# Upload to evidence storage
kubectl cp /tmp/$ROLLBACK_ID.tar.gz \
  aureus/$(kubectl get pod -n aureus -l component=frontend -o jsonpath='{.items[0].metadata.name}'):/app/evidence/rollbacks/
```

---

### 2. Configuration Rollback

#### ConfigMap/Secret Rollback

**When to use**: Bad configuration, wrong environment variables, invalid settings

**Procedure:**
```bash
# View ConfigMap history (if versioned)
kubectl get configmap aureus-config -n aureus -o yaml > /tmp/current-config.yaml

# Restore from backup (created during deployment)
kubectl apply -f /path/to/configmap-backup-v0.1.1.yaml

# Or edit directly to revert specific values
kubectl edit configmap aureus-config -n aureus

# Restart pods to pick up new config
kubectl rollout restart deployment/aureus-frontend -n aureus

# Verify config applied
kubectl exec -n aureus deployment/aureus-frontend -- env | grep -i aureus
```

**Evidence Capture:**
```bash
ROLLBACK_ID="config-rollback-$(date +%Y%m%d-%H%M%S)"

# Capture before/after configs
kubectl get configmap aureus-config -n aureus -o yaml > /tmp/$ROLLBACK_ID-before.yaml
# ... perform rollback ...
kubectl get configmap aureus-config -n aureus -o yaml > /tmp/$ROLLBACK_ID-after.yaml

# Diff the changes
diff -u /tmp/$ROLLBACK_ID-before.yaml /tmp/$ROLLBACK_ID-after.yaml \
  > /tmp/$ROLLBACK_ID-diff.txt

# Create evidence manifest
cat > /tmp/$ROLLBACK_ID-manifest.json <<EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "component": "configuration",
  "config_type": "ConfigMap",
  "changed_keys": ["evidence.retention.days", "ratelimit.query.limit"],
  "reason": "Incorrect retention policy causing compliance issue",
  "approver": "$USER"
}
EOF
```

---

### 3. Database Schema Rollback

**When to use**: Bad migration, schema changes causing errors

**CRITICAL**: Database rollbacks are HIGH RISK. Always:
1. Take full backup before rollback
2. Get DBA + Engineering Lead approval
3. Test rollback in staging first
4. Have recovery plan ready

**Procedure:**
```bash
# 1. Create backup
kubectl exec -it -n aureus -l component=postgres -- \
  pg_dump -U aureus aureus_metadata > /tmp/pre-rollback-backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Identify migration to rollback
# (Assuming you use a migration tool like Alembic, Flyway, or custom)
kubectl exec -it -n aureus -l component=postgres -- \
  psql -U aureus -d aureus_metadata -c \
  "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# 3. Run rollback migration
# Example for Alembic:
kubectl exec -it -n aureus deployment/aureus-backend -- \
  alembic downgrade -1

# Example for Flyway:
kubectl exec -it -n aureus deployment/aureus-backend -- \
  flyway undo

# 4. Verify schema state
kubectl exec -it -n aureus -l component=postgres -- \
  psql -U aureus -d aureus_metadata -c "\dt"

# 5. Test application functionality
curl https://aureus.example.com/api/health/db
```

**Evidence Capture:**
```bash
ROLLBACK_ID="db-rollback-$(date +%Y%m%d-%H%M%S)"

# Schema dump before rollback
kubectl exec -it -n aureus -l component=postgres -- \
  pg_dump -U aureus -s aureus_metadata > /tmp/$ROLLBACK_ID-schema-before.sql

# Data integrity checks
kubectl exec -it -n aureus -l component=postgres -- \
  psql -U aureus -d aureus_metadata -c \
  "SELECT tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables;" \
  > /tmp/$ROLLBACK_ID-row-counts.txt

# After rollback
kubectl exec -it -n aureus -l component=postgres -- \
  pg_dump -U aureus -s aureus_metadata > /tmp/$ROLLBACK_ID-schema-after.sql

# Manifest
cat > /tmp/$ROLLBACK_ID-manifest.json <<EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "component": "database",
  "migration_reverted": "v0.1.2-add-pii-tracking-table",
  "backup_location": "/backups/$ROLLBACK_ID-backup.sql",
  "data_loss": "none",
  "downtime": "5 minutes",
  "approver": "$USER",
  "dba_approval": "john.dba@example.com"
}
EOF
```

---

### 4. Policy Rollback

**When to use**: Policy change blocking legitimate operations, misconfigured governance rules

**Procedure:**
```bash
# 1. Identify current policy version
kubectl exec -n aureus deployment/aureus-frontend -- \
  cat /app/policies/policy-manifest.json

# 2. Retrieve previous policy version from KV store or git
# (Assuming policies versioned in git)
cd /path/to/policy-repo
git log --oneline policies/ | head -5
git show HEAD~1:policies/pii-access-policy.rego > /tmp/previous-policy.rego

# 3. Apply previous policy
kubectl create configmap aureus-policies -n aureus \
  --from-file=/tmp/previous-policy.rego \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Restart policy evaluation service
kubectl rollout restart deployment/aureus-frontend -n aureus

# 5. Verify policy rollback
# Test a previously blocked action should now work
curl -X POST https://aureus.example.com/api/query \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question":"test query","dataset":"test_dataset"}'
```

**Evidence Capture:**
```bash
ROLLBACK_ID="policy-rollback-$(date +%Y%m%d-%H%M%S)"

# Capture policy diff
git diff HEAD~1 HEAD policies/ > /tmp/$ROLLBACK_ID-policy-diff.txt

# Document reason
cat > /tmp/$ROLLBACK_ID-manifest.json <<EOF
{
  "rollback_id": "$ROLLBACK_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "component": "policy-engine",
  "policy_name": "pii-access-requires-approval",
  "from_version": "v2.1",
  "to_version": "v2.0",
  "reason": "New policy blocking analysts from routine low-PII queries",
  "approver": "governance.lead@example.com",
  "security_review": "approved",
  "affected_users": 45
}
EOF

# Audit trail
kubectl exec -n aureus deployment/aureus-frontend -- \
  sh -c "echo '{\"event\":\"policy_rollback\",\"policy\":\"pii-access-requires-approval\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"actor\":\"$USER\"}' >> /app/evidence/audit.log"
```

---

### 5. Application State Rollback (using AUREUS Snapshots)

**When to use**: Bad data modification, corrupted state, accidental deletions

**AUREUS Guard Snapshots** are automatically created for:
- Dataset onboarding
- Pipeline deployments
- Policy changes
- Approval decisions

**Procedure:**
```bash
# 1. List available snapshots
# (Via UI: Approvals tab → Snapshots viewer)
# (Via API):
curl -X GET https://aureus.example.com/api/snapshots \
  -H "Authorization: Bearer $TOKEN"

# Example response:
# {
#   "snapshots": [
#     {
#       "id": "snap-20240115-103045",
#       "timestamp": "2024-01-15T10:30:45Z",
#       "state_type": "pipeline_deployment",
#       "description": "Before deploying credit_risk_pipeline_v2"
#     },
#     ...
#   ]
# }

# 2. Review snapshot contents
curl -X GET https://aureus.example.com/api/snapshots/snap-20240115-103045 \
  -H "Authorization: Bearer $TOKEN"

# 3. Initiate rollback (requires approval)
curl -X POST https://aureus.example.com/api/rollback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "snapshot_id": "snap-20240115-103045",
    "reason": "Corrupted pipeline configuration",
    "approver": "engineering.lead@example.com"
  }'

# 4. Verify rollback success
curl -X GET https://aureus.example.com/api/pipelines/credit_risk_pipeline_v2 \
  -H "Authorization: Bearer $TOKEN"
```

**Evidence Capture:**
Evidence is automatically generated by AUREUS Guard:
- Snapshot manifest (before state)
- Rollback action audit event
- Post-rollback verification
- Stored in `/app/evidence/rollbacks/[ROLLBACK-ID]/`

---

## Verification Checklist

After any rollback, verify:

- [ ] **Health checks passing**: All pods healthy, services responding
- [ ] **Smoke tests passing**: Critical user workflows functional
- [ ] **Metrics normal**: Latency, error rates, throughput within SLOs
- [ ] **Logs clean**: No error spikes, exceptions, or warnings
- [ ] **User validation**: At least one real user confirms fix (for P0/P1)
- [ ] **Evidence captured**: All rollback artifacts stored and auditable
- [ ] **Approval recorded**: Rollback approver documented
- [ ] **Incident updated**: Status reflects rollback completion

**Smoke Test Commands:**
```bash
# Frontend health
curl -f https://aureus.example.com/health || echo "FAILED"

# API health
curl -f https://aureus.example.com/api/health || echo "FAILED"

# Database connectivity
kubectl exec -it -n aureus deployment/aureus-frontend -- \
  curl -f http://aureus-postgres:5432 || echo "FAILED"

# Policy engine
curl -X POST https://aureus.example.com/api/policy/evaluate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"query","user":"test"}' || echo "FAILED"

# Query execution (end-to-end test)
curl -X POST https://aureus.example.com/api/query \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question":"Show total loan count","dataset":"credit_risk"}' || echo "FAILED"
```

---

## Rollback Approval Matrix

| Rollback Type | Auto-Approved | Requires Approval | Emergency Override |
|---------------|---------------|-------------------|-------------------|
| Deployment (last version) | ✅ On-call engineer | ❌ | ✅ P0 incidents only |
| Deployment (older version) | ❌ | ✅ Engineering Lead | ✅ P0 incidents only |
| Configuration | ❌ | ✅ DevOps Lead | ✅ P0 incidents only |
| Database | ❌ | ✅ DBA + Engineering Lead | ✅ P0 + CTO approval |
| Policy | ❌ | ✅ Governance Lead + Security | ✅ P0 + CISO approval |
| State (AUREUS snapshot) | ❌ | ✅ Data Owner + Approver | ✅ P0 + Engineering Lead |

**Emergency Override**: Only for P0 incidents. Requires:
1. Incident Commander declaration
2. Documented in evidence pack
3. Post-incident review mandatory
4. Approval retroactively obtained within 4 hours

---

## Rollback Failure Scenarios

### If rollback fails:

1. **STOP**: Do not attempt further rollbacks without escalation
2. **Escalate**: Page Engineering Lead + On-call SRE
3. **Preserve state**: Capture all current logs and state before any action
4. **Assess options**:
   - Can we fix forward instead?
   - Do we need database restore from backup?
   - Do we need to fail over to DR environment?
5. **Document**: All attempts, failures, and decisions

### Database Restore from Backup (Last Resort)

```bash
# 1. Identify most recent backup
ls -lht /backups/postgres/ | head -5

# 2. Stop application (prevent writes during restore)
kubectl scale deployment/aureus-frontend -n aureus --replicas=0

# 3. Restore database
kubectl exec -it -n aureus -l component=postgres -- \
  psql -U aureus -d postgres -c "DROP DATABASE IF EXISTS aureus_metadata;"
kubectl exec -it -n aureus -l component=postgres -- \
  psql -U aureus -d postgres -c "CREATE DATABASE aureus_metadata;"
kubectl exec -i -n aureus -l component=postgres -- \
  psql -U aureus -d aureus_metadata < /backups/postgres/backup-20240115.sql

# 4. Verify restore
kubectl exec -it -n aureus -l component=postgres -- \
  psql -U aureus -d aureus_metadata -c "SELECT COUNT(*) FROM datasets;"

# 5. Restart application
kubectl scale deployment/aureus-frontend -n aureus --replicas=3

# 6. CRITICAL: Assess data loss
# Compare backup timestamp to current time
# Identify and communicate lost transactions
```

---

## Post-Rollback Actions

- [ ] Update incident timeline with rollback completion
- [ ] Notify stakeholders of service restoration
- [ ] Update status page to "Monitoring" or "Resolved"
- [ ] Archive evidence pack to permanent storage
- [ ] Schedule postmortem within 48 hours
- [ ] Create action items:
  - [ ] Fix root cause
  - [ ] Add rollback test to CI/CD
  - [ ] Update runbook with learnings
  - [ ] Improve monitoring/alerting to detect earlier

---

## References
- [Incident Response Runbook](./incident-response.md)
- [Audit Evidence Retrieval](./audit-evidence-retrieval.md)
- [Deployment Guide](../docs/deployment-guide.md)
- [AUREUS Guard Documentation](../CONTROL_EDIT_SUMMARY.md)

---

**Last Tested**: [DATE]  
**Next Test Due**: [DATE]  
**Test Status**: Rollback procedures should be tested quarterly with fire drills.
