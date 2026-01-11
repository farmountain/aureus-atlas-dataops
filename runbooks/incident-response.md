# Incident Response Runbook

## Overview
This runbook provides step-by-step procedures for responding to incidents in the AUREUS Platform.

**Audience**: On-call engineers, SREs, DevOps  
**Last Updated**: 2024-01-15  
**Review Cycle**: Quarterly

---

## Incident Classification

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **P0 - Critical** | Complete service outage affecting all users | 5 minutes | Full platform down, data breach, evidence tampering |
| **P1 - High** | Significant degradation affecting >50% users | 15 minutes | Query service down, approval workflow broken, policy engine failure |
| **P2 - Medium** | Partial degradation affecting <50% users | 1 hour | Slow queries, intermittent timeouts, specific feature broken |
| **P3 - Low** | Minor issues with workarounds | 4 hours | UI glitches, non-critical logging failures |

---

## General Response Process

### 1. Acknowledge & Assess (0-5 minutes)
```bash
# Acknowledge the incident in PagerDuty/incident tool
# Check monitoring dashboards
kubectl get pods -n aureus
kubectl get events -n aureus --sort-by='.lastTimestamp'

# Check application logs
kubectl logs -n aureus -l app=aureus,component=frontend --tail=100

# Check health endpoints
curl https://aureus.example.com/health
```

### 2. Communicate (5-10 minutes)
- Post in #incidents Slack channel
- Update status page if P0/P1
- Notify stakeholders per escalation matrix

**Template:**
```
INCIDENT DETECTED
Severity: [P0/P1/P2/P3]
Component: [frontend/backend/database/policy-engine]
Impact: [description]
Started: [timestamp]
Incident Commander: [@name]
Status Page: [link]
```

### 3. Mitigate (10-30 minutes)
- Execute relevant mitigation playbook (see sections below)
- Capture evidence before making changes
- Document all actions in incident timeline

### 4. Resolve (30+ minutes)
- Verify issue resolved in production
- Monitor for recurrence
- Update status page

### 5. Post-Incident (24-72 hours)
- Conduct blameless postmortem
- Generate evidence pack for audit
- Update runbooks with learnings
- Create action items for prevention

---

## Common Incident Scenarios

### Scenario 1: Frontend Application Down

**Symptoms:**
- Health check failing
- 502/503 errors
- All user requests failing

**Diagnosis:**
```bash
# Check pod status
kubectl get pods -n aureus -l component=frontend

# Check recent events
kubectl describe deployment aureus-frontend -n aureus

# Check container logs
kubectl logs -n aureus -l component=frontend --tail=200
```

**Mitigation:**
```bash
# Option A: Restart pods
kubectl rollout restart deployment/aureus-frontend -n aureus

# Option B: Scale up replicas for quick recovery
kubectl scale deployment/aureus-frontend -n aureus --replicas=5

# Option C: Rollback to previous version
kubectl rollout undo deployment/aureus-frontend -n aureus

# Verify rollout
kubectl rollout status deployment/aureus-frontend -n aureus
```

**Evidence Capture:**
```bash
# Capture logs before restart
kubectl logs -n aureus -l component=frontend --all-containers=true \
  > /tmp/incident-$(date +%Y%m%d-%H%M%S)-frontend-logs.txt

# Capture pod descriptions
kubectl describe pods -n aureus -l component=frontend \
  > /tmp/incident-$(date +%Y%m%d-%H%M%S)-pod-status.txt
```

---

### Scenario 2: Database Connection Issues

**Symptoms:**
- Query timeouts
- "Cannot connect to database" errors
- Slow page loads

**Diagnosis:**
```bash
# Check postgres pod
kubectl get pods -n aureus -l component=postgres

# Check connection from frontend
kubectl exec -it -n aureus deployment/aureus-frontend -- \
  curl postgres://aureus-postgres:5432

# Check postgres logs
kubectl logs -n aureus -l component=postgres --tail=100

# Check connection pool
kubectl exec -it -n aureus -l component=postgres -- \
  psql -U aureus -d aureus_metadata -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

**Mitigation:**
```bash
# Option A: Restart postgres (LAST RESORT - data risk)
kubectl rollout restart statefulset/aureus-postgres -n aureus

# Option B: Kill idle connections
kubectl exec -it -n aureus -l component=postgres -- \
  psql -U aureus -d aureus_metadata -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';"

# Option C: Scale down frontend to reduce connection pressure
kubectl scale deployment/aureus-frontend -n aureus --replicas=1
# Wait for connections to stabilize, then scale back up
kubectl scale deployment/aureus-frontend -n aureus --replicas=3
```

---

### Scenario 3: Evidence Storage Full

**Symptoms:**
- "Disk full" errors
- Evidence packs failing to save
- Pod evictions

**Diagnosis:**
```bash
# Check PVC usage
kubectl get pvc -n aureus

# Check disk usage in pod
kubectl exec -it -n aureus deployment/aureus-frontend -- \
  df -h /app/evidence

# List large files
kubectl exec -it -n aureus deployment/aureus-frontend -- \
  du -sh /app/evidence/* | sort -h
```

**Mitigation:**
```bash
# Option A: Archive old evidence to S3
./scripts/evidence-export.sh --archive --older-than 60d

# Option B: Expand PVC (if supported by storage class)
kubectl patch pvc aureus-evidence-pvc -n aureus \
  -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'

# Option C: Emergency cleanup (requires approval)
# Delete evidence older than retention policy (90 days)
kubectl exec -it -n aureus deployment/aureus-frontend -- \
  find /app/evidence -type f -mtime +90 -delete
```

**Post-Mitigation:**
- Verify evidence retention policy compliance
- Update monitoring alerts for disk usage
- Generate incident evidence pack

---

### Scenario 4: Policy Engine Failure

**Symptoms:**
- All queries blocked
- "Policy check failed" errors
- Approval workflow stuck

**Diagnosis:**
```bash
# Check policy service health (if separate service)
kubectl get pods -n aureus -l component=policy-engine

# Check policy evaluation logs
kubectl logs -n aureus -l component=frontend --tail=100 | grep -i policy

# Test policy evaluation manually
kubectl exec -it -n aureus deployment/aureus-frontend -- \
  curl -X POST http://localhost:5000/api/policy/evaluate \
  -d '{"action":"query","user":"test","dataset":"test"}'
```

**Mitigation:**
```bash
# Option A: Enable policy bypass mode (REQUIRES APPROVAL)
# Only use in extreme P0 situations, requires immediate escalation
kubectl set env deployment/aureus-frontend -n aureus \
  POLICY_BYPASS_MODE=true \
  POLICY_BYPASS_APPROVER="[INCIDENT_COMMANDER_NAME]"

# Generate emergency bypass evidence
echo "Policy bypass enabled at $(date) by [IC] for incident [ID]" | \
  kubectl exec -i -n aureus deployment/aureus-frontend -- \
  tee /app/evidence/emergency-bypass-$(date +%Y%m%d-%H%M%S).log

# Option B: Restart policy cache
kubectl exec -it -n aureus -l component=redis -- \
  redis-cli -a $REDIS_PASSWORD FLUSHDB

# Option C: Reload policies from config
kubectl rollout restart deployment/aureus-frontend -n aureus
```

**CRITICAL**: Policy bypass must be:
1. Approved by incident commander + security team
2. Documented with evidence pack
3. Reverted within 1 hour
4. Reviewed in postmortem

---

### Scenario 5: Rate Limiting False Positives

**Symptoms:**
- Legitimate users blocked
- "Rate limit exceeded" errors
- Spike in support tickets

**Diagnosis:**
```bash
# Check rate limit events in logs
kubectl logs -n aureus -l component=frontend --tail=500 | grep "rate.*limit"

# Check specific user's rate limit status
# (requires accessing Redis or application logs)
kubectl exec -it -n aureus -l component=redis -- \
  redis-cli -a $REDIS_PASSWORD KEYS "ratelimit:*"
```

**Mitigation:**
```bash
# Option A: Temporarily increase limits (requires approval)
kubectl set env deployment/aureus-frontend -n aureus \
  RATE_LIMIT_QUERY=20 \
  RATE_LIMIT_DEPLOY=10

# Option B: Clear rate limit for specific user
# (implement in application, not directly in Redis)

# Option C: Disable rate limiting temporarily (LAST RESORT)
kubectl set env deployment/aureus-frontend -n aureus \
  RATE_LIMITING_ENABLED=false

# Record decision in evidence
echo "Rate limiting adjusted at $(date) - Incident [ID]" | \
  kubectl exec -i -n aureus deployment/aureus-frontend -- \
  tee /app/evidence/rate-limit-adjustment-$(date +%Y%m%d-%H%M%S).log
```

---

## Escalation Matrix

| Incident Type | Primary Contact | Secondary Contact | Executive |
|---------------|----------------|-------------------|-----------|
| Platform Outage (P0) | On-call SRE | Engineering Lead | CTO |
| Security Breach (P0) | Security Team | CISO | CTO + Legal |
| Data Loss (P0) | Database Admin | Engineering Lead | CTO + Compliance |
| Policy Failure (P1) | Governance Lead | Security Team | Chief Risk Officer |
| Performance Degradation (P1/P2) | On-call SRE | Engineering Lead | - |

**Contact Methods:**
- Slack: #incidents, #security-incidents
- PagerDuty: Automated escalation
- Phone: Use emergency contact list (in secure vault)

---

## Evidence Requirements

**All incidents must generate evidence packs containing:**
1. Incident timeline with all actions
2. Logs captured before/during/after incident
3. Configuration changes made
4. Approval records for emergency actions
5. Impact assessment
6. Root cause analysis (post-incident)

**Evidence Storage:**
```bash
/app/evidence/incidents/[INCIDENT-ID]/
├── timeline.md
├── logs/
│   ├── frontend-[timestamp].log
│   ├── database-[timestamp].log
│   └── events-[timestamp].log
├── changes.json
├── approvals.json
├── impact-assessment.md
└── rca.md (added after postmortem)
```

---

## Post-Incident Checklist

- [ ] Incident resolved and verified in production
- [ ] Status page updated to "Resolved"
- [ ] Evidence pack generated and stored
- [ ] Postmortem scheduled (within 48 hours for P0/P1)
- [ ] Incident timeline reviewed and finalized
- [ ] Action items created in issue tracker
- [ ] Runbook updated with learnings
- [ ] Team debriefed
- [ ] Stakeholders notified of resolution

---

## Testing & Validation

**Runbook Testing Schedule:**
- P0 scenarios: Monthly fire drills
- P1 scenarios: Quarterly tabletop exercises
- P2/P3 scenarios: Annual review

**Last Tested:** [DATE]  
**Next Test Due:** [DATE]

---

## References
- [Rollback Procedure](./rollback-procedure.md)
- [Audit Evidence Retrieval](./audit-evidence-retrieval.md)
- [Deployment Guide](../docs/deployment-guide.md)
- [Architecture Documentation](../ARCHITECTURE.md)
