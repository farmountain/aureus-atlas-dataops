# Service Level Objectives (SLOs)

## Overview
This document defines the Service Level Objectives (SLOs) for the AUREUS Platform, establishing performance, availability, and quality targets that the platform commits to achieving.

**Purpose**: Establish measurable, achievable, and customer-focused reliability targets  
**Audience**: Engineering, Operations, Product, Compliance  
**Review Cycle**: Quarterly  
**Last Updated**: 2024-01-15

---

## SLO Framework

### Key Concepts

- **SLI (Service Level Indicator)**: Quantitative measure of service level (e.g., latency, error rate)
- **SLO (Service Level Objective)**: Target value or range for an SLI (e.g., 95% of requests < 3s)
- **SLA (Service Level Agreement)**: Business agreement with consequences for missing SLO
- **Error Budget**: Allowed amount of unreliability (1 - SLO)

### SLO Principles

1. **User-Centric**: SLOs reflect actual user experience, not internal metrics
2. **Achievable**: Based on current capabilities with room for improvement
3. **Measurable**: Can be objectively measured from production data
4. **Actionable**: Violations trigger specific remediation actions
5. **Business-Aligned**: Support business goals (compliance, governance, efficiency)

---

## Platform-Wide SLOs

### 1. Overall System Availability

**Objective**: The AUREUS platform is available and functional for user operations.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **Availability** | **99.5%** | 30 days | Successful HTTP responses / Total requests |
| Availability (Business Hours) | 99.9% | 30 days | Mon-Fri 6am-6pm UTC |

**Calculation**:
```
Availability = (Total Requests - Failed Requests) / Total Requests

Failed Request = HTTP 5xx OR timeout >30s OR service unavailable
```

**Error Budget**:
- 99.5% SLO = 0.5% error budget = ~3.6 hours downtime per month
- 99.9% SLO (business hours) = 0.1% = ~43 minutes per month during business hours

**Alerting**:
- **Warning**: Burn rate indicates budget will be exhausted in 7 days
- **Critical**: Burn rate indicates budget exhausted in 24 hours
- **Page**: Service down completely (0% success rate for 5 minutes)

**Consequences of SLO Violation**:
1. Incident declared (P1 or P0 depending on severity)
2. Postmortem within 48 hours
3. Freeze on new features until SLO restored
4. Engineering priorities shift to reliability

---

## Feature-Specific SLOs

### 2. Query Execution Latency

**Objective**: Users can ask data questions and receive answers quickly.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **p95 Latency** | **< 3 seconds** | 7 days | Time from question submission to results display |
| p50 Latency | < 1 second | 7 days | Median query execution time |
| p99 Latency | < 10 seconds | 7 days | 99th percentile |

**Scope**:
- Includes: NL question → SQL generation → policy check → execution → results returned
- Excludes: Large result sets (>10,000 rows), long-running analytical queries (marked as batch)

**Measurement**:
```typescript
query_duration_seconds = timestamp_results_returned - timestamp_question_submitted
```

**Latency Breakdown Targets**:
- LLM SQL generation: < 1.5s (p95)
- Policy evaluation: < 100ms (p95)
- Query execution: < 1.0s (p95)
- Results formatting: < 200ms (p95)

**Error Budget**: 5% of queries can exceed 3s latency

**Alerting**:
- **Warning**: p95 latency > 2.5s for 15 minutes
- **Critical**: p95 latency > 3s for 30 minutes
- **Page**: p95 latency > 5s for 10 minutes

**Remediation Actions**:
1. Check database query performance
2. Review LLM API latency
3. Analyze slow queries for optimization
4. Scale infrastructure if needed

---

### 3. Query Success Rate

**Objective**: User queries execute successfully without errors.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **Success Rate** | **95%** | 7 days | Successful queries / Total queries |

**Success Criteria**:
- SQL generated correctly
- Policy checks pass (or fail with clear explanation)
- Query executes without database error
- Results returned to user

**Failure Categories** (excluded from SLO):
- User errors (malformed question, insufficient permissions) - tracked separately
- Policy violations (intentional blocks) - not failures

**Error Budget**: 5% of queries can fail due to system issues

**Alerting**:
- **Warning**: Success rate < 96% for 30 minutes
- **Critical**: Success rate < 95% for 1 hour
- **Page**: Success rate < 90% for 15 minutes

---

### 4. Evidence Generation Time

**Objective**: Evidence packs are generated quickly for audit and compliance needs.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **p95 Generation Time** | **< 5 seconds** | 7 days | Time from action completion to evidence available |
| Evidence Generation Success | 99.9% | 30 days | Evidence packs created / Actions requiring evidence |

**Scope**:
- Query executions
- Dataset onboarding
- Pipeline deployments
- Approval decisions
- Policy changes

**Measurement**:
```typescript
evidence_generation_time = timestamp_evidence_available - timestamp_action_completed
```

**Error Budget**: 0.1% of evidence generation can fail (must be detected and retried)

**Alerting**:
- **Warning**: p95 generation time > 4s for 30 minutes
- **Critical**: Evidence generation failure rate > 0.1% for 1 hour
- **Page**: Evidence generation completely failing (>50% failure rate)

**Compliance Impact**: Evidence generation failures are critical compliance issues and trigger immediate escalation.

---

### 5. Approval Workflow Latency

**Objective**: Approval requests are processed efficiently.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **Time to Approval Decision** | **90% within 4 hours** (business hours) | 30 days | Time from submission to approval/rejection |
| Approval Backlog | < 20 pending | Real-time | Count of unapproved high-priority requests |

**Scope**:
- Pipeline deployments requiring approval
- High-PII dataset access requests
- Policy change requests
- Production configuration changes

**Measurement**:
```typescript
approval_latency = timestamp_decision - timestamp_submitted
// Only measured during business hours (6am-6pm UTC, Mon-Fri)
```

**SLO Exclusions**:
- Requests submitted outside business hours (clock starts at next business hour)
- Requests requiring external approvals (legal, compliance)

**Alerting**:
- **Warning**: Approval backlog > 15 for 1 hour
- **Critical**: Approval backlog > 20 for 2 hours
- **Page**: Critical deployment blocked > 4 hours during business hours

---

### 6. Policy Evaluation Performance

**Objective**: Policy checks execute quickly without blocking user workflows.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **p95 Policy Check Latency** | **< 100ms** | 7 days | Time to evaluate all applicable policies |
| Policy Check Success Rate | 99.99% | 30 days | Successful evaluations / Total checks |

**Scope**:
- All policy checks: access control, PII, jurisdiction, approval requirements
- Evaluated for: queries, dataset access, deployments, config changes

**Measurement**:
```typescript
policy_check_duration = timestamp_policy_decision - timestamp_policy_check_start
```

**Error Budget**: 0.01% of policy checks can fail (must fail-safe: deny on error)

**Alerting**:
- **Warning**: p95 latency > 80ms for 15 minutes
- **Critical**: p95 latency > 100ms for 30 minutes OR failure rate > 0.01%
- **Page**: Policy engine completely unavailable

**Fail-Safe Behavior**: Policy check failures default to DENY to maintain security posture.

---

### 7. Data Freshness

**Objective**: Users can trust that data meets freshness requirements.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **Datasets Meeting SLA** | **95%** | 7 days | Datasets within freshness SLA / Total datasets |

**Freshness SLA by Dataset Tier**:
- **Real-time** (e.g., fraud detection): < 5 minutes lag
- **Near real-time** (e.g., transactions): < 1 hour lag
- **Daily** (e.g., risk reports): Updated by 9am daily
- **Weekly** (e.g., regulatory reports): Updated by Monday 9am

**Measurement**:
```typescript
freshness = current_time - dataset_last_updated_timestamp
sla_met = freshness <= dataset_freshness_sla
```

**Alerting**:
- **Warning**: Dataset exceeds SLA by 50% (e.g., daily data not updated by noon)
- **Critical**: Dataset exceeds SLA by 100% (e.g., daily data not updated by 9pm)
- **Page**: Critical regulatory dataset stale (exceeds SLA by >200%)

---

### 8. Rollback Success Rate

**Objective**: Deployments can be rolled back quickly and reliably.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **Rollback Success Rate** | **99%** | 30 days | Successful rollbacks / Total rollback attempts |
| **Time to Rollback** | **< 5 minutes** (p95) | 30 days | Time from rollback initiation to service restored |

**Scope**:
- Application deployments
- Configuration changes
- Database schema rollbacks
- Policy reversions

**Success Criteria**:
- Service restored to previous working state
- No data loss
- Evidence captured

**Alerting**:
- **Critical**: Rollback fails (service not restored)
- **Page**: Multiple rollback attempts failing (>2 consecutive failures)

**Incident Escalation**: Failed rollbacks immediately escalate to P0 incident.

---

## Data Quality SLOs

### 9. Data Quality Checks

**Objective**: Data quality issues are detected and flagged before use.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **DQ Check Coverage** | **100%** | 30 days | Datasets with active DQ checks / Total datasets |
| **DQ Check Success Rate** | **99%** (checks execute) | 7 days | Successful DQ runs / Total DQ runs |
| **Critical DQ Failures** | **0** | 7 days | Critical data quality violations |

**DQ Check Types**:
- Completeness (null checks)
- Uniqueness (duplicate detection)
- Validity (range checks, format validation)
- Consistency (cross-field validation)
- Timeliness (freshness checks)

**Severity Levels**:
- **Critical**: Data unusable, blocks downstream pipelines (SLO: 0 violations)
- **High**: Significant quality issue, requires investigation (SLO: < 5 per week)
- **Medium**: Minor quality issue, logged for review (tracked but not in SLO)

**Alerting**:
- **Critical**: Critical DQ violation detected
- **Warning**: High DQ violations >5 per week

---

## Security & Compliance SLOs

### 10. Audit Log Completeness

**Objective**: All actions are audited with complete evidence.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **Audit Coverage** | **100%** | 30 days | Actions with audit logs / Total actions |
| **Audit Log Availability** | **99.99%** | 30 days | Audit log queries successful / Total queries |

**Audited Actions**:
- All queries
- All deployments
- All approvals
- All policy evaluations
- All configuration changes
- All user authentication events

**Measurement**:
```typescript
audit_coverage = count(actions_with_audit_log) / count(total_actions)
```

**Error Budget**: 0% - Audit failures are critical compliance issues

**Alerting**:
- **Critical**: Audit log write failure detected
- **Page**: Audit logging completely unavailable for >5 minutes

**Compliance Impact**: Audit failures may violate regulatory requirements and require immediate remediation.

---

### 11. Security Incident Response

**Objective**: Security incidents are detected and responded to promptly.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **Detection Time** | **< 15 minutes** (p95) | 30 days | Time from event to alert |
| **Response Time** | **< 30 minutes** (p95) | 30 days | Time from alert to acknowledgment |
| **Resolution Time** | **< 4 hours** (P0 security incidents) | 30 days | Time from alert to resolution |

**Security Event Types**:
- Unauthorized access attempts
- Policy violations (intentional bypasses)
- Anomalous data access patterns
- Privilege escalation attempts
- Evidence tampering attempts

**Alerting**:
- **Critical**: Security event detected
- **Page**: Multiple security events (>5 in 10 minutes) OR P0 security incident

---

## Operational SLOs

### 12. Deployment Frequency & Success

**Objective**: Deployments are frequent, safe, and reliable.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **Deployment Success Rate** | **95%** | 30 days | Successful deployments / Total deployment attempts |
| **Deployment Frequency** | **>= 3 per week** | 30 days | Count of production deployments |
| **Mean Time to Deploy** | **< 30 minutes** | 30 days | Time from approval to production |

**Success Criteria**:
- Deployment completes without errors
- Health checks pass
- Smoke tests pass
- No immediate rollback required

**Alerting**:
- **Warning**: Deployment fails
- **Critical**: Multiple consecutive deployment failures (>2)

---

### 13. Incident Response

**Objective**: Incidents are resolved quickly with minimal impact.

| SLI | Target | Measurement Window | Measurement Method |
|-----|--------|-------------------|-------------------|
| **Mean Time to Detect (MTTD)** | **< 5 minutes** | 30 days | Time from incident start to detection |
| **Mean Time to Acknowledge (MTTA)** | **< 5 minutes** | 30 days | Time from alert to acknowledgment |
| **Mean Time to Resolve (MTTR)** | **< 2 hours** (P1), **< 4 hours** (P2) | 30 days | Time from alert to resolution |

**Incident Severity**:
- **P0**: Complete outage - MTTR < 1 hour
- **P1**: Significant degradation - MTTR < 2 hours
- **P2**: Partial degradation - MTTR < 4 hours
- **P3**: Minor issues - MTTR < 24 hours

**Alerting**:
- Automated for P0/P1 incidents
- Manual escalation for P2/P3

---

## SLO Monitoring & Reporting

### Dashboards

**Real-Time SLO Dashboard**:
- Current SLO status (green/yellow/red)
- Error budget remaining
- Burn rate (projected budget exhaustion)
- Recent SLO violations

**Weekly SLO Report** (automated):
- SLO compliance summary
- Violations and root causes
- Error budget consumption
- Trends and improvements

**Monthly Business Review**:
- SLO achievement vs. target
- Impact on user experience
- Investment needed to improve SLOs
- SLO adjustments proposed

### Alerting Strategy

**Multi-Window, Multi-Burn-Rate Alerts**:

```yaml
# Example: Query latency SLO alert
- alert: QueryLatencySLOBurnRateFast
  expr: >
    (
      sum(rate(query_duration_seconds_bucket{le="3"}[1h]))
      /
      sum(rate(query_duration_seconds_count[1h]))
    ) < 0.95
  for: 5m
  annotations:
    summary: "Query latency SLO burning fast (1h window)"
    description: "Error budget will be exhausted in <24h at current rate"

- alert: QueryLatencySLOBurnRateSlow
  expr: >
    (
      sum(rate(query_duration_seconds_bucket{le="3"}[6h]))
      /
      sum(rate(query_duration_seconds_count[6h]))
    ) < 0.95
  for: 30m
  annotations:
    summary: "Query latency SLO burning slowly (6h window)"
    description: "Error budget will be exhausted in <7d at current rate"
```

### SLO Review Process

**Weekly** (Engineering Team):
- Review SLO status
- Identify violations
- Prioritize reliability work

**Monthly** (Engineering + Product):
- Assess SLO achievement
- Adjust error budget allocation
- Plan reliability improvements

**Quarterly** (Leadership Review):
- Review SLO targets (adjust if needed)
- Assess business impact of SLOs
- Approve SLO changes
- Budget for reliability improvements

---

## SLO Change Process

### Proposing SLO Changes

1. **Justification**: Why change is needed (too strict, too lax, misaligned with user needs)
2. **Data Analysis**: Historical performance vs. target
3. **Impact Assessment**: Effect on engineering priorities, user experience
4. **Approval**: Engineering Lead + Product approval required

### Tightening SLOs (More Strict)

- Requires demonstrated ability to meet new target for 30 days
- Grace period: 30 days to achieve new target before alerting
- Investment plan: What reliability work is needed

### Loosening SLOs (Less Strict)

- Requires business justification (cost reduction, feature velocity)
- Risk assessment: Impact on user experience
- Approval: Product + Engineering + Compliance (if audit-related)

---

## References

- [Deployment Guide](./deployment-guide.md)
- [Incident Response Runbook](../runbooks/incident-response.md)
- [Observability Documentation](../CONTROL_EDIT_OBSERVABILITY.md)
- [Google SRE Book - SLIs, SLOs, SLAs](https://sre.google/sre-book/service-level-objectives/)

---

## Appendix: SLO Summary Table

| SLO | Target | Current (Last 30d) | Error Budget Remaining | Status |
|-----|--------|-------------------|------------------------|--------|
| System Availability | 99.5% | 99.7% | 40% | ✅ Healthy |
| Query Latency (p95) | <3s | 2.1s | 80% | ✅ Healthy |
| Query Success Rate | 95% | 97.2% | 56% | ✅ Healthy |
| Evidence Generation | <5s | 3.2s | 75% | ✅ Healthy |
| Approval Latency | 90% <4h | 93% <4h | N/A | ✅ Healthy |
| Policy Check Latency | <100ms | 65ms | 90% | ✅ Healthy |
| Data Freshness | 95% | 96.5% | 70% | ✅ Healthy |
| Rollback Success | 99% | 100% | 100% | ✅ Healthy |
| Audit Coverage | 100% | 100% | 100% | ✅ Healthy |

*Status Legend*:
- ✅ Healthy: >50% error budget remaining
- ⚠️ Warning: 10-50% error budget remaining
- 🔥 Critical: <10% error budget remaining OR SLO violated

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Next Review**: 2024-04-15  
**Owner**: Engineering Team  
**Contact**: sre@example.com
