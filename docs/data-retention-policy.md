# Data Retention Policy

## Purpose
This document defines the data retention and deletion policies for the AUREUS Platform to ensure compliance with regulatory requirements, optimize storage costs, and maintain audit trails.

**Effective Date**: 2024-01-15  
**Review Cycle**: Annual  
**Owner**: Compliance Team  
**Approvers**: Legal, Security, Engineering

---

## Regulatory Context

AUREUS Platform operates in regulated banking environments subject to:
- **SOX (Sarbanes-Oxley)**: 7-year retention for financial records
- **GDPR**: Right to erasure, data minimization, purpose limitation
- **GLBA (Gramm-Leach-Bliley Act)**: 5-year retention for customer records
- **Basel III**: Audit trail requirements for risk calculations
- **Local Banking Regulations**: Varies by jurisdiction (longest applies)

---

## Retention Schedules

### 1. Audit Logs

**Retention Period**: 7 years  
**Archive After**: 1 year  
**Rationale**: SOX compliance, financial audit trails

**Storage Locations**:
- Active (0-12 months): `/app/evidence/audit/` (Hot storage)
- Archive (1-7 years): S3 Glacier Deep Archive
- Deleted: After 7 years (automated)

**Data Included**:
- User authentication events
- Data access logs
- Query executions
- Configuration changes
- Policy decisions
- Approval actions

**Backup Frequency**: Daily incremental, weekly full

```yaml
# Configuration
audit_logs:
  retention_days: 2555  # 7 years
  archive_after_days: 365
  backup_frequency: daily
  storage_class_active: hot
  storage_class_archive: glacier-deep-archive
  auto_delete: true
  deletion_requires_approval: false
```

---

### 2. Query History

**Retention Period**: 3 years  
**Archive After**: 6 months  
**Rationale**: Data lineage, usage analytics, compliance audits

**Storage Locations**:
- Active (0-6 months): Postgres database + KV store
- Archive (6-36 months): S3 Standard-IA
- Deleted: After 3 years (automated)

**Data Included**:
- Natural language question
- Generated SQL
- Datasets accessed
- Execution time
- Results metadata (not actual results)
- Policy check results
- User identity

**Exceptions**:
- Queries accessing high-PII datasets: 5-year retention
- Queries flagged for investigation: Retain until case closed + 3 years

```yaml
query_history:
  retention_days: 1095  # 3 years
  archive_after_days: 180
  exceptions:
    high_pii_queries:
      retention_days: 1825  # 5 years
    flagged_queries:
      retention_days: custom  # Case-by-case
  pii_redaction: true
  result_data_retention_days: 30  # Actual query results
```

---

### 3. Approval Records

**Retention Period**: 7 years (permanent for high-risk)  
**Archive After**: 1 year  
**Rationale**: Change management audit, governance compliance

**Storage Locations**:
- Active (0-12 months): `/app/evidence/approvals/`
- Archive (1-7 years): S3 Glacier
- Permanent (high-risk): Never deleted

**Data Included**:
- Approval request details
- Evidence packs (code, tests, policies)
- Approval/rejection decision
- Approver identity
- Timestamps
- Conditions/comments

**High-Risk Categories** (permanent retention):
- Production database schema changes
- Policy modifications affecting PII access
- Cross-border data transfers
- Regulatory report generation pipelines

```yaml
approval_records:
  retention_days: 2555  # 7 years
  archive_after_days: 365
  high_risk_retention: permanent
  high_risk_categories:
    - prod_database_changes
    - pii_policy_changes
    - cross_border_transfers
    - regulatory_reporting
```

---

### 4. Evidence Packs

**Retention Period**: 90 days (standard), 3 years (deployed)  
**Archive After**: 30 days  
**Rationale**: Rollback capability, debugging, compliance

**Storage Locations**:
- Active (0-30 days): `/app/evidence/` (for quick rollback)
- Archive (30-90 days): S3 Standard
- Long-term (deployed to prod): 3 years in S3 Glacier

**Data Included**:
- Config specifications
- Generated code
- Unit tests
- DQ rule definitions
- Policy check results
- Lineage metadata

**Lifecycle**:
- Created on: Query, dataset onboarding, pipeline generation, config change
- If deployed to prod: Retention extends to 3 years
- If not deployed: Deleted after 90 days

```yaml
evidence_packs:
  retention_days_default: 90
  retention_days_deployed: 1095  # 3 years
  archive_after_days: 30
  compression: gzip
  encryption: aes256
```

---

### 5. Snapshots

**Retention Period**: 1 year  
**Archive After**: 30 days  
**Rationale**: Rollback capability, state recovery

**Storage Locations**:
- Active (0-30 days): `/app/evidence/snapshots/`
- Archive (30-365 days): S3 Standard-IA
- Deleted: After 1 year

**Data Included**:
- Pre-change state
- Configuration snapshots
- Database schema snapshots (metadata only)
- Pipeline configurations
- Policy versions

**Snapshot Frequency**:
- Before every production deployment
- Before policy changes
- Before dataset schema modifications
- Daily scheduled snapshots (last 7 retained)

```yaml
snapshots:
  retention_days: 365
  archive_after_days: 30
  frequency:
    on_demand: true  # Before deployments
    scheduled: daily
    scheduled_retention_days: 7
```

---

### 6. Incident Evidence

**Retention Period**: 5 years  
**Archive After**: 1 year  
**Rationale**: Postmortem reference, legal protection, compliance

**Storage Locations**:
- Active (0-12 months): `/app/evidence/incidents/`
- Archive (1-5 years): S3 Glacier
- Deleted: After 5 years (manual approval required)

**Data Included**:
- Incident timeline
- Logs (frontend, backend, database)
- Configuration at time of incident
- Remediation actions
- Root cause analysis
- Postmortem report

**Deletion Restrictions**:
- Incidents involving data breach: 7 years
- Incidents with legal implications: Retain until case resolved + 5 years
- Incidents referenced in audits: Cannot delete without compliance approval

```yaml
incident_evidence:
  retention_days: 1825  # 5 years
  archive_after_days: 365
  auto_delete: false  # Requires manual approval
  exceptions:
    data_breach: 2555  # 7 years
    legal_hold: custom
    audit_referenced: requires_approval
```

---

### 7. Application Logs

**Retention Period**: 90 days  
**Archive After**: 30 days  
**Rationale**: Debugging, performance analysis

**Storage Locations**:
- Active (0-30 days): Kubernetes logs, CloudWatch
- Archive (30-90 days): S3 Standard-IA
- Deleted: After 90 days (automated)

**Log Levels Retained**:
- ERROR: 90 days
- WARN: 60 days
- INFO: 30 days
- DEBUG: 7 days (production), 30 days (non-prod)

**Exceptions**:
- Logs related to security events: 1 year
- Logs flagged for investigation: Retain until investigation complete + 90 days

```yaml
application_logs:
  retention_days:
    error: 90
    warn: 60
    info: 30
    debug: 7  # production
  security_logs_retention_days: 365
  pii_redaction: true
  log_sampling: 10%  # Sample INFO logs after 7 days
```

---

### 8. Metrics & Monitoring Data

**Retention Period**: 90 days (detailed), 2 years (aggregated)  
**Archive After**: N/A (time-series database)  
**Rationale**: Performance analysis, capacity planning, SLO tracking

**Storage Locations**:
- Detailed metrics (0-90 days): Prometheus, CloudWatch
- Aggregated metrics (90 days - 2 years): S3 + Athena
- Deleted: After 2 years (automated)

**Data Included**:
- API latency (p50, p95, p99)
- Error rates
- Query execution times
- Resource utilization
- User activity counts
- Policy decision counts

```yaml
monitoring_data:
  detailed_retention_days: 90
  aggregated_retention_days: 730  # 2 years
  aggregation_interval: 1h  # After 7 days, downsample to hourly
  slo_data_retention_days: 730  # For SLO reporting
```

---

### 9. Configuration History

**Retention Period**: 5 years  
**Archive After**: 1 year  
**Rationale**: Change audit, rollback capability, compliance

**Storage Locations**:
- Active (0-12 months): Git repository + `/app/evidence/config/`
- Archive (1-5 years): S3 Standard-IA
- Deleted: After 5 years (automated)

**Data Included**:
- ConfigMap versions
- Secret rotation logs (not the secrets themselves)
- Policy versions
- Infrastructure-as-Code changes
- Database schema migrations

```yaml
configuration_history:
  retention_days: 1825  # 5 years
  archive_after_days: 365
  version_control: git
  backup_frequency: on_change
```

---

### 10. User Data (GDPR Considerations)

**Retention Period**: As long as user account active + 3 years  
**Deletion**: Upon user request (GDPR right to erasure)  
**Rationale**: GDPR compliance, data minimization

**Data Included**:
- User profile information
- User preferences
- Saved queries
- Personal dashboards

**Exceptions (cannot be deleted on request)**:
- Audit logs (anonymized user ID retained)
- Financial transaction records (regulatory requirement)
- Evidence packs for deployed changes (user ID retained for accountability)

**GDPR Rights Supported**:
- Right to access: Generate user data export
- Right to erasure: Delete user-generated content, anonymize audit trails
- Right to rectification: Allow profile updates
- Right to portability: Export in JSON format

```yaml
user_data:
  retention: account_lifetime_plus_3_years
  gdpr_erasure_supported: true
  audit_log_handling: anonymize  # Replace user ID with hash
  exceptions:
    financial_records: retain_per_sox
    accountability_records: retain_with_anonymization
```

---

## Deletion Procedures

### Automated Deletion

Automated deletion runs daily and processes:
1. Evidence older than retention period
2. Logs older than retention period
3. Archived data past archive retention

**Safety Mechanisms**:
- Dry-run mode (preview deletions without executing)
- Deletion audit trail (what was deleted, when, why)
- Soft delete (mark for deletion, purge after 30 days)
- Backup verification before permanent deletion

```bash
# Automated deletion job (runs daily)
kubectl create job --from=cronjob/evidence-retention-enforcer evidence-cleanup-manual

# View deletion plan (dry-run)
./scripts/enforce-retention.sh --dry-run --verbose

# Manual deletion (requires approval)
./scripts/enforce-retention.sh --delete --evidence-type audit_logs --older-than 2555d --approve
```

### Manual Deletion

Manual deletion required for:
- Incident evidence
- High-risk approval records
- Data subject access requests (GDPR)
- Legal hold releases

**Approval Process**:
1. Submit deletion request with justification
2. Legal review (for legal holds)
3. Compliance review (for regulatory data)
4. Engineering review (for data integrity)
5. Approval + execution
6. Deletion audit entry created

---

## Storage Optimization

### Compression

All archived data is compressed using gzip (level 9):
- Reduces storage costs by ~70%
- Minimal CPU overhead for compression
- Transparent decompression on retrieval

### Deduplication

Evidence packs with identical content are deduplicated:
- Hash-based deduplication (SHA-256)
- Pointers to canonical copy
- Savings: ~30% for similar evidence packs

### Tiered Storage

| Storage Tier | Use Case | Cost | Retrieval Time |
|--------------|----------|------|----------------|
| **Hot** | Active evidence (0-30 days) | $$$ | Instant |
| **Standard** | Recent archive (30-180 days) | $$ | Instant |
| **Standard-IA** | Long-term archive (180-365 days) | $ | Minutes |
| **Glacier** | Cold archive (1-7 years) | ¢ | Hours |
| **Glacier Deep Archive** | Compliance archive (7+ years) | ¢¢ | 12-48 hours |

---

## Data Protection

### Encryption

- **At rest**: AES-256 encryption for all stored evidence
- **In transit**: TLS 1.3 for all data transfers
- **Key management**: AWS KMS / HashiCorp Vault

### Access Control

- Evidence access logged and audited
- Role-based access (see audit-evidence-retrieval.md)
- MFA required for sensitive evidence retrieval
- Encryption keys rotated quarterly

### Backup & Disaster Recovery

- **Backup frequency**: Daily incremental, weekly full
- **Backup retention**: 30 days (separate from data retention)
- **Backup testing**: Monthly restore drills
- **Geographic redundancy**: Multi-region replication for critical evidence

---

## Compliance Verification

### Monthly Audits

Automated monthly audit generates report:
- Evidence counts by type
- Storage utilization
- Retention policy compliance
- Overdue deletions
- Access anomalies

```bash
# Generate monthly compliance report
./scripts/retention-compliance-audit.sh --month 2024-01

# Output: /evidence/compliance/retention-audit-2024-01.pdf
```

### Quarterly Reviews

Compliance team reviews:
- Policy effectiveness
- Storage costs vs. regulatory needs
- Deletion requests handled
- Legal holds in place
- Updates to regulatory requirements

---

## Cost Estimation

Based on typical banking data platform usage:

| Evidence Type | Volume/Day | Retention | Annual Cost (estimate) |
|---------------|------------|-----------|------------------------|
| Audit Logs | 10 GB | 7 years | $1,200 |
| Query History | 5 GB | 3 years | $300 |
| Evidence Packs | 20 GB | 90 days (avg) | $200 |
| Snapshots | 15 GB | 1 year | $400 |
| Application Logs | 50 GB | 90 days | $500 |
| Incident Evidence | 1 GB | 5 years | $50 |
| **Total** | **~100 GB/day** | **Mixed** | **~$2,650/year** |

*Assumes S3 tiered storage with intelligent tiering and lifecycle policies*

---

## Updates & Amendments

This policy may be updated to reflect:
- Changes in regulatory requirements
- Business needs
- Technology improvements
- Cost optimization opportunities

**Change Process**:
1. Propose change with justification
2. Legal + Compliance review
3. Engineering impact assessment
4. Approval by CTO + Chief Compliance Officer
5. Update documentation
6. Communicate to stakeholders
7. Implement with grace period

---

## References

- [Audit Evidence Retrieval Runbook](../runbooks/audit-evidence-retrieval.md)
- [Incident Response Runbook](../runbooks/incident-response.md)
- [Security Policy](../SECURITY.md)
- [GDPR Compliance Guide](../docs/gdpr-compliance.md) (if applicable)

---

## Appendix: Retention Policy Summary Table

| Data Type | Active Retention | Archive Retention | Total Retention | Auto-Delete | Backup |
|-----------|------------------|-------------------|-----------------|-------------|--------|
| Audit Logs | 1 year | 6 years | 7 years | Yes | Daily |
| Query History | 6 months | 2.5 years | 3 years | Yes | Daily |
| Approval Records | 1 year | 6 years | 7 years / Permanent | Conditional | Daily |
| Evidence Packs | 30 days | 60 days | 90 days / 3 years | Yes | Weekly |
| Snapshots | 30 days | 11 months | 1 year | Yes | Weekly |
| Incident Evidence | 1 year | 4 years | 5 years | No (manual) | Daily |
| Application Logs | 30 days | 60 days | 90 days | Yes | Daily |
| Monitoring Data | 90 days (detailed) | 2 years (agg) | 2 years | Yes | Weekly |
| Configuration | 1 year | 4 years | 5 years | Yes | On change |
| User Data | Active + 3 years | N/A | Per GDPR | On request | Daily |

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Next Review**: 2025-01-15  
**Owner**: Compliance Team  
**Contact**: compliance@example.com
