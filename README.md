# AUREUS Platform - Governed Agentic Data Platform

A bank-grade LLM-assisted data platform frontend demonstrating governed, evidence-based data operations with natural language interfaces.

## Overview

AUREUS is a **frontend demonstration** of a comprehensive governed data platform designed for banking and financial services. It showcases the complete user experience for:

- **Natural Language Queries**: Ask data questions in plain English, get SQL + results + evidence
- **Dataset Onboarding**: LLM-assisted data contract generation with governance checks
- **Pipeline Generation**: Transform data with auto-generated SQL, tests, and DQ checks
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

### Running Locally

The application is pre-configured and ready to run:

```bash
# No build step needed - runs directly in Spark runtime
# Simply open in your Spark environment
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

#### 4. Review Approvals (Approvals Tab)
- See pending approval requests with risk levels
- Review complete evidence packs
- Approve or reject with audit comments
- All decisions are recorded immutably

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

### Phase 3 (Production Ready)
- HA deployment (K8s)
- Enterprise SSO
- Comprehensive testing
- Security audit

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

## License

Copyright © 2024. All rights reserved.

## Support

For questions or issues:
1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. Check [PRD.md](./PRD.md) for product requirements
3. Examine component code for implementation details

---

**Note**: This is a frontend demonstration. For a production deployment, the full backend architecture (FastAPI, Postgres, OPA, Docker Compose) would be required as documented in ARCHITECTURE.md.
