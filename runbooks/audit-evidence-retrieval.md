# Audit Evidence Retrieval Runbook

## Overview
This runbook provides procedures for retrieving, exporting, and presenting audit evidence from the AUREUS Platform for regulatory inquiries, compliance audits, and incident investigations.

**Audience**: Compliance Officers, Auditors, Security Team, Legal  
**Last Updated**: 2024-01-15  
**Review Cycle**: Quarterly

---

## Evidence Types

AUREUS Platform generates and stores multiple types of evidence:

| Evidence Type | Location | Retention | Format |
|---------------|----------|-----------|--------|
| **Audit Logs** | `/app/evidence/audit/` | 7 years | JSON, CSV |
| **Query History** | KV Store + Postgres | 3 years | JSON |
| **Policy Decisions** | `/app/evidence/policy/` | 5 years | JSON |
| **Approval Records** | `/app/evidence/approvals/` | 7 years | JSON, PDF |
| **Snapshots** | `/app/evidence/snapshots/` | 1 year | JSON |
| **Deployment Evidence** | `/app/evidence/deployments/` | 3 years | JSON, Markdown |
| **Incident Evidence** | `/app/evidence/incidents/` | 5 years | Multi-format |
| **Config Changes** | Git + `/app/evidence/config/` | 5 years | YAML, JSON |

---

## Quick Reference Commands

### Export All Evidence for Date Range
```bash
./scripts/evidence-export.sh \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --output /tmp/evidence-export-jan2024.tar.gz
```

### Search for Specific User Activity
```bash
./scripts/evidence-export.sh \
  --user john.analyst@example.com \
  --start-date 2024-01-01 \
  --output /tmp/evidence-user-john.tar.gz
```

### Export Evidence for Specific Dataset
```bash
./scripts/evidence-export.sh \
  --dataset credit_card_transactions \
  --include-lineage \
  --output /tmp/evidence-credit-cards.tar.gz
```

### Generate Compliance Report
```bash
./scripts/evidence-export.sh \
  --report-type compliance \
  --start-date 2024-01-01 \
  --end-date 2024-12-31 \
  --format pdf \
  --output /tmp/compliance-report-2024.pdf
```

---

## Detailed Retrieval Procedures

### 1. Retrieve Audit Logs

**Use Case**: Regulatory audit, security investigation, compliance review

**Kubernetes Environment:**
```bash
# List all audit log files
kubectl exec -n aureus deployment/aureus-frontend -- \
  ls -lh /app/evidence/audit/

# Download specific date range
kubectl exec -n aureus deployment/aureus-frontend -- \
  find /app/evidence/audit/ -name "audit-2024-01-*.json" \
  -exec cat {} \; > /tmp/audit-logs-jan2024.json

# Copy entire audit directory
kubectl cp aureus/$(kubectl get pod -n aureus -l component=frontend -o jsonpath='{.items[0].metadata.name}'):/app/evidence/audit \
  /tmp/audit-logs-export

# Search for specific events
kubectl exec -n aureus deployment/aureus-frontend -- \
  grep -r "john.analyst@example.com" /app/evidence/audit/ \
  > /tmp/audit-user-activity.txt
```

**Docker Compose Environment:**
```bash
# Access evidence volume
docker exec aureus-frontend ls -lh /app/evidence/audit/

# Copy audit logs
docker cp aureus-frontend:/app/evidence/audit /tmp/audit-logs-export

# Search within container
docker exec aureus-frontend grep -r "credit_card_transactions" /app/evidence/audit/
```

**Evidence Structure:**
```json
{
  "id": "audit-20240115-103045-abc123",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "event_type": "query_execution",
  "actor": {
    "user_id": "john.analyst@example.com",
    "role": "analyst",
    "ip_address": "10.0.1.45",
    "session_id": "sess-xyz789"
  },
  "action": {
    "type": "query",
    "intent": {
      "question": "Show total loan balance by risk rating",
      "datasets": ["credit_risk_loans"],
      "pii_level": "low"
    },
    "sql_generated": "SELECT risk_rating, SUM(outstanding_balance) FROM credit_risk_loans GROUP BY risk_rating;",
    "execution_time_ms": 234
  },
  "policy_checks": [
    {
      "policy_name": "pii-access-requires-approval",
      "result": "allow",
      "reason": "Query does not access high-PII fields"
    }
  ],
  "outcome": "success",
  "results_summary": {
    "rows_returned": 5,
    "columns": ["risk_rating", "total_balance"]
  },
  "evidence_ref": "evd-20240115-103045"
}
```

---

### 2. Retrieve Approval Records

**Use Case**: Governance review, compliance audit, change management verification

**Query Approval History:**
```bash
# List all approvals
kubectl exec -n aureus deployment/aureus-frontend -- \
  ls -lh /app/evidence/approvals/

# Get approvals for specific time period
kubectl exec -n aureus deployment/aureus-frontend -- \
  find /app/evidence/approvals/ -name "approval-2024-01-*.json" \
  -exec cat {} \; | jq '.' > /tmp/approvals-jan2024.json

# Filter by approver
kubectl exec -n aureus deployment/aureus-frontend -- \
  grep -l "approver.*risk.lead@example.com" /app/evidence/approvals/*.json \
  -exec cat {} \; > /tmp/approvals-by-risk-lead.json

# Get rejected requests
kubectl exec -n aureus deployment/aureus-frontend -- \
  grep -l '"status":"rejected"' /app/evidence/approvals/*.json \
  -exec cat {} \; > /tmp/rejected-approvals.json
```

**Approval Evidence Structure:**
```json
{
  "approval_id": "apr-20240115-103045",
  "timestamp": "2024-01-15T10:30:45Z",
  "request": {
    "type": "pipeline_deployment",
    "requester": "john.analyst@example.com",
    "risk_level": "high",
    "description": "Deploy credit risk scoring pipeline to production",
    "affects": {
      "datasets": ["credit_applications", "customer_credit_history"],
      "environment": "production"
    }
  },
  "evidence_pack": {
    "sql_code": "...",
    "unit_tests": ["test_credit_score_calculation", "test_null_handling"],
    "dq_checks": ["completeness_check", "range_validation"],
    "policy_checks": [
      {
        "policy": "prod-deploy-requires-approval",
        "result": "requires_approval"
      }
    ],
    "snapshot_id": "snap-20240115-103040"
  },
  "decision": {
    "status": "approved",
    "approver": "risk.lead@example.com",
    "timestamp": "2024-01-15T11:15:30Z",
    "comment": "Reviewed code and tests. Approved for deployment.",
    "conditions": ["Deploy during maintenance window", "Monitor for 24 hours"]
  },
  "execution": {
    "deployed_at": "2024-01-15T22:00:00Z",
    "deployed_by": "deployment-automation",
    "snapshot_created": "snap-20240115-220000",
    "verification": "passed"
  }
}
```

---

### 3. Retrieve Policy Decision Evidence

**Use Case**: Policy effectiveness review, access control audit, governance assessment

**Query Policy Decisions:**
```bash
# Get all policy evaluations for date range
kubectl exec -n aureus deployment/aureus-frontend -- \
  find /app/evidence/policy/ -name "policy-2024-01-*.json" \
  -exec cat {} \; > /tmp/policy-decisions-jan2024.json

# Get blocked actions
kubectl exec -n aureus deployment/aureus-frontend -- \
  grep -l '"result":"block"' /app/evidence/policy/*.json \
  -exec cat {} \; > /tmp/blocked-actions.json

# Get policy violations by type
kubectl exec -n aureus deployment/aureus-frontend -- \
  grep -h '"policy_name":"pii-access-requires-approval"' /app/evidence/policy/*.json \
  | jq '.' > /tmp/pii-access-policy-decisions.json

# Count policy decisions by result
kubectl exec -n aureus deployment/aureus-frontend -- \
  cat /app/evidence/policy/*.json | \
  jq -r '.result' | sort | uniq -c
```

---

### 4. Retrieve Query History

**Use Case**: Data lineage, usage analytics, access audit

**From KV Store (Application Level):**
```bash
# Via UI: Query tab → History → Export
# Via API:
curl -X GET https://aureus.example.com/api/query-history \
  -H "Authorization: Bearer $TOKEN" \
  -d "start_date=2024-01-01&end_date=2024-01-31" \
  > /tmp/query-history-jan2024.json

# Filter by user
curl -X GET https://aureus.example.com/api/query-history \
  -H "Authorization: Bearer $TOKEN" \
  -d "user=john.analyst@example.com" \
  > /tmp/query-history-john.json

# Filter by dataset
curl -X GET https://aureus.example.com/api/query-history \
  -H "Authorization: Bearer $TOKEN" \
  -d "dataset=credit_card_transactions" \
  > /tmp/query-history-credit-cards.json
```

**From Postgres (Backend):**
```bash
# Connect to database
kubectl exec -it -n aureus -l component=postgres -- \
  psql -U aureus -d aureus_metadata

# Query history table
SELECT 
  query_id, 
  timestamp, 
  user_email, 
  question, 
  datasets_accessed, 
  execution_time_ms,
  outcome
FROM query_history
WHERE timestamp BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY timestamp DESC;

# Export to CSV
\copy (SELECT * FROM query_history WHERE timestamp BETWEEN '2024-01-01' AND '2024-01-31') TO '/tmp/query-history.csv' CSV HEADER;
```

---

### 5. Retrieve Snapshot Evidence

**Use Case**: Change verification, rollback investigation, state audit

**List Snapshots:**
```bash
# List all snapshots
kubectl exec -n aureus deployment/aureus-frontend -- \
  ls -lh /app/evidence/snapshots/

# Get snapshot metadata
kubectl exec -n aureus deployment/aureus-frontend -- \
  cat /app/evidence/snapshots/snap-20240115-103045.json | jq '.'

# Get snapshots for specific action
kubectl exec -n aureus deployment/aureus-frontend -- \
  grep -l '"action_type":"pipeline_deployment"' /app/evidence/snapshots/*.json \
  -exec cat {} \; > /tmp/pipeline-deployment-snapshots.json
```

**Snapshot Structure:**
```json
{
  "snapshot_id": "snap-20240115-103045",
  "timestamp": "2024-01-15T10:30:45Z",
  "action_type": "pipeline_deployment",
  "actor": "john.analyst@example.com",
  "state_before": {
    "pipeline_config": {...},
    "version": "v1.0",
    "active_dq_rules": [...]
  },
  "change_description": "Deploy credit risk pipeline v2.0",
  "rollback_procedure": "kubectl rollout undo deployment/credit-risk-pipeline",
  "approval_id": "apr-20240115-103040"
}
```

---

### 6. Retrieve Incident Evidence

**Use Case**: Postmortem, regulatory inquiry, security investigation

**Get Incident Evidence Pack:**
```bash
# List incidents
kubectl exec -n aureus deployment/aureus-frontend -- \
  ls -lh /app/evidence/incidents/

# Download specific incident
kubectl cp aureus/$(kubectl get pod -n aureus -l component=frontend -o jsonpath='{.items[0].metadata.name}'):/app/evidence/incidents/INC-12345 \
  /tmp/incident-INC-12345

# Contents:
ls -lh /tmp/incident-INC-12345/
# timeline.md
# logs/
# changes.json
# approvals.json
# impact-assessment.md
# rca.md
```

---

## Evidence Export Script Usage

The `evidence-export.sh` script provides a unified interface for evidence retrieval.

### Basic Usage

```bash
./scripts/evidence-export.sh [OPTIONS]

Options:
  --start-date YYYY-MM-DD    Start date for evidence range (required)
  --end-date YYYY-MM-DD      End date for evidence range (required)
  --output PATH              Output file path (required)
  --user EMAIL               Filter by user email
  --dataset NAME             Filter by dataset name
  --event-type TYPE          Filter by event type (query, approval, deployment, policy)
  --format FORMAT            Output format: json, csv, pdf (default: json)
  --include-lineage          Include data lineage information
  --include-attachments      Include binary attachments (logs, screenshots)
  --compress                 Compress output (default: true)
  --encrypt                  Encrypt output with GPG (requires key)
  --report-type TYPE         Generate report: compliance, security, usage
  --help                     Show help message
```

### Examples

**1. Export All Evidence for Month:**
```bash
./scripts/evidence-export.sh \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --output /tmp/evidence-jan2024.tar.gz \
  --compress
```

**2. Export User Activity (Security Investigation):**
```bash
./scripts/evidence-export.sh \
  --user john.analyst@example.com \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --event-type all \
  --include-lineage \
  --output /tmp/investigation-john.tar.gz
```

**3. Export Dataset Access Records (Compliance Audit):**
```bash
./scripts/evidence-export.sh \
  --dataset credit_card_transactions \
  --start-date 2023-01-01 \
  --end-date 2023-12-31 \
  --event-type query \
  --format csv \
  --output /tmp/credit-card-access-audit-2023.csv
```

**4. Generate Annual Compliance Report:**
```bash
./scripts/evidence-export.sh \
  --report-type compliance \
  --start-date 2023-01-01 \
  --end-date 2023-12-31 \
  --format pdf \
  --include-attachments \
  --output /tmp/compliance-report-2023.pdf
```

**5. Export Encrypted Evidence for Legal:**
```bash
./scripts/evidence-export.sh \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --output /tmp/evidence-legal.tar.gz.gpg \
  --encrypt \
  --compress
```

---

## Data Lineage Retrieval

**Use Case**: Understand data flow, impact analysis, compliance verification

### Query Lineage for Dataset

```bash
# Via API
curl -X GET https://aureus.example.com/api/lineage/dataset/credit_risk_loans \
  -H "Authorization: Bearer $TOKEN" \
  > /tmp/lineage-credit-risk-loans.json

# Example response shows:
# - Source datasets
# - Transformations applied
# - Downstream consumers
# - PII propagation
# - Jurisdictional boundaries crossed
```

### Query Lineage for Specific Query

```bash
# Get lineage for specific query execution
curl -X GET https://aureus.example.com/api/lineage/query/qry-20240115-103045 \
  -H "Authorization: Bearer $TOKEN" \
  > /tmp/lineage-query.json
```

---

## Compliance Report Generation

### SOC 2 Audit Report

```bash
./scripts/evidence-export.sh \
  --report-type soc2 \
  --start-date 2023-07-01 \
  --end-date 2024-06-30 \
  --format pdf \
  --output /tmp/soc2-audit-report-fy2024.pdf

# Report includes:
# - Access control evidence (who accessed what, when)
# - Change management records (approvals, rollbacks)
# - Incident response evidence
# - Policy compliance metrics
# - Availability SLO evidence
```

### GDPR Data Access Request

```bash
# Export all data for specific user (right to access)
./scripts/evidence-export.sh \
  --user customer@example.com \
  --start-date 2020-01-01 \
  --end-date 2024-01-31 \
  --event-type all \
  --include-lineage \
  --format pdf \
  --output /tmp/gdpr-data-access-customer.pdf
```

### Regulatory Inquiry Response

```bash
# Export evidence for specific dataset over time period
./scripts/evidence-export.sh \
  --dataset suspicious_activity_reports \
  --start-date 2023-01-01 \
  --end-date 2023-12-31 \
  --event-type all \
  --include-attachments \
  --format json \
  --output /tmp/regulatory-inquiry-sar-2023.tar.gz
```

---

## Evidence Verification

All evidence includes cryptographic signatures for tamper detection.

### Verify Evidence Integrity

```bash
# Verify evidence pack signature
./scripts/verify-evidence.sh /tmp/evidence-export.tar.gz

# Output:
# ✓ Evidence pack signature valid
# ✓ All files checksum verified
# ✓ Timestamp chain intact
# ✓ No tampering detected
# Created: 2024-01-15T10:30:45Z
# Signed by: aureus-evidence-signer
```

### Chain of Custody

```bash
# View evidence chain of custody
./scripts/evidence-export.sh \
  --evidence-id evd-20240115-103045 \
  --show-custody \
  --output /tmp/custody-chain.json

# Shows:
# - Evidence creation timestamp
# - All access events (who, when, why)
# - Exports/downloads
# - Verification checks
```

---

## Access Control for Evidence

### Who Can Retrieve Evidence?

| Role | Access Level | Approval Required |
|------|--------------|-------------------|
| **Compliance Officer** | Full access | No |
| **Security Team** | Full access | No |
| **Legal** | Full access | No |
| **Auditor** | Read-only | Compliance approval |
| **Engineering Lead** | Operational evidence only | No |
| **Analyst** | Own queries only | No |
| **External Auditor** | Specific evidence only | Legal + Compliance approval |

### Request Evidence (For Restricted Users)

```bash
# Submit evidence request
curl -X POST https://aureus.example.com/api/evidence/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requester": "external.auditor@auditing-firm.com",
    "purpose": "SOC 2 Type II audit",
    "evidence_scope": {
      "start_date": "2023-07-01",
      "end_date": "2024-06-30",
      "types": ["access_logs", "change_records", "approvals"]
    },
    "approvers": ["compliance.lead@example.com", "legal@example.com"]
  }'

# Approvers receive request, review, approve/reject
# Once approved, evidence package generated and shared securely
```

---

## Retention & Archival

Evidence retention follows legal and regulatory requirements:

| Evidence Type | Retention Period | Archive After | Deletion |
|---------------|------------------|---------------|----------|
| Audit Logs | 7 years | 1 year | Automated |
| Query History | 3 years | 6 months | Automated |
| Approvals | 7 years | 1 year | Never (regulatory) |
| Incidents | 5 years | 1 year | Manual only |
| Snapshots | 1 year | 30 days | Automated |
| Deployments | 3 years | 6 months | Automated |

### Archive Old Evidence

```bash
# Archive evidence older than 1 year to cold storage
./scripts/evidence-export.sh \
  --archive \
  --older-than 365d \
  --destination s3://aureus-evidence-archive/ \
  --verify-checksum \
  --delete-after-archive

# Archives to S3 Glacier, removes from active storage
```

---

## Troubleshooting

### Evidence Files Missing

```bash
# Check evidence volume mount
kubectl get pvc -n aureus | grep evidence

# Check disk space
kubectl exec -n aureus deployment/aureus-frontend -- df -h /app/evidence

# Check file permissions
kubectl exec -n aureus deployment/aureus-frontend -- ls -lh /app/evidence/
```

### Export Script Fails

```bash
# Enable debug mode
./scripts/evidence-export.sh --debug --start-date 2024-01-01 --end-date 2024-01-31 --output /tmp/test.tar.gz

# Check logs
tail -f /tmp/evidence-export-debug.log
```

### Evidence Signature Verification Fails

```bash
# Check signer certificate
./scripts/verify-evidence.sh --check-cert

# Re-sign evidence (requires evidence-admin role)
./scripts/sign-evidence.sh /app/evidence/audit/audit-2024-01-15.json
```

---

## References
- [Data Retention Policy](../docs/data-retention-policy.md)
- [Incident Response Runbook](./incident-response.md)
- [Deployment Guide](../docs/deployment-guide.md)
- [Security Documentation](../SECURITY.md)

---

**Last Reviewed**: 2024-01-15  
**Next Review**: 2024-04-15  
**Document Owner**: Compliance Team
