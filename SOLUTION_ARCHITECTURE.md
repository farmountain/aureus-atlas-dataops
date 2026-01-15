# AUREUS Platform - Solution Architecture

## System Overview

AUREUS is a governed agentic data platform that enables natural language interaction with enterprise data while maintaining strict governance, audit trails, and evidence-based controls.

## Architecture Layers

### Frontend Layer (This Application)
```
React/TypeScript Application
├─ Natural Language Interfaces
├─ Evidence Visualization
├─ Approval Workflows
├─ Real-time Policy Feedback
└─ LLM Integration (Spark API)
```

### Backend Services (Full System)
```
Orchestrator API (FastAPI)
├─ Config Copilot Service
├─ Query Service  
├─ Pipeline Service
├─ Metadata Service
└─ Approval Service
```

### Governance Layer
```
AUREUS Guard
├─ Goal-Guard FSM
├─ Policy Engine (OPA-style)
├─ Audit Logger
├─ Snapshot Manager
└─ Budget Enforcer
```

### Data Layer
```
Postgres Database
├─ Metadata Registry
├─ Audit Events
├─ Snapshots
├─ Approvals
└─ Query History
```

## Data Flow - Query Execution

```
User Question
  ↓
LLM Intent Analysis (measures, dimensions, filters)
  ↓
Dataset Identification (match to catalog)
  ↓
Policy Check (PII, jurisdiction, domain)
  ↓ [APPROVED]
SQL Generation (with schema context)
  ↓
Sandbox Execution
  ↓
Evidence Pack Generation
  ↓
Results Display + Audit Log
```

## Data Flow - Config Copilot

```
NL Description
  ↓
4 Parallel LLM Calls (contract, DQ, policy, SLA)
  ↓
JSON Schema Validation
  ↓
User Review
  ↓
Commit Request
  ↓
AUREUS Guard (policy check + audit + snapshot)
  ↓
Specs Written to /specs/
  ↓
Evidence Pack Generated
```

## AUREUS Guard FSM

```
IDLE
  ↓
INTENT_VALIDATION (parse and validate request)
  ↓
POLICY_CHECK (evaluate all policies)
  ↓ [PASS] ──┐
  ↓          ↓ [BLOCKED → audit + notify]
EXECUTION
  ↓
EVIDENCE_GEN
  ↓
COMPLETE
```

## Policy Evaluation Model

```typescript
interface PolicyCheck {
  policyName: string
  policyType: "access" | "quality" | "approval" | "budget"
  result: "allow" | "block" | "require_approval"
  reason: string
  metadata?: object
}
```

## Evidence Pack Structure

```
/evidence/{operation_type}_{id}/
├─ evidence.json (structured data)
├─ evidence.md (human-readable)
├─ inputs/ (request data)
├─ outputs/ (results)
├─ policy_checks/ (decisions)
└─ audit_refs.txt (event IDs)
```

## Technology Stack

### Frontend
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui v4
- Spark Runtime (LLM + KV storage)
- Framer Motion (animations)

### Backend (Production)
- FastAPI + Python 3.11
- Postgres (metadata)
- Redis (optional queue)
- OPA (policy engine)

### Deployment
- Docker Compose (dev/staging)
- Kubernetes (production)
- GitHub Actions (CI/CD)

## Security Model

### Authentication
- JWT tokens with role claims
- OIDC/SAML integration (production)
- MFA enforcement

### Authorization
- Role-based: Analyst, Approver, Admin, Viewer
- Policy-based access control
- Least privilege principle

### Data Protection
- PII auto-detection
- Field-level masking
- Cross-border controls
- Audit trail for all access

## Observability

### Metrics Tracked
- Token usage (estimated + actual)
- Query cost (heuristic-based)
- Latency (p50, p95, p99)
- Error rate (categorized)
- Policy violations

### Alerting
- Budget exceeded
- SLA violations
- High error rates
- Policy violations
- Approval delays

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Load balancer distribution
- Session affinity for approvals

### Caching Strategy
- Dataset metadata (5min TTL)
- Policy rules (1min TTL)
- Query results (optional, 30s)

### Rate Limiting
- Per-user token buckets
- Operation-specific limits
- Sliding window algorithm
