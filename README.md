# AUREUS Platform - Governed Agentic Data Platform

A bank-grade LLM-assisted data platform frontend demonstrating governed, evidence-based data operations with natural language interfaces.

Quick Demo Link: https://aureus-atlas-dataops--farmountain.github.app/

## Overview

AUREUS is a **production-ready frontend demonstration** of a comprehensive governed data platform designed for banking and financial services. It showcases the complete user experience for:

- **Natural Language Queries**: Ask data questions in plain English, get SQL + results + evidence
- **Dataset Catalog & Onboarding**: Browse datasets, view metadata, LLM-assisted contract generation
- **Pipeline Generation**: Transform data with auto-generated SQL, tests, and DQ checks
- **Config Copilot**: Natural language → structured specs (contracts, DQ rules, policies, SLAs)
- **Approval Workflows**: Human-in-the-loop governance for high-risk operations
- **Guard Controls**: Real-time policy enforcement, audit trails, and rollback capabilities
- **Observability**: Token tracking, query cost estimation, latency monitoring, budget controls

## What Makes AUREUS Unique

### Evidence-Gated Development (EGD)
Every action produces verifiable evidence: policy checks, dataset lineage, generated artifacts, test results, approval trails.

### AUREUS Guard Runtime
- **Goal-Guard FSM**: State machine controlling all action progression
- **Policy Engine**: 15+ pre-configured OPA-style policies
- **Audit Log**: Immutable record of every action and decision
- **Snapshots**: Rollback capability for all deployments
- **Budget Enforcement**: Token limits, query costs, rate limits

### Banking-Grade Governance
- PII auto-detection and masking
- Cross-jurisdiction controls
- Role-based authorization (Analyst/Approver/Admin/Viewer)
- High-risk action approval gates
- Complete audit trails for regulatory compliance

### Real LLM Integration
- Uses Spark's `spark.llm()` API for production-quality generation
- Generates dataset contracts, DQ rules, policies, SLAs from natural language
- SQL generation with schema awareness
- Multi-turn intent clarification

## Key Features

### 1. Natural Language Query Engine
**What it does**: Ask banking questions in plain English and get SQL + results + complete evidence trail
- **LLM-powered intent analysis**: Extracts measures, dimensions, filters, time ranges from natural language
- **Automatic dataset identification**: Matches query intent to appropriate datasets from catalog
- **SQL generation with schema awareness**: Creates valid SQL using actual schema definitions
- **Policy enforcement**: Checks PII access, jurisdiction rules, domain restrictions before execution
- **Citation & lineage**: Every result shows which datasets were used and their freshness status
- **Query history**: Persistent audit trail of all queries with replay capability

**Use cases**:
- "What is the total outstanding balance for high-risk loans?"
- "Show me AML alerts with risk score above 80"
- "Calculate daily transaction volume by channel for the last 7 days"

### 2. Dataset Catalog & Metadata Management
**What it does**: Comprehensive registry of all governed datasets with rich metadata
- **Dataset cards**: Schema, PII levels, jurisdiction, freshness SLA, owner, record counts
- **Search & filter**: Find datasets by name, description, domain, or tags
- **Schema browser**: View complete schema with field-level PII detection
- **Governance indicators**: Visual badges for PII level, jurisdiction, freshness status
- **Domain organization**: Pre-configured for 6 banking domains

**Included datasets**:
- `customer_transactions` - Retail banking (15M records, High PII, Multi-jurisdiction)
- `loan_portfolio` - Credit risk (234K records, Low PII, US only)
- `aml_alerts` - Compliance (8.9K records, High PII, US only)
- `regulatory_reports` - Finance (1.2K records, No PII, Multi-jurisdiction)
- `trading_positions` - Treasury (45K records, No PII, US only)

### 3. Config Copilot - LLM-Assisted Specification Generation
**What it does**: Transforms natural language descriptions into complete, validated governance specifications
- **Four spec types generated**:
  - **Dataset Contract**: Schema, PII classification, jurisdiction, retention policy, SLA
  - **DQ Rules**: Completeness, uniqueness, validity, consistency, timeliness checks
  - **Governance Policies**: Access control, data masking, approval workflows, purpose limitation
  - **SLA Specifications**: Freshness, availability, quality, latency targets with alerting thresholds
- **JSON Schema validation**: All specs validated against formal schemas with detailed error reporting
- **AUREUS Guard integration**: Policy checks, audit logging, snapshot creation before commit
- **Evidence generation**: Complete audit trail with spec diffs, validation results, policy decisions
- **Version control**: All specs versioned and stored in `/specs/` directory

**Sample input**:
```
I need a credit card transaction dataset with PII masking, 
daily freshness, and fraud detection quality checks for 
real-time monitoring in the US jurisdiction...
```

**Output**:
- Dataset contract with 12+ fields, PII flags, retention rules
- 5-8 DQ rules covering required checks
- 3-5 governance policies (access, masking, approval)
- Complete SLA definition with 4 target types

### 4. Pipeline Generation & Management
**What it does**: Auto-generate data transformation pipelines with SQL, tests, and DQ checks
- **Pipeline specifications**: Source datasets, target dataset, transformation logic
- **SQL model generation**: Production-ready SQL code with proper schema references
- **Automated test creation**: Schema tests, DQ tests, reconciliation stubs
- **Environment progression**: Dev → UAT → Prod with approval gates
- **Snapshot & rollback**: Every deployment creates snapshot with rollback plan
- **Evidence packs**: Generated files, test results, guard decisions all documented

**Capabilities**:
- View existing pipelines with metadata
- Create new pipelines from specs
- Deploy with approval workflow
- Rollback to previous versions

### 5. Approval Workflow System
**What it does**: Human-in-the-loop governance for high-risk operations
- **Role-based authorization**: Analyst, Approver, Admin, Viewer roles with different permissions
- **Approval request tracking**: View all pending/approved/rejected requests
- **Evidence review**: Complete context available before decision
- **Risk level indicators**: High/Medium/Low risk classification
- **Immutable audit trail**: All approval decisions logged permanently
- **Execution on approval**: Approved actions execute with snapshot + audit event

**Requires approval for**:
- Production deployments (High risk)
- Policy changes (High risk)
- High PII dataset access (Medium risk)
- Cross-border data operations (Medium risk)

### 6. AUREUS Guard - Governance Runtime
**What it does**: Real-time policy enforcement and state management
- **Goal-Guard FSM**: State machine controlling action progression
  - States: IDLE → INTENT_VALIDATION → POLICY_CHECK → EXECUTION → EVIDENCE_GEN → COMPLETE
  - Violations trigger: BLOCKED → audit + notify
- **Policy evaluation**: OPA-style policy engine with 15+ pre-configured policies
- **Budget enforcement**: Token limits, query cost limits, rate limits
- **Audit logging**: Every state transition logged with full context
- **Snapshot management**: Immutable snapshots of all deployments
- **Rollback capability**: Restore to any previous snapshot

**Policy categories**:
- PII access control (3 policies)
- Cross-jurisdiction restrictions (2 policies)
- Production write controls (3 policies)
- High-risk action gates (4 policies)
- Budget & rate limits (3 policies)

### 7. Observability & Cost Controls
**What it does**: Track usage, costs, and enforce budgets across all operations
- **Token tracking**: Estimated + actual token usage per LLM call
- **Query cost estimation**: Heuristic-based cost prediction for queries
- **Latency monitoring**: Response time tracking for all operations
- **Error tracking**: Categorized error logging with context
- **Budget enforcement**: Block execution when budgets exceeded
- **Metrics dashboard**: Real-time view of platform usage and health

**Tracked metrics**:
- Total tokens used (with budget enforcement)
- Query count & costs (with per-query limits)
- Average latency (with SLO targets)
- Error rate (with alerting thresholds)
- Policy violations (with audit trail)

### 8. Evidence-Gated Development (EGD)
**What it does**: Every significant action produces auditor-ready evidence
- **Structured evidence packs**: JSON + Markdown for every operation
- **Complete audit trail**: Inputs, outputs, policy decisions, approvals, timestamps
- **Immutable storage**: Evidence cannot be modified after creation
- **Tamper detection**: Cryptographic signatures (simulated in frontend)
- **Evidence browser**: Search and view all historical evidence packs
- **Export capability**: Download evidence for regulatory review

**Evidence generated for**:
- Query execution (SQL, results, policy checks, lineage)
- Config generation (specs, validation results, commits)
- Pipeline deployment (code, tests, approvals)
- Approval decisions (requests, reviews, outcomes)
- Policy violations (blocks, context, recommendations)

### 9. Rate Limiting & Abuse Prevention
**What it does**: Protect platform resources and enforce fair usage
- **Per-user rate limits**: Isolated limits prevent one user blocking others
- **Sliding window algorithm**: Smooth rate limiting with automatic cleanup
- **Operation-specific limits**:
  - Query execution: 10 requests / 60 seconds
  - Pipeline deployment: 3 requests / 60 seconds
  - Config generation: 5 requests / 60 seconds
  - PII access: 5 requests / 60 seconds
  - Approval requests: 20 requests / 60 seconds
- **Descriptive errors**: Clear messages when limits exceeded
- **Evidence logging**: Rate limit violations logged for audit

### 10. Banking Domain Packs
**What it does**: Pre-configured domain models for common banking use cases
- **Domain taxonomy**: 6 core banking capability areas documented
- **Sample data packs**: 3 complete demo scenarios with synthetic data
- **Domain-specific glossaries**: Banking terms and definitions
- **Pre-configured policies**: Domain-appropriate governance rules

**Domains**:
1. **Credit Risk**: Loan portfolios, risk ratings, exposure, PD/LGD/EAD calculations
2. **AML/FCC**: Alert triage, SAR filing, transaction monitoring, KYC
3. **Finance/Reg Reporting**: Regulatory reports, GL reconciliation, submissions
4. **Treasury/Markets**: Trading positions, P&L, VaR, collateral management
5. **Retail/Channels**: Customer transactions, account activity, channel analytics
6. **Operations/Service**: Operational metrics, SLA monitoring, incident tracking

## Technology Stack

### Frontend (This Application)
- **React 19** + **TypeScript** - Type-safe UI components
- **Tailwind CSS** - Utility-first styling with custom bank theme
- **shadcn/ui v4** - Accessible, composable UI components
- **Phosphor Icons** - Comprehensive icon system
- **Framer Motion** - Purposeful animations
- **Sonner** - Toast notifications
- **Spark Runtime** - LLM integration + KV storage

### Design System
- **Typography**: IBM Plex Sans (primary), JetBrains Mono (code)
- **Colors**: Deep navy primary, electric blue accent, status indicators
- **Theme**: Professional, trustworthy, institutional authority
- **Approach**: High information density with clear hierarchy

## Quick Start

This is a Spark application that runs entirely in the browser with no backend required for the demo.

### Running Locally (Development)

The application is pre-configured and ready to run:

```bash
# Development mode (Spark runtime)
# Simply open in your Spark environment

# OR local development
npm install
npm run dev
# Application available at http://localhost:5173
```

### Running with Docker Compose

```bash
# Development mode with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production mode
docker compose up -d

# Access application at http://localhost:5000
```

### Deploying to Kubernetes

See [Deployment Guide](./docs/deployment-guide.md) for comprehensive instructions.

```bash
# Quick deployment
./scripts/deploy-check.sh --environment production
kubectl apply -f k8s/
kubectl rollout status deployment/aureus-frontend -n aureus
```

### Using the Platform

#### 1. Ask Questions (Query Tab)
```
Try: "What is the total outstanding balance for high-risk loans?"
```
- Type your question in natural language
- System generates SQL, checks policies, executes query
- View results, SQL, lineage, and policy checks
- Query history auto-saved for audit trail

#### 2. Browse Datasets (Datasets Tab)
- View all governed datasets across domains
- Filter by name, description, or domain
- Click any dataset to see full schema and metadata
- Identify PII fields, jurisdictions, freshness SLAs

#### 3. Manage Pipelines (Pipelines Tab)
- View existing data transformation pipelines
- Create new pipelines with LLM assistance
- Each pipeline includes SQL, tests, and DQ checks
- Requires approval for production deployment

#### 4. Config Copilot (Config Tab) 🆕
```
Try: "I need a credit card transaction dataset with PII masking, 
daily freshness, and fraud detection quality checks..."
```
- Describe data requirements in natural language
- System generates complete specifications:
  - Dataset Contract (schema, PII level, jurisdiction, SLA)
  - DQ Rules (completeness, uniqueness, validity checks)
  - Governance Policies (access control, masking, approvals)
  - SLA Specifications (freshness, availability, quality targets)
- Review generated specs with validation results
- Commit to create versioned specs + snapshot + audit trail
- All operations evidence-gated with full AUREUS guard integration

**Sample Inputs**: See [examples/config_copilot_samples.md](./examples/config_copilot_samples.md) for 3 detailed examples

#### 5. Review Approvals (Approvals Tab) 🆕
- See pending approval requests with risk levels
- **Role-based authorization**: Switch between analyst/approver/admin/viewer roles
- Review complete evidence packs before deciding
- **Approve**: Executes action with snapshot + audit trail (approver/admin only)
- **Reject**: Blocks action with audit comment (approver/admin only)
- All decisions are recorded immutably
- **High-risk actions requiring approval**:
  - Production deployments
  - Policy changes
  - High PII dataset access

**Implementation Details**: See [CONTROL_EDIT_APPROVALS.md](./CONTROL_EDIT_APPROVALS.md) for complete technical documentation

## End-to-End Demo Scripts

**NEW**: Three complete demo scenarios showcase the platform's value with full evidence generation:

### 1. Credit Risk Portfolio Monitoring
```bash
./scripts/demo_credit_risk.sh
```
- Generates specs for loan portfolio analysis
- Creates reconciliation pipeline with automated tests
- Executes risk exposure queries with policy checks
- **Evidence**: Complete audit trail in `evidence/credit_risk_portfolio_*/`

### 2. FCC/AML Alert Triage
```bash
./scripts/demo_fcc_triage.sh
```
- Manages HIGH PII compliance data with approval gates
- Builds real-time alert prioritization pipeline
- Demonstrates cross-border jurisdiction controls
- **Evidence**: Enhanced compliance pack in `evidence/fcc_aml_triage_*/`

### 3. Finance Regulatory Reconciliation
```bash
./scripts/demo_finance_recon.sh
```
- GL-to-regulatory-report reconciliation workflow
- SOX compliance controls with material variance detection
- Control totals and submission deadline tracking
- **Evidence**: Auditor-ready pack in `evidence/finance_reconciliation_*/`

Each script demonstrates:
✅ Config Copilot: NL → structured specs → validation → commit  
✅ Pipeline Generation: SQL models + tests + DQ checks  
✅ Approval Gates: High-risk actions require authorization  
✅ Query Execution: Policy enforcement + budget tracking  
✅ Evidence Packs: Complete audit trail with rollback capability  

**Run all demos:**
```bash
./scripts/demo_credit_risk.sh
./scripts/demo_fcc_triage.sh
./scripts/demo_finance_recon.sh
```

## Sample Questions to Try

### Credit Risk
- "What is the total outstanding balance for high-risk loans?"
- "Show me loan portfolio breakdown by risk rating"
- "Calculate default probability distribution"

### AML/FCC
- "Show me all open AML alerts with risk score above 80"
- "What percentage of alerts resulted in SARs?"
- "List suspicious patterns detected this month"

### Retail/Channels
- "What is the daily transaction volume by channel for the last 7 days?"
- "Compare ATM vs mobile transaction trends"
- "Show highest transaction volume channels"

### Treasury/Markets
- "Calculate unrealized P&L by asset class"
- "What are current trading positions?"
- "Show derivatives exposure by instrument type"

## Architecture

### Current Implementation (Frontend Demo)
```
Browser
  ├─ React UI Components
  ├─ LLM Service (Spark LLM API)
  ├─ Policy Engine (Simulated)
  ├─ Mock Data Layer
  └─ KV Storage (Spark useKV)
```

### Production Architecture (Full System)
See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete system design including:
- FastAPI backend services
- Postgres metadata database
- OPA policy engine
- Docker Compose orchestration
- Kubernetes deployment
- CI/CD pipeline

## Evidence Packs

Every significant action generates an evidence pack containing:

```json
{
  "id": "evd-xxxxx",
  "timestamp": "2024-01-15T10:30:00Z",
  "eventType": "query",
  "actor": "john.analyst",
  "inputs": { "question": "...", "datasets": [...] },
  "outputs": { "sql": "...", "results": [...] },
  "policyChecks": [
    {
      "policyName": "PII Access Requires Approval",
      "result": "require_approval",
      "reason": "Query accesses high-PII datasets"
    }
  ],
  "signature": "sha256:..."
}
```

Evidence packs are:
- **Immutable**: Cannot be modified after creation
- **Signed**: Cryptographically verifiable (simulated)
- **Complete**: Include all inputs, outputs, decisions
- **Auditable**: Available for regulatory review

## Policy Engine

Simulated OPA-style policy evaluation:

### Sample Policies
1. **PII Access Requires Approval**: High-PII datasets need explicit approval
2. **Cross-Jurisdiction Query Block**: Multi-region queries require legal review
3. **Production Pipeline Deployment**: All prod changes need approval
4. **AML Data Access Restriction**: AML/FCC data requires special authorization

### Policy Results
- **Allow**: Action proceeds immediately
- **Block**: Action prevented, user notified
- **Require Approval**: Action queued for human review

## Data Model

### Datasets
- ID, name, domain, owner
- Schema with PII detection
- Jurisdiction, freshness SLA
- Record counts, tags

### Policies
- Type (access, quality, retention, approval)
- Conditions, actions, scope
- Approver lists

### Approvals
- Request type, requester, timestamp
- Risk level, description
- Evidence pack reference
- Status, approver, decision

### Query History
- Question, SQL, datasets
- Results, execution time
- Policy checks, timestamp

## Security Considerations

### Rate Limiting ✅
Implemented to prevent abuse and ensure fair resource usage:

| Operation | Limit | Window | Purpose |
|-----------|-------|--------|---------|
| Query Execution | 10 requests | 60 seconds | Prevent query flooding, resource exhaustion |
| Pipeline Deploy | 3 requests | 60 seconds | Prevent deployment spam, costly operations |
| Config Generation | 5 requests | 60 seconds | Control LLM token usage |
| PII Access | 5 requests | 60 seconds | Add friction to sensitive data access |
| Approval Requests | 20 requests | 60 seconds | Prevent approval system abuse |

**Features**:
- Per-user isolation (one user cannot block another)
- Sliding window algorithm with automatic cleanup
- Descriptive error messages when limits exceeded
- Rate limits enforced before policy checks for efficiency
- Evidence generated for rate limit violations

### Authentication (Simulated)
In production:
- JWT tokens with role claims
- OIDC/SAML integration
- MFA enforcement

### Authorization
- Policy-based access control
- Least privilege principle
- Role-based permissions

### Data Protection
- PII auto-detection
- Field-level masking
- Cross-border controls
- Audit trail for all access

## Development

### File Structure
```
src/
  ├─ components/
  │  ├─ badges/          # Status indicators
  │  ├─ dataset/         # Dataset cards
  │  ├─ ui/              # shadcn components
  │  └─ views/           # Main tab views
  ├─ lib/
  │  ├─ types.ts         # TypeScript types
  │  ├─ mockData.ts      # Sample datasets/policies
  │  ├─ policyEngine.ts  # Policy evaluation
  │  ├─ llmService.ts    # LLM integration
  │  └─ utils.ts         # Helpers
  ├─ App.tsx             # Root component
  └─ index.css           # Theme & styles
```

### Key Technologies
- **useKV**: Persistent state (survives refresh)
- **spark.llm()**: Real LLM integration
- **shadcn/ui**: Accessible components
- **Tailwind**: Utility-first CSS

## Roadmap

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full roadmap including:

### Phase 1 (Current)
- ✅ Core UI workflows
- ✅ LLM-assisted spec generation
- ✅ Evidence visualization
- ✅ Approval workflow mockup

### Phase 2 (Backend MVP)
- FastAPI orchestrator
- Postgres metadata DB
- Real OPA policies
- Basic authentication

### Phase 3 (Production Ready) ✅
- ✅ HA deployment (K8s manifests with 3 replicas, HPA, PDB)
- ✅ Docker Compose orchestration
- ✅ Comprehensive runbooks (incident response, rollback, audit retrieval)
- ✅ Data retention policy
- ✅ SLO definitions (13 SLOs covering availability, performance, compliance)
- ✅ Deployment automation scripts
- ✅ Evidence export utilities
- Enterprise SSO (planned)
- Security audit (planned)

### Phase 4 (Advanced Features)
- Real-time lineage graphs
- Anomaly detection
- dbt code generation
- Multi-tenant support

### Phase 5 (AI Enhancements)
- Predictive SLA monitoring
- Auto DQ rule generation
- Query optimization
- Policy conflict detection

## Production Deployment

### Quick Links
- 📘 [Deployment Guide](./docs/deployment-guide.md) - Complete deployment procedures
- 🚨 [Incident Response](./runbooks/incident-response.md) - Emergency procedures
- ⏮️ [Rollback Procedure](./runbooks/rollback-procedure.md) - Rollback guide
- 📊 [SLO Definitions](./docs/slo-definitions.md) - Performance targets
- 📦 [Data Retention Policy](./docs/data-retention-policy.md) - Compliance requirements
- 🔍 [Audit Evidence Retrieval](./runbooks/audit-evidence-retrieval.md) - Evidence export

### Production Readiness Checklist

✅ **Infrastructure**
- Docker Compose for local/staging environments
- Kubernetes manifests (Deployment, Service, Ingress, ConfigMap, HPA, PDB)
- Network policies for traffic isolation
- Persistent storage for evidence

✅ **Operational Procedures**
- Incident response runbook with 5 common scenarios
- Rollback procedures for 5 change types
- Audit evidence retrieval procedures
- Pre-deployment validation script
- Evidence export utility

✅ **Compliance & Governance**
- Data retention policy (7-year audit logs, 3-year query history)
- 13 comprehensive SLOs (availability, latency, compliance)
- Audit trail requirements (100% coverage)
- Evidence-based change management

✅ **Security**
- Non-root containers with read-only root filesystem
- TLS/SSL configuration with cert-manager
- Secret management (Kubernetes Secrets, external options)
- Network policies for ingress/egress control
- Security headers in Nginx configuration

✅ **Monitoring & Alerting**
- Health check endpoints
- Resource limits and requests
- Liveness, readiness, startup probes
- SLO-based alerting thresholds
- Multi-window burn rate alerts

### Getting Started with Production Deployment

```bash
# 1. Validate environment
./scripts/deploy-check.sh --environment production --namespace aureus

# 2. Create secrets (replace placeholder values!)
kubectl create namespace aureus
kubectl create secret generic aureus-secrets \
  --from-literal=database.password='YOUR_STRONG_PASSWORD' \
  --from-literal=redis.password='YOUR_STRONG_PASSWORD' \
  -n aureus

# 3. Deploy
kubectl apply -f k8s/

# 4. Monitor rollout
kubectl rollout status deployment/aureus-frontend -n aureus

# 5. Verify
kubectl get pods -n aureus
curl https://your-domain.com/health
```

## Documentation Index

### Product Documentation
- 📋 **[FEATURES.md](./FEATURES.md)** - Complete feature catalog with examples
- 📐 **[SOLUTION_ARCHITECTURE.md](./SOLUTION_ARCHITECTURE.md)** - Technical architecture and data flows
- 🗺️ **[ROADMAP.md](./ROADMAP.md)** - Product roadmap and future enhancements
- 📘 **[PRD.md](./PRD.md)** - Product requirements and design decisions

### Technical Documentation
- 🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed system architecture
- 🔐 **[SECURITY.md](./SECURITY.md)** - Security controls and hardening
- ⚠️ **[THREAT_MODEL.md](./THREAT_MODEL.md)** - Threat analysis (STRIDE)
- 🛡️ **[GUARD_DOCS_INDEX.md](./GUARD_DOCS_INDEX.md)** - AUREUS Guard documentation

### Operational Documentation
- 🚀 **[Deployment Guide](./docs/deployment-guide.md)** - Complete deployment procedures
- 🚨 **[Incident Response](./runbooks/incident-response.md)** - Emergency procedures
- ⏮️ **[Rollback Procedure](./runbooks/rollback-procedure.md)** - Rollback guide
- 📊 **[SLO Definitions](./docs/slo-definitions.md)** - Performance targets
- 📦 **[Data Retention Policy](./docs/data-retention-policy.md)** - Compliance requirements
- 🔍 **[Audit Evidence Retrieval](./runbooks/audit-evidence-retrieval.md)** - Evidence export

### Implementation Summaries
- **[CONFIG_COPILOT_SUMMARY.md](./CONFIG_COPILOT_SUMMARY.md)** - Config Copilot implementation
- **[CONTROL_EDIT_APPROVALS.md](./CONTROL_EDIT_APPROVALS.md)** - Approval workflow details
- **[CONTROL_EDIT_OBSERVABILITY.md](./CONTROL_EDIT_OBSERVABILITY.md)** - Observability implementation
- **[CONTROL_EDIT_RATE_LIMITING.md](./CONTROL_EDIT_RATE_LIMITING.md)** - Rate limiting details
- **[DEMO_SCRIPTS_SUMMARY.md](./DEMO_SCRIPTS_SUMMARY.md)** - Demo scenario documentation

### Domain Packs
- **[Banking Capability Map](./docs/banking-capability-map.md)** - Domain taxonomy
- **[Domain Pack Examples](./examples/)** - Sample configurations

## License

Copyright © 2024. All rights reserved.

## Support

For questions or issues:
1. Start with **[FEATURES.md](./FEATURES.md)** for capability overview
2. Review **[SOLUTION_ARCHITECTURE.md](./SOLUTION_ARCHITECTURE.md)** for technical design
3. Check **[ROADMAP.md](./ROADMAP.md)** for future plans
4. Consult **[Runbooks](./runbooks/)** for operational procedures

---

**Note**: This application includes both frontend demonstration capabilities (Spark runtime) and production-ready deployment assets (Docker, Kubernetes, runbooks). For production deployment, follow the [Deployment Guide](./docs/deployment-guide.md).
