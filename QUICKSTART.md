# AUREUS Platform - Quick Start Guide

## What You're Looking At

AUREUS is a **bank-grade governed agentic data platform** that lets business users work with data using natural language while maintaining strict governance controls. This is a fully functional frontend demonstration with real LLM integration.

## 🚀 Getting Started (30 seconds)

The application is already running. Here's what to try first:

### 1. Ask a Data Question (Query Tab)
Click the "Ask" tab and try:
```
What is the total outstanding balance for high-risk loans?
```

**What happens:**
- LLM analyzes your question and identifies required datasets
- System checks policies (PII access, jurisdiction, etc.)
- LLM generates SQL with dataset schemas as context
- Query executes and returns results with full lineage
- Evidence pack generated (SQL, datasets, policy checks)

### 2. Browse Datasets (Datasets Tab)
- View 5 sample datasets across banking domains
- Click any dataset to see full schema
- Notice PII indicators, freshness SLAs, jurisdictions
- Try searching for "loan" or "transaction"

### 3. Check Approvals (Approvals Tab)
- See 2 pending approval requests
- Click one to review complete evidence
- Notice risk level badges and policy requirements
- In production: approve/reject with audit comments

## 📊 Sample Datasets Included

1. **customer_transactions** (Retail, High PII, 15M records)
   - Daily customer transaction records
   - Channels: ATM, Online, Branch, Mobile
   
2. **loan_portfolio** (Credit Risk, Low PII, 234K records)
   - Loan risk ratings, balances, collateral
   - For credit exposure analysis
   
3. **aml_alerts** (AML/FCC, High PII, 8.9K records)
   - Anti-money laundering alerts
   - Risk scores, dispositions, SAR filing status
   
4. **regulatory_reports** (Finance, No PII, 1.2K records)
   - Regulatory submissions by jurisdiction
   - Report types, statuses, submission dates
   
5. **trading_positions** (Treasury, No PII, 45K records)
   - Current trading positions by asset class
   - Unrealized P&L, market values

## 💡 Sample Questions to Try

### Credit Risk
- "What is the total outstanding balance for high-risk loans?"
- "Show me loan portfolio breakdown by risk rating"
- "Calculate average default probability"

### AML/Compliance
- "Show me all open AML alerts with risk score above 80"
- "How many alerts have been filed as SARs?"
- "List suspicious patterns detected this month"

### Retail Banking
- "What is the daily transaction volume by channel for the last 7 days?"
- "Compare ATM vs mobile transaction trends"
- "Show highest transaction volume channels"

### Treasury
- "Calculate unrealized P&L by asset class"
- "What are current trading positions?"
- "Show derivatives exposure"

## 🔐 Governance Features

### Policy Engine
Four active policies demonstrate governance:

1. **PII Access Requires Approval**
   - Triggers: High-PII dataset access
   - Result: Query requires approval before execution

2. **Cross-Jurisdiction Query Block**
   - Triggers: Multi-region data query
   - Result: Legal/compliance review required

3. **Production Pipeline Deployment**
   - Triggers: Deploy to production environment
   - Result: Engineering lead approval required

4. **AML Data Access Restriction**
   - Triggers: AML/FCC domain access
   - Result: AML team lead approval required

### Evidence Packs
Every action generates evidence including:
- ✅ Original request/question
- ✅ Generated SQL or spec
- ✅ Dataset lineage
- ✅ Policy check results with reasoning
- ✅ Execution time and timestamp
- ✅ Actor (who performed action)

View evidence by:
1. Executing a query → Results show full evidence
2. Clicking accordion sections (Results, SQL, Datasets, Policies)

## 🏢 Banking Domains

The platform is pre-configured with realistic banking domains:

| Domain | Purpose | Sample Dataset |
|--------|---------|----------------|
| **Credit Risk** | Loan portfolios, risk analysis | loan_portfolio |
| **AML/FCC** | Fraud detection, compliance | aml_alerts |
| **Finance** | Regulatory reporting | regulatory_reports |
| **Treasury** | Trading, market risk | trading_positions |
| **Retail** | Customer transactions | customer_transactions |
| **Operations** | Service metrics | (extensible) |

## 🎨 Design Features

### Status Badges
- **PII Level**: None, Low, High (with eye icon)
- **Jurisdiction**: US, EU, UK, APAC, Multi
- **Freshness**: Hours since last refresh vs SLA
- **Risk Level**: Low, Medium, High
- **Approval Status**: Pending, Approved, Rejected
- **Policy Results**: Allow, Require Approval, Block

### Color Coding
- **Navy Blue**: Primary actions, institutional trust
- **Electric Blue**: Accent, active states
- **Forest Green**: Success, compliant, approved
- **Amber**: Warning, at-risk, attention needed
- **Crimson**: Error, blocked, rejected, high risk

## 🔧 Technical Details

### LLM Integration
- **Provider**: Spark Runtime LLM API
- **Model**: GPT-4o
- **Mode**: JSON for structured outputs
- **Context**: Dataset schemas, policies, requirements

### Data Persistence
- **Storage**: Spark KV (survives page refresh)
- **Keys**: datasets, approvals, query_history, pipelines
- **Type**: TypeScript with full type safety

### Components
- **Framework**: React 19 with TypeScript
- **UI Library**: shadcn/ui v4 (40+ components)
- **Icons**: Phosphor Icons
- **Styling**: Tailwind CSS
- **Fonts**: IBM Plex Sans, JetBrains Mono

## 📁 File Structure

```
src/
  components/
    badges/           Status indicators (PII, Risk, etc.)
    dataset/          Dataset display cards
    views/            Main application tabs
      QueryView.tsx      Natural language query interface
      DatasetsView.tsx   Dataset catalog browser
      PipelinesView.tsx  Pipeline management
      ApprovalsView.tsx  Approval workflow queue
  lib/
    types.ts          TypeScript type definitions
    mockData.ts       Sample datasets and policies
    policyEngine.ts   Policy evaluation engine
    llmService.ts     LLM integration for spec generation
```

## 🚦 Workflow Examples

### Query Execution Flow
```
User enters question
  ↓
LLM generates intent schema
  ↓
System identifies required datasets
  ↓
Policy engine evaluates access
  ↓
  ├─ Blocked → Show reason
  ├─ Requires Approval → Queue for review
  └─ Allowed → Continue
      ↓
LLM generates SQL with schema context
      ↓
Execute query (sandbox, read-only)
      ↓
Generate evidence pack
      ↓
Display results + lineage + policies
      ↓
Save to query history
```

### Approval Workflow
```
User requests high-risk action
  ↓
Policy check: requires_approval
  ↓
Create approval request
  ↓
Approver views request
  ↓
Reviews evidence pack
  ↓
Decides: Approve or Reject
  ↓
Audit log records decision
  ↓
If approved: Execute with snapshot
If rejected: Notify requester
```

## 🎯 Key Interactions

### In Query Tab
1. Type or click sample question
2. Click "Ask Question" button
3. Watch LLM generate and execute
4. Expand accordion sections to see evidence
5. Click query history to reload previous results

### In Datasets Tab
1. Browse dataset cards
2. Use search to filter
3. Click card to see full schema
4. Notice PII fields marked with ⚠️
5. Check freshness vs SLA

### In Approvals Tab
1. View pending approvals (2 pre-loaded)
2. Click approval to review
3. See risk level and evidence
4. Add approval comment
5. Approve or reject (simulated)

## 📚 Documentation

Four comprehensive docs included:

1. **README.md**: Overview and quick start
2. **ARCHITECTURE.md**: System design and full-stack architecture
3. **SOLUTION.md**: Implementation details and decisions
4. **THREAT_MODEL.md**: Security risks and mitigations
5. **PRD.md**: Product requirements and design decisions

## 💻 For Developers

### Type Safety
All data structures fully typed:
```typescript
interface Dataset {
  id: string;
  name: string;
  domain: Domain;
  schema: Column[];
  piiLevel: PIILevel;
  // ... more fields
}
```

### Adding New Datasets
Edit `src/lib/mockData.ts`:
```typescript
export const SAMPLE_DATASETS: Dataset[] = [
  // Add your dataset here
  {
    id: 'ds-006',
    name: 'your_dataset',
    domain: 'credit_risk',
    // ... complete definition
  }
];
```

### Adding New Policies
Edit `src/lib/mockData.ts`:
```typescript
export const SAMPLE_POLICIES: Policy[] = [
  {
    id: 'pol-005',
    name: 'Your Policy Name',
    type: 'access',
    condition: 'your condition',
    action: 'require_approval',
    // ... more config
  }
];
```

## 🔮 Future Enhancements

Ready to extend with:
- [ ] Real backend API integration
- [ ] Actual dataset onboarding workflow
- [ ] Pipeline generation wizard
- [ ] Lineage graph visualization
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Custom policy builder UI
- [ ] Evidence pack export (PDF)
- [ ] Multi-tenant support

## ❓ FAQ

**Q: Does this query real data?**
A: No, results are simulated. The SQL generation and policy checks are real, but execution returns mock data appropriate to the query domain.

**Q: Are the LLM calls real?**
A: Yes! The platform uses Spark's real LLM API (GPT-4o) to generate SQL, specs, and contracts.

**Q: Does approval actually work?**
A: The UI is fully functional, but in this demo, approvals show toast notifications rather than executing actions. Easy to connect to real backend.

**Q: Is state saved?**
A: Yes! All data (datasets, approvals, query history) is stored in Spark KV and survives page refreshes.

**Q: Can I modify datasets?**
A: Yes, edit `src/lib/mockData.ts` to add/modify datasets, policies, or approvals. Changes appear immediately.

**Q: Is this production-ready?**
A: The frontend is production-ready. For production deployment, connect to backend services (FastAPI, Postgres, OPA) as documented in ARCHITECTURE.md.

## 🎓 Learning Path

1. **First 5 minutes**: Try the sample questions
2. **Next 10 minutes**: Browse datasets, check schemas
3. **Next 10 minutes**: Review approval workflow
4. **Next 30 minutes**: Read ARCHITECTURE.md
5. **Next 30 minutes**: Explore code in `src/components/views/`
6. **Next 1 hour**: Understand LLM integration in `lib/llmService.ts`

## 🤝 Contributing

To extend this application:
1. Add new components in `src/components/`
2. Extend types in `src/lib/types.ts`
3. Add services in `src/lib/`
4. Update views in `src/components/views/`
5. Follow existing patterns for consistency

## 📞 Support

For questions or issues:
1. Check the documentation files (README, ARCHITECTURE, SOLUTION)
2. Review component source code (well-commented)
3. Inspect browser console for detailed logs

---

**Built with Spark** • A demonstration of bank-grade governed agentic data platform UX

**Status**: ✅ Fully Functional Frontend • 🔄 Backend Integration Ready
