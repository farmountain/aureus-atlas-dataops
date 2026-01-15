# AUREUS Platform - Complete Feature Catalog

## Core Capabilities

### 1. Natural Language Query Engine
- Ask questions in plain English
- LLM generates SQL from intent + dataset schemas
- Policy enforcement (PII, jurisdiction, domain)
- Full lineage tracking
- Query history with audit trail

**Try**: "What is the total outstanding balance for high-risk loans?"

### 2. Dataset Catalog
- 5 sample datasets across banking domains
- Complete schema with PII indicators
- Freshness SLA monitoring
- Search and filter
- Jurisdiction and domain classification

### 3. Config Copilot (LLM-Assisted Spec Generation)
- Natural language → structured specs
- Generates 4 spec types:
  - Dataset contracts
  - DQ rules
  - Governance policies
  - SLA specifications
- JSON schema validation
- AUREUS Guard integration
- Evidence generation

### 4. Pipeline Management
- View and create transformation pipelines
- Auto-generate SQL models + tests
- Dev → UAT → Prod progression
- Approval gates for production
- Snapshot + rollback capability

### 5. Approval Workflows
- Role-based authorization (Analyst/Approver/Admin/Viewer)
- Pending request review
- Evidence pack review
- Immutable approval trail
- High-risk action gating

### 6. AUREUS Guard
- Goal-Guard FSM (state machine)
- 15+ pre-configured policies
- Budget enforcement (tokens, query costs)
- Audit logging
- Snapshot management
- Rollback capability

### 7. Observability Dashboard
- Token usage tracking
- Query cost estimation
- Latency monitoring
- Error tracking
- Budget enforcement
- Real-time metrics

### 8. Rate Limiting
- Per-user isolation
- Sliding window algorithm
- Operation-specific limits
- Evidence logging

### 9. Banking Domain Packs
- 6 core domains
- 3 complete demo scenarios
- Domain-specific glossaries
- Pre-configured policies

### 10. Evidence-Gated Development
- Every action produces evidence
- Structured JSON + Markdown
- Immutable audit trail
- Export capability

## Demo Scripts

Three end-to-end scenarios:
1. **Credit Risk Portfolio**: `./scripts/demo_credit_risk.sh`
2. **AML Alert Triage**: `./scripts/demo_fcc_triage.sh`
3. **Finance Reconciliation**: `./scripts/demo_finance_recon.sh`

## Sample Datasets

1. `customer_transactions` - Retail (15M records, High PII, Multi-jurisdiction)
2. `loan_portfolio` - Credit Risk (234K records, Low PII, US)
3. `aml_alerts` - Compliance (8.9K records, High PII, US)
4. `regulatory_reports` - Finance (1.2K records, No PII, Multi)
5. `trading_positions` - Treasury (45K records, No PII, US)

## Policy Examples

- **PII Access Requires Approval**: High-PII datasets need explicit approval
- **Cross-Jurisdiction Query Block**: Multi-region queries require legal review
- **Production Pipeline Deployment**: All prod changes need approval
- **AML Data Access Restriction**: AML/FCC data requires special authorization
- **Token Budget Limit**: 100K tokens per day per user
- **Query Cost Limit**: $10 per query maximum
