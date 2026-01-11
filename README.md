# AUREUS Platform - Governed Agentic Data Platform

A bank-grade LLM-assisted data platform frontend demonstrating governed, evidence-based data operations with natural language interfaces.

## Overview

AUREUS is a **frontend demonstration** of a comprehensive governed data platform designed for banking and financial services. It showcases the complete user experience for:

- **Natural Language Queries**: Ask data questions in plain English, get SQL + results + evidence
- **Dataset Onboarding**: LLM-assisted data contract generation with governance checks
- **Pipeline Generation**: Transform data with auto-generated SQL, tests, and DQ checks
- **Config Copilot**: Natural language → structured specs (contracts, DQ rules, policies, SLAs)
- **Approval Workflows**: Human-in-the-loop governance for high-risk operations

## Key Features

### Evidence-Gated Development (EGD)
Every action generates verifiable evidence including:
- Policy compliance checks
- Dataset lineage
- Generated code artifacts
- Test results
- Approval trails

### AUREUS Controls
- **Goal-Guard FSM**: State machine governing action progression
- **Policy Engine**: Simulated OPA-style policy evaluation
- **Audit Log**: Immutable record of all actions
- **Snapshots**: Rollback capability for deployments
- **Approval Gates**: Required approvals for high-risk actions

### Banking Domains
Pre-configured domains reflecting real banking operations:
- **Credit Risk**: Loan portfolios, risk ratings, exposure analysis
- **AML/FCC**: Anti-money laundering alerts, compliance monitoring
- **Finance/Reg Reporting**: Regulatory reports, financial statements
- **Treasury/Markets**: Trading positions, market risk, liquidity
- **Retail/Channels**: Customer transactions, account activity
- **Operations/Service**: Operational metrics, service quality

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

## License

Copyright © 2024. All rights reserved.

## Support

For questions or issues:
1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. Check [PRD.md](./PRD.md) for product requirements
3. See [Deployment Guide](./docs/deployment-guide.md) for deployment procedures
4. Consult [Runbooks](./runbooks/) for operational procedures

---

**Note**: This application includes both frontend demonstration capabilities (Spark runtime) and production-ready deployment assets (Docker, Kubernetes, runbooks). For production deployment, follow the [Deployment Guide](./docs/deployment-guide.md).
