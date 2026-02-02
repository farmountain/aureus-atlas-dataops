# Demo Scenario 2: AML Alert Triage

## Objective
Demonstrate governance controls for sensitive AML data access.

## Sample Questions

### High-Risk Queries (Require Approval)
1. "Show me all AML alerts with risk score above 80"
2. "List customers with multiple structuring alerts"
3. "Show me alert details for customer CUST-98765"

### Analytical Queries
4. "What is the average alert resolution time?"
5. "Show me alert distribution by type"
6. "How many alerts are under review vs escalated?"

## Expected Outcomes
- High-PII queries trigger approval workflow
- PII fields automatically masked for analysts
- Approvers see partial masking
- Complete audit trail of data access

## Success Criteria
- 100% approval workflow compliance
- Automatic PII masking applied
- No unauthorized PII access
- Policy violations logged
