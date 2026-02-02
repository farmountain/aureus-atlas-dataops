# AUREUS Platform - Demo Walkthrough Script

## Pre-Demo Setup (5 minutes before)

### 1. Start Backend Services
```powershell
cd D:\All_Projects\aureus-atlas-dataops
docker-compose -f docker-compose.backend.yml up -d
Start-Sleep -Seconds 15
```

### 2. Verify Backend Health
```powershell
Invoke-RestMethod -Uri 'http://localhost:8001/health' -Method Get
```
Expected: `status: healthy`

### 3. Start Frontend
```powershell
npm run dev
```
Frontend will be available at http://localhost:5001

### 4. Open Browser Tabs
- Tab 1: http://localhost:5001 (AUREUS Frontend)
- Tab 2: http://localhost:8001/docs (API Documentation)
- Tab 3: docs/SALES_DECK.md (Reference)

---

## Demo Script (15-20 minutes)

### Introduction (2 minutes)

**Talking Points:**
- "Welcome! Today I'll show you AUREUS - a governed agentic data platform designed specifically for banking and financial services."
- "We've seen that 70% of data analyst time is spent on repetitive tasks. AUREUS automates these while maintaining bank-grade governance."
- "I'll walk you through three real scenarios: Credit Risk Analysis, AML Triage, and Dataset Onboarding."

---

### Scenario 1: Credit Risk Portfolio Analysis (5 minutes)

**Navigate to:** Query Interface

**Demo Flow:**

1. **Show the Interface**
   - "This is our natural language query interface. No SQL knowledge required."
   - Point out: Dataset selector, Query input, Guard controls indicator

2. **Execute First Query**
   ```
   Query: "What is the total outstanding balance for high-risk loans?"
   Dataset: Credit Risk - Loan Portfolio
   ```
   
   **Highlight:**
   - Query submitted → Guard checks → SQL generated → Results returned
   - Show the generated SQL in the results panel
   - Point to evidence pack: "Every query creates an immutable audit trail"

3. **Execute Advanced Query**
   ```
   Query: "Calculate expected loss for loans with PD greater than 10%"
   Dataset: Credit Risk - Loan Portfolio
   ```
   
   **Highlight:**
   - "AUREUS understands financial domain terms like PD, LGD, EAD"
   - Show lineage tracking
   - Explain budget controls: "Token usage tracked, costs estimated"

4. **Show Query History**
   - Navigate to Audit Log
   - "Every query is logged with user, timestamp, policy decisions, and results"

**Key Messages:**
- ✅ Natural language → SQL in seconds
- ✅ Bank-grade governance enforced automatically
- ✅ Complete audit trail for regulators

---

### Scenario 2: AML Alert Triage (5 minutes)

**Navigate to:** Query Interface

**Demo Flow:**

1. **Explain Context**
   - "AML analysts handle hundreds of alerts daily. Let's see how AUREUS helps."

2. **Execute Triage Query**
   ```
   Query: "Show me all high-risk alerts (score > 85) from the last 7 days"
   Dataset: AML - Alerts
   ```
   
   **Highlight:**
   - Results filtered and sorted automatically
   - PII masking in action (if configured)
   - Export options for further investigation

3. **Follow-up Query**
   ```
   Query: "What percentage of alerts by jurisdiction?"
   Dataset: AML - Alerts
   ```
   
   **Highlight:**
   - Multi-query analysis without switching tools
   - Results can be visualized (future feature)

**Key Messages:**
- ✅ Accelerate alert triage 3-5x
- ✅ Reduce false positives with better data access
- ✅ Maintain regulatory compliance

---

### Scenario 3: Dataset Onboarding with Config Copilot (5 minutes)

**Navigate to:** Config Copilot

**Demo Flow:**

1. **Explain the Challenge**
   - "Onboarding a new dataset used to take 2-3 weeks of back-and-forth"
   - "Config Copilot generates all required specs in minutes"

2. **Enter Natural Language Request**
   ```
   Input: "I need to onboard daily transaction data for US retail banking. 
   It contains customer IDs (PII), transaction amounts, merchant names, 
   and timestamps. Data should be retained for 7 years per regulatory 
   requirements."
   ```

3. **Show Generated Specs**
   - Data contract with schema
   - Data quality rules (completeness, validity, timeliness)
   - Security policies (PII classification, encryption)
   - Retention policy
   - SLA definitions

4. **Explain Approval Workflow**
   - "High-risk changes require approvals"
   - Show approval routing: Analyst → Approver → Admin
   - Navigate to Approvals page (if implemented)

**Key Messages:**
- ✅ Reduce onboarding time from weeks to hours
- ✅ Eliminate specification errors
- ✅ Built-in governance from day one

---

### Platform Features Deep Dive (3 minutes)

**Navigate through:**

1. **Dataset Catalog**
   - Show all available datasets
   - Metadata, lineage, ownership
   - "Single source of truth for all data assets"

2. **Guard Controls Dashboard**
   - Policy enforcement in real-time
   - Audit log streaming
   - Budget and rate limiting
   - Rollback capability

3. **Observability**
   - Token usage tracking
   - Query latency monitoring
   - Cost estimation per query
   - Budget alerts

**Key Messages:**
- ✅ Comprehensive governance out-of-the-box
- ✅ Full transparency and auditability
- ✅ Cost control and optimization

---

## Q&A and Next Steps (3 minutes)

### Common Questions

**Q: How does AUREUS handle sensitive data?**
A: Multi-layer approach:
- PII detection and masking
- Role-based access control
- Encryption at rest and in transit
- Complete audit trail

**Q: What about accuracy of LLM-generated SQL?**
A: Multiple safeguards:
- Validation before execution (read-only, allowed tables)
- Human-in-the-loop for high-risk queries
- Evidence packs for every result
- Rollback capability

**Q: Integration with existing tools?**
A: API-first design:
- REST APIs for all functions
- Supports existing data warehouses (Snowflake, Databricks, etc.)
- Can integrate with BI tools (Tableau, Power BI)

**Q: Implementation timeline?**
A: Pilot program: 12 weeks
- Week 1-4: Setup and configuration
- Week 5-8: User training and adoption
- Week 9-12: Full production use

### Pilot Offer

**Present:**
- "We're offering a 12-week pilot program with two tiers"
- **Free Pilot**: 5 users, 1 dataset, 1000 queries/month
- **Paid Pilot ($25,000)**: 25 users, unlimited datasets, 10,000 queries/month, dedicated support

**Materials to Share:**
1. PILOT_REQUIREMENTS.md - Full pilot details
2. PILOT_AGREEMENT_TEMPLATE.md - Legal terms
3. docs/SALES_DECK.md - Complete presentation deck
4. docs/security-questionnaire.md - Security questionnaire

---

## Post-Demo Follow-up

### Send Within 24 Hours:
1. Demo recording (if recorded)
2. Pilot agreement for review
3. Security questionnaire
4. Technical architecture documentation

### Schedule:
1. Security review meeting (if needed)
2. Technical deep dive with their team
3. Pilot kickoff call

---

## Troubleshooting

### Backend Not Responding
```powershell
docker-compose -f docker-compose.backend.yml restart
docker logs aureus-api --tail 50
```

### Frontend Build Issues
```powershell
npm install
npm run dev
```

### Port Conflicts
- Backend: Port 8001 (change in docker-compose.backend.yml)
- Frontend: Port 5001 (Vite auto-selects available port)

---

## Success Metrics

Track during demo:
- [ ] All 3 scenarios completed
- [ ] No technical errors
- [ ] Positive customer engagement
- [ ] Follow-up meeting scheduled
- [ ] Pilot agreement shared

---

**Remember:**
- Focus on business value, not just features
- Use customer's domain language (credit risk, AML, compliance)
- Show confidence in the platform
- Ask questions to understand their specific pain points
- Be transparent about what's in pilot vs. production

**Good luck with your demo!** 🚀
