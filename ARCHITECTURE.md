# Architecture Overview

## System Context

This is a **frontend demonstration** of a bank-grade governed agentic data platform. It showcases the user experience and interaction patterns for the full system, which would consist of:

### Production Architecture (Full System)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                           │
│  (This Spark App - React/TypeScript)                            │
│  - Natural Language Interfaces                                   │
│  - Evidence Visualization                                        │
│  - Approval Workflows                                            │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ HTTPS/REST + JWT
             │
┌────────────▼────────────────────────────────────────────────────┐
│                      ORCHESTRATOR API                            │
│  (FastAPI/Python)                                                │
│  - Request routing                                               │
│  - AUREUS Guard integration                                      │
│  - Evidence pack generation                                      │
└────┬────────────┬────────────┬────────────┬─────────────────────┘
     │            │            │            │
     │            │            │            │
┌────▼────┐  ┌───▼─────┐  ┌──▼──────┐  ┌──▼──────────┐
│ Config  │  │ Query   │  │Pipeline │  │  Metadata   │
│ Copilot │  │ Service │  │Service  │  │  Service    │
│         │  │         │  │         │  │             │
│NL->Spec │  │NL->SQL  │  │SQL Gen  │  │  Registry   │
└────┬────┘  └───┬─────┘  └──┬──────┘  └──┬──────────┘
     │            │            │            │
     └────────────┴────────────┴────────────┘
                  │
           ┌──────▼──────┐
           │AUREUS GUARD │
           │             │
           │ FSM Engine  │
           │ Policy OPA  │
           │ Audit Log   │
           │ Snapshots   │
           └──────┬──────┘
                  │
           ┌──────▼──────┐
           │  POSTGRES   │
           │             │
           │ Metadata DB │
           │ Audit Trail │
           │ Snapshots   │
           └─────────────┘
```

### Current Implementation (This Spark App)

This application simulates the full stack with:
- **Real LLM integration** using Spark's `spark.llm()` API
- **Client-side state management** with `useKV` (simulates backend persistence)
- **Mocked backend responses** with realistic latency and data structures
- **Evidence pack generation** client-side (JSON + formatted display)
- **Policy evaluation** mock engine with realistic rules

## Core Modules

### 1. AUREUS Guard (Simulated)

**Goal-Guard Finite State Machine**:
```typescript
States: IDLE → INTENT_VALIDATION → POLICY_CHECK → EXECUTION → EVIDENCE_GEN → COMPLETE
        ↓ (on violation)
        BLOCKED → (audit + notify)
```

**Policy Engine**:
- PII access policies
- Cross-jurisdiction data policies
- Production write policies
- High-risk action policies
- Budget/rate limits

**Audit Log**:
Every action generates immutable audit entry:
```typescript
{
  id: string
  timestamp: ISO8601
  actor: { userId, role }
  action: string
  intent: object
  policyResults: PolicyCheck[]
  outcome: "allowed" | "blocked" | "requires_approval"
  evidenceRef: string
}
```

**Snapshots**:
Before any deployment/modification:
```typescript
{
  id: string
  timestamp: ISO8601
  entityType: "pipeline" | "dataset" | "policy"
  entityId: string
  snapshotData: object
  rollbackScript: string
}
```

### 2. Config Copilot (LLM-Assisted)

**Input**: Natural language description
**Output**: Structured specifications

**Spec Types**:
- **Data Contract**: Schema, owner, domain, PII classification, jurisdiction
- **Ingestion Spec**: Source, schedule, validation rules, error handling
- **Transform Spec**: SQL model, dependencies, tests, DQ checks
- **Policy Spec**: Conditions, actions, exceptions, approval requirements
- **SLA Spec**: Freshness, completeness, accuracy thresholds

**Validation**:
1. JSON Schema validation
2. Cross-reference checks (valid owners, domains, datasets)
3. Policy compliance check
4. Test generation

### 3. Query Service

**Flow**:
```
NL Question
  → Intent Schema Extraction (LLM)
  → Required Dataset Identification
  → Policy Check (PII, jurisdiction, access)
  → SQL Generation (LLM with schema context)
  → SQL Validation (parse + sandbox check)
  → Execution (read-only, timeout limits)
  → Result Formatting + Lineage
  → Evidence Pack Generation
```

**Intent Schema**:
```typescript
{
  question: string
  requiredDomains: string[]
  requiredDatasets: string[]
  containsPII: boolean
  crossJurisdiction: boolean
  aggregationType: "summary" | "detail" | "timeseries"
}
```

### 4. Pipeline Service

**Generates**:
- SQL model files (dbt-style)
- Unit tests (sample data + expected output)
- Data quality checks (completeness, uniqueness, referential integrity)
- Deployment manifest
- Rollback script

**Testing Requirements**:
- Every pipeline must have ≥1 unit test
- Every pipeline must have ≥2 DQ checks
- No pipeline deploys to prod without passing tests

### 5. Metadata Service

**Stores**:
- Dataset registry (schema, lineage, ownership)
- Glossary terms (business definitions)
- Classification tags (PII, confidential, public)
- Freshness SLAs and actual refresh times
- Usage analytics (query frequency, users)

## Data Models

### Dataset
```typescript
{
  id: string
  name: string
  domain: "credit_risk" | "aml_fcc" | "finance" | "treasury" | "retail" | "ops"
  owner: string
  description: string
  schema: Column[]
  piiLevel: "none" | "low" | "high"
  jurisdiction: "US" | "EU" | "UK" | "APAC" | "multi"
  freshnessSLA: Duration
  lastRefresh: ISO8601
  tags: string[]
}
```

### Policy
```typescript
{
  id: string
  name: string
  type: "access" | "quality" | "retention" | "approval"
  condition: string  // OPA Rego-like
  action: "allow" | "block" | "require_approval"
  scope: {
    domains?: string[]
    piiLevels?: string[]
    jurisdictions?: string[]
  }
  approvers?: string[]
}
```

### Evidence Pack
```typescript
{
  id: string
  timestamp: ISO8601
  eventType: "query" | "onboard" | "pipeline_deploy" | "approval"
  actor: string
  inputs: object
  outputs: object
  policyChecks: PolicyCheck[]
  tests: TestResult[]
  artifacts: string[]  // URLs to generated files
  signature: string  // Tamper detection
}
```

### Approval Request
```typescript
{
  id: string
  type: "pipeline_deploy" | "policy_change" | "pii_access" | "dataset_onboard"
  requester: string
  timestamp: ISO8601
  description: string
  riskLevel: "low" | "medium" | "high"
  evidencePackId: string
  status: "pending" | "approved" | "rejected"
  approver?: string
  approvalTimestamp?: ISO8601
  approvalComment?: string
}
```

## Security Model

### Authentication (Simulated)
- JWT tokens with role claims
- Roles: `analyst`, `approver`, `admin`, `viewer`

### Authorization
- Policy-based (OPA-style evaluation)
- Every action checked against active policies
- Principle of least privilege

### Data Protection
- PII auto-detection in schemas
- PII masking by default (show hash or partial)
- Explicit PII access requires policy grant
- Cross-border data movement requires approval

### Audit Trail
- All actions logged immutably
- Evidence packs signed and stored
- Regulatory export capability
- Retention per jurisdiction requirements

## Evidence-Gated Development (EGD)

**Principle**: No change accepted without verifiable evidence.

**Evidence Requirements by Action**:

| Action | Required Evidence |
|--------|------------------|
| Query execution | Intent schema, policy checks, SQL, dataset lineage, execution time |
| Dataset onboard | Data contract, validation tests, policy evaluation, approval |
| Pipeline deploy | SQL model, unit tests (passed), DQ checks, snapshot, approval |
| Policy change | Impact analysis, affected entities, approval, rollback plan |

**Evidence Storage**:
- Stored as markdown + JSON
- Includes all inputs, outputs, decisions
- Cryptographically signed
- Immutable once generated

## Integration Points (Future)

### OpenLineage
Export lineage events for external lineage graphs:
```json
{
  "eventType": "COMPLETE",
  "inputs": [{"namespace": "bank", "name": "transactions"}],
  "output": {"namespace": "bank", "name": "daily_summary"},
  "job": {"namespace": "pipelines", "name": "summarize_transactions"}
}
```

### OIDC/SAML
Replace JWT with enterprise SSO:
- Okta, Azure AD, Ping Identity integration
- Group-based role mapping
- MFA enforcement

### External Policy Engine
Integrate with OPA or similar:
- Policies as code in Git
- Centralized policy management
- Policy testing framework

### Data Catalog Integration
Sync with existing catalogs:
- Collibra, Alation, DataHub
- Bi-directional sync
- Unified glossary

## Deployment Architecture (Full System)

### Local Development
```bash
docker-compose up
# Starts: Postgres, Redis, FastAPI services, Next.js frontend
```

### Production (Kubernetes)
```yaml
Services:
  - orchestrator-api (3 replicas)
  - config-copilot (2 replicas)
  - query-service (5 replicas, auto-scale)
  - pipeline-service (2 replicas)
  - metadata-service (2 replicas)
  
Databases:
  - postgres-primary (HA with standby)
  - postgres-audit (separate, append-only)
  
Storage:
  - S3/Azure Blob (evidence packs, snapshots)
```

### CI/CD Pipeline
```yaml
Stages:
  1. Lint (ruff, mypy, eslint)
  2. Unit Tests (pytest, vitest)
  3. Integration Tests (testcontainers)
  4. Security Scan (bandit, npm audit)
  5. Build (Docker images)
  6. Deploy to Staging
  7. E2E Tests (Playwright)
  8. Approval Gate
  9. Deploy to Production
  10. Smoke Tests
```

## Technology Decisions

### Why FastAPI (Backend)
- Async support for LLM calls
- Automatic OpenAPI docs
- Pydantic integration (validation)
- Excellent performance

### Why Postgres (Metadata)
- JSONB for flexible schemas
- Row-level security
- Audit triggers
- Proven reliability in banking

### Why OPA-style Policies
- Policies as code
- Testable policy logic
- Industry standard
- Separation of policy from code

### Why Next.js (Frontend)
- SSR for SEO and performance
- API routes for BFF pattern
- TypeScript support
- Great DX

### Why Spark for Prototype
- Rapid UI development
- Real LLM integration
- Client-side state for demo
- No backend infrastructure needed

## Threat Model

### Threats & Mitigations

| Threat | Mitigation |
|--------|-----------|
| Unauthorized data access | Policy engine + JWT + audit log |
| PII exposure | Auto-masking + explicit access grants |
| SQL injection | Parameterized queries + LLM validation |
| Malicious prompts | Intent schema validation + policy checks |
| Approval bypass | Immutable audit log + separation of duties |
| Data exfiltration | Rate limits + access logs + DLP |
| Insider threat | Audit trail + anomaly detection + approvals |
| Snapshot tampering | Cryptographic signatures + append-only storage |
| Policy circumvention | Multiple policy layers + approval for policy changes |

## Future Roadmap

### Phase 1 (Current - Frontend Demo)
- ✅ Core UI workflows
- ✅ LLM-assisted spec generation
- ✅ Evidence pack visualization
- ✅ Approval workflow mockup

### Phase 2 (Backend MVP)
- FastAPI orchestrator
- Postgres metadata DB
- Real policy engine (OPA)
- Basic authentication

### Phase 3 (Production Readiness)
- HA deployment (Kubernetes)
- Enterprise SSO (OIDC)
- Comprehensive testing
- Security audit

### Phase 4 (Advanced Features)
- Real-time lineage visualization
- Anomaly detection
- Natural language to dbt code
- Multi-tenant support
- Federation across banks

### Phase 5 (AI Enhancements)
- Predictive SLA monitoring
- Automated DQ rule suggestion
- Query optimization recommendations
- Policy conflict detection
- Auto-remediation workflows
