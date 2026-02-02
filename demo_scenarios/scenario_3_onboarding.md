# Demo Scenario 3: Dataset Onboarding

## Objective
Demonstrate Config Copilot for automated specification generation.

## Sample Inputs

### Example 1: Credit Card Transactions
**Input**: "Onboard credit card transaction dataset with customer info, transaction details, merchant data. Daily refresh, high PII, US jurisdiction only."

**Expected Output**:
- Dataset contract with full schema
- DQ rules (completeness, uniqueness, validity)
- Governance policies (PII access control, approval workflows)
- SLA specs (freshness: 24h, availability: 99.9%)

### Example 2: Regulatory Reports
**Input**: "Register regulatory report dataset for CCAR submissions. Quarterly refresh, no PII, multi-jurisdiction, requires approval for access."

**Expected Output**:
- Complete specification in <10 seconds
- Validation passes
- Commit creates audit event
- Specs written to /specs directory

## Expected Outcomes
- Specs generated in <10 seconds
- JSON schema validation passes
- Evidence pack created
- Audit trail recorded

## Success Criteria
- 100% spec generation success
- All specs pass validation
- Complete documentation generated
- Rollback capability verified
