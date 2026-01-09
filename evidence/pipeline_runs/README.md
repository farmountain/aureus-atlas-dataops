# Pipeline Runs Evidence

This directory contains evidence packs for pipeline generation and deployment operations.

## Structure

Each pipeline deployment creates a subdirectory with the following structure:

```
pipeline_{deploymentId}_{timestamp}/
├── deployment.json          # Deployment metadata (stage, actor, approvals)
├── pipeline_spec.json       # Full pipeline specification
├── generated_sql_model.sql  # Generated SQL transformation code
├── schema_test.sql          # Schema/contract validation test
├── dq_tests/                # Data quality tests
│   ├── completeness_check.sql
│   ├── uniqueness_check.sql
│   └── ...
├── reconciliation_test.sql  # Control totals reconciliation
├── guard_decisions.json     # AUREUS guard audit events and policy checks
└── rollback_plan.json       # Snapshot-based rollback instructions
```

## Evidence Pack Contents

### deployment.json
Metadata about the deployment including:
- Deployment ID and timestamp
- Target stage (dev/uat/prod)
- Actor and role
- Approval ID (if applicable)

### pipeline_spec.json
Complete pipeline specification with:
- Source and target datasets
- Transform rules
- Test specifications
- DQ check definitions
- Schedule (if applicable)

### generated_sql_model.sql
The actual SQL transformation code that will be deployed, including:
- CTE structure
- Column mappings
- Transform logic
- Comments and documentation

### Tests
- **schema_test.sql**: Validates output schema matches expected contract
- **dq_tests/**: Individual DQ checks (completeness, uniqueness, validity, consistency)
- **reconciliation_test.sql**: Row count and control total validation

### guard_decisions.json
AUREUS guard audit trail including:
- Policy check results
- Budget enforcement decisions
- Snapshot ID
- Audit event ID

### rollback_plan.json
Step-by-step instructions for rolling back deployment:
- Snapshot to restore
- Affected resources
- Restoration steps
- Validation checks

## Policy Enforcement

All pipeline deployments must pass through AUREUS guard:
- **Dev**: Allowed for all roles
- **UAT**: Allowed for analyst+ roles
- **Prod**: Requires approver role OR explicit approval

## Retention

Evidence packs are immutable and retained indefinitely for audit and compliance purposes.
