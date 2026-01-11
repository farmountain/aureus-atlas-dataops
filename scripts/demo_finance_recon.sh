#!/bin/bash
# Finance Reconciliation Demo
# Demonstrates regulatory reporting and financial control workflows

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/demo_helpers.sh"

# Initialize demo
EVIDENCE_DIR=$(init_demo "finance_reconciliation")

log_section "SCENARIO: Finance Regulatory Reporting Reconciliation"
echo "Business Question: Are GL balances reconciled with regulatory reports?"
echo "Domain: Finance / Regulatory Reporting"
echo "Datasets: General Ledger, Regulatory Reports, Control Totals"
echo ""

# Step 1: Create sample specs via Config Copilot
log_section "STEP 1: Generate Specs via Config Copilot"
NL_INPUT="I need to reconcile general ledger balances with regulatory report submissions. The data includes account numbers, transaction details, and report submission status. Data should be updated daily with month-end close processes. This is for US GAAP and regulatory reporting purposes. No PII but highly sensitive financial data."

log_info "Natural Language Input:"
echo -e "${YELLOW}\"${NL_INPUT}\"${NC}\n"

RUN_ID=$(simulate_config_copilot "$EVIDENCE_DIR" "$NL_INPUT" "Finance_Reporting")
log_success "Generated specs - Run ID: $RUN_ID"

# Step 2: Validate specs
log_section "STEP 2: Validate Specs"
simulate_validation "$EVIDENCE_DIR" "$RUN_ID"

# Create detailed dataset contract for evidence
DATASET_CONTRACT=$(cat <<EOF
{
  "dataset_id": "fin_gl_reconciliation_${RUN_ID:0:8}",
  "name": "Finance GL Reconciliation",
  "description": "General Ledger to Regulatory Report reconciliation with control totals and variance analysis",
  "domain": "Finance",
  "owner": "Finance Regulatory Reporting Team",
  "classification": {
    "pii_level": "NONE",
    "jurisdiction": "US",
    "data_category": "FINANCIAL_CONFIDENTIAL",
    "retention_period": "7_YEARS",
    "regulatory_requirements": ["US_GAAP", "SOX", "FFIEC", "CALL_REPORT", "FR_Y9C"]
  },
  "schema": {
    "columns": [
      {"name": "reconciliation_id", "type": "string", "nullable": false, "pii": false},
      {"name": "reporting_period", "type": "date", "nullable": false, "pii": false},
      {"name": "report_type", "type": "string", "nullable": false, "pii": false},
      {"name": "gl_account", "type": "string", "nullable": false, "pii": false},
      {"name": "gl_account_name", "type": "string", "nullable": false, "pii": false},
      {"name": "gl_balance", "type": "decimal", "nullable": false, "pii": false},
      {"name": "report_line_item", "type": "string", "nullable": false, "pii": false},
      {"name": "report_balance", "type": "decimal", "nullable": false, "pii": false},
      {"name": "variance_amount", "type": "decimal", "nullable": false, "pii": false},
      {"name": "variance_pct", "type": "decimal", "nullable": false, "pii": false},
      {"name": "variance_explanation", "type": "string", "nullable": true, "pii": false},
      {"name": "reconciliation_status", "type": "string", "nullable": false, "pii": false},
      {"name": "materiality_threshold", "type": "decimal", "nullable": false, "pii": false},
      {"name": "material_variance_flag", "type": "boolean", "nullable": false, "pii": false},
      {"name": "reviewed_by", "type": "string", "nullable": true, "pii": false},
      {"name": "review_status", "type": "string", "nullable": false, "pii": false},
      {"name": "submission_deadline", "type": "date", "nullable": false, "pii": false},
      {"name": "created_at", "type": "timestamp", "nullable": false, "pii": false},
      {"name": "last_updated", "type": "timestamp", "nullable": false, "pii": false}
    ]
  },
  "quality_rules": [
    {
      "rule_id": "fin_001",
      "type": "completeness",
      "check": "not_null",
      "columns": ["gl_account", "gl_balance", "report_balance"],
      "threshold": 1.0
    },
    {
      "rule_id": "fin_002",
      "type": "validity",
      "check": "enum",
      "column": "report_type",
      "allowed_values": ["CALL_REPORT", "FR_Y9C", "FR_Y14", "FFIEC_031", "FFIEC_041"]
    },
    {
      "rule_id": "fin_003",
      "type": "validity",
      "check": "enum",
      "column": "reconciliation_status",
      "allowed_values": ["MATCHED", "VARIANCE_EXPLAINED", "VARIANCE_UNEXPLAINED", "UNDER_REVIEW", "FAILED"]
    },
    {
      "rule_id": "fin_004",
      "type": "accuracy",
      "check": "variance_calculation",
      "rule": "variance_amount = report_balance - gl_balance"
    },
    {
      "rule_id": "fin_005",
      "type": "consistency",
      "check": "materiality_flag",
      "rule": "material_variance_flag = (ABS(variance_amount) > materiality_threshold)"
    },
    {
      "rule_id": "fin_006",
      "type": "timeliness",
      "check": "submission_deadline_compliance",
      "rule": "last_updated < submission_deadline"
    }
  ],
  "freshness_sla": {
    "frequency": "DAILY",
    "cutoff_time": "17:00 UTC",
    "grace_period_minutes": 120,
    "critical_period": "MONTH_END",
    "critical_cutoff_time": "12:00 UTC"
  },
  "policies": {
    "access_control": {
      "required_roles": ["FINANCE_ANALYST", "FINANCE_MANAGER", "CONTROLLER", "CFO"],
      "read_only_roles": ["INTERNAL_AUDIT", "EXTERNAL_AUDIT", "REGULATORY_EXAMINER"]
    },
    "purpose_limitation": ["REGULATORY_REPORTING", "FINANCIAL_CLOSE", "SOX_COMPLIANCE", "AUDIT"],
    "data_quality_gates": {
      "block_submission_on_material_variance": true,
      "require_explanation_threshold": 10000,
      "require_approval_threshold": 100000
    },
    "audit_requirements": {
      "log_all_changes": true,
      "retention_period": "7_YEARS",
      "sox_compliant": true
    }
  },
  "control_framework": {
    "control_objective": "Ensure accuracy and completeness of regulatory reports",
    "control_frequency": "DAILY",
    "control_owner": "Finance Controller",
    "escalation_threshold": "Material variance unresolved for 24 hours"
  }
}
EOF
)

write_evidence_file "$EVIDENCE_DIR" "dataset_contract_finance_recon.json" "$DATASET_CONTRACT"
log_success "Dataset contract validated and documented"

# Step 3: Commit specs
log_section "STEP 3: Commit Validated Specs"
log_info "SOX compliance controls active"
simulate_commit "$EVIDENCE_DIR" "$RUN_ID"

# Step 4: Generate pipeline
log_section "STEP 4: Generate Data Pipeline"
PIPELINE_RUN_ID=$(simulate_pipeline_generation "$EVIDENCE_DIR" "fin_gl_reconciliation_${RUN_ID:0:8}")

# Create sample pipeline SQL for evidence
PIPELINE_SQL=$(cat <<'EOF'
-- Finance GL Reconciliation Pipeline
-- Generated: 2024-01-15
-- Target: fin_gl_regulatory_reconciliation

WITH gl_balances AS (
  SELECT
    reporting_period,
    account_number as gl_account,
    account_name as gl_account_name,
    SUM(ending_balance) as gl_balance
  FROM {{ ref('fin_general_ledger') }}
  WHERE account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')
  GROUP BY reporting_period, account_number, account_name
),

regulatory_reports AS (
  SELECT
    reporting_period,
    report_type,
    line_item_code as report_line_item,
    line_item_description,
    reported_amount as report_balance,
    submission_deadline
  FROM {{ ref('fin_regulatory_reports') }}
  WHERE submission_status IN ('FILED', 'PENDING')
),

account_mapping AS (
  SELECT
    gl_account,
    report_type,
    report_line_item,
    materiality_threshold
  FROM {{ ref('fin_gl_to_report_mapping') }}
  WHERE active_flag = TRUE
),

reconciliation AS (
  SELECT
    gl.reporting_period,
    rr.report_type,
    gl.gl_account,
    gl.gl_account_name,
    gl.gl_balance,
    rr.report_line_item,
    rr.line_item_description,
    rr.report_balance,
    (rr.report_balance - gl.gl_balance) as variance_amount,
    CASE
      WHEN gl.gl_balance = 0 THEN 0
      ELSE ROUND(((rr.report_balance - gl.gl_balance) / NULLIF(ABS(gl.gl_balance), 0)) * 100, 2)
    END as variance_pct,
    am.materiality_threshold,
    ABS(rr.report_balance - gl.gl_balance) > am.materiality_threshold as material_variance_flag,
    rr.submission_deadline
  FROM gl_balances gl
  INNER JOIN account_mapping am ON gl.gl_account = am.gl_account
  INNER JOIN regulatory_reports rr
    ON gl.reporting_period = rr.reporting_period
    AND am.report_type = rr.report_type
    AND am.report_line_item = rr.report_line_item
),

status_determination AS (
  SELECT
    *,
    CASE
      WHEN variance_amount = 0 THEN 'MATCHED'
      WHEN ABS(variance_amount) <= materiality_threshold THEN 'VARIANCE_EXPLAINED'
      WHEN material_variance_flag THEN 'VARIANCE_UNEXPLAINED'
      ELSE 'UNDER_REVIEW'
    END as reconciliation_status,
    CASE
      WHEN material_variance_flag THEN 'FAILED'
      WHEN ABS(variance_amount) <= materiality_threshold THEN 'PASS'
      ELSE 'UNDER_REVIEW'
    END as review_status
  FROM reconciliation
)

SELECT
  CONCAT(reporting_period, '_', report_type, '_', gl_account) as reconciliation_id,
  reporting_period,
  report_type,
  gl_account,
  gl_account_name,
  gl_balance,
  report_line_item,
  line_item_description,
  report_balance,
  variance_amount,
  variance_pct,
  NULL as variance_explanation,
  reconciliation_status,
  materiality_threshold,
  material_variance_flag,
  NULL as reviewed_by,
  review_status,
  submission_deadline,
  CURRENT_TIMESTAMP as created_at,
  CURRENT_TIMESTAMP as last_updated
FROM status_determination
ORDER BY
  material_variance_flag DESC,
  ABS(variance_amount) DESC,
  reporting_period DESC;
EOF
)

write_evidence_file "$EVIDENCE_DIR" "pipeline_finance_recon.sql" "$PIPELINE_SQL"

# Create pipeline tests
PIPELINE_TESTS=$(cat <<'EOF'
-- Finance Reconciliation Pipeline Tests
-- Test Suite: fin_gl_regulatory_reconciliation

-- Test 1: All GL accounts mapped to reports
SELECT
  'gl_mapping_test' as test_name,
  CASE
    WHEN unmapped_count = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  unmapped_count
FROM (
  SELECT COUNT(*) as unmapped_count
  FROM fin_general_ledger gl
  WHERE NOT EXISTS (
    SELECT 1 FROM fin_gl_to_report_mapping m
    WHERE m.gl_account = gl.account_number
    AND m.active_flag = TRUE
  )
  AND gl.reporting_period = (SELECT MAX(reporting_period) FROM fin_general_ledger)
);

-- Test 2: Variance calculations are correct
SELECT
  'variance_calculation_test' as test_name,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM fin_gl_regulatory_reconciliation
WHERE ABS((report_balance - gl_balance) - variance_amount) > 0.01;

-- Test 3: Material variance flags are correct
SELECT
  'materiality_flag_test' as test_name,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM fin_gl_regulatory_reconciliation
WHERE (material_variance_flag = TRUE AND ABS(variance_amount) <= materiality_threshold)
   OR (material_variance_flag = FALSE AND ABS(variance_amount) > materiality_threshold);

-- Test 4: Control totals reconcile
SELECT
  'control_total_test' as test_name,
  CASE
    WHEN ABS(gl_total - report_total) < 1.00 THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  gl_total,
  report_total,
  (report_total - gl_total) as difference
FROM (
  SELECT
    (SELECT SUM(gl_balance) FROM fin_gl_regulatory_reconciliation WHERE report_type = 'CALL_REPORT') as gl_total,
    (SELECT SUM(report_balance) FROM fin_gl_regulatory_reconciliation WHERE report_type = 'CALL_REPORT') as report_total
);

-- Test 5: Submission deadline compliance
SELECT
  'submission_deadline_test' as test_name,
  CASE
    WHEN late_count = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  late_count
FROM (
  SELECT COUNT(*) as late_count
  FROM fin_gl_regulatory_reconciliation
  WHERE last_updated > submission_deadline
  AND reconciliation_status IN ('UNDER_REVIEW', 'VARIANCE_UNEXPLAINED')
);

-- Test 6: SOX compliance - all material variances reviewed
SELECT
  'sox_compliance_test' as test_name,
  CASE
    WHEN unreviewed_material_count = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  unreviewed_material_count
FROM (
  SELECT COUNT(*) as unreviewed_material_count
  FROM fin_gl_regulatory_reconciliation
  WHERE material_variance_flag = TRUE
  AND review_status = 'UNDER_REVIEW'
  AND created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
);
EOF
)

write_evidence_file "$EVIDENCE_DIR" "pipeline_finance_tests.sql" "$PIPELINE_TESTS"
log_success "Pipeline and tests generated"

# Step 5: Request approval (Material variance resolution may require approval)
log_section "STEP 5: Request Approval"
log_info "Standard reconciliation - no approval required"
log_info "Material variances > \$100K would require Controller approval"
simulate_approval_request "$EVIDENCE_DIR" "FINANCE_RECONCILIATION_STANDARD" "false"

# Step 6: Run a query
log_section "STEP 6: Execute Reconciliation Query"
QUERY_QUESTION="Show me all material variances between GL and regulatory reports that are unreconciled or unexplained"

log_info "Finance Question:"
echo -e "${YELLOW}\"${QUERY_QUESTION}\"${NC}\n"

simulate_query_execution "$EVIDENCE_DIR" "$QUERY_QUESTION" "fin_gl_regulatory_reconciliation"

# Create detailed query results for evidence
QUERY_RESULTS=$(cat <<EOF
{
  "query_execution": {
    "question": "$QUERY_QUESTION",
    "executed_at": "$(date -Iseconds)",
    "policy_checks": {
      "pii_access": {
        "status": "NOT_APPLICABLE",
        "reason": "Dataset contains no PII"
      },
      "jurisdiction_check": {
        "status": "COMPLIANT",
        "jurisdiction": "US",
        "regulatory_framework": ["US_GAAP", "SOX", "FFIEC"]
      },
      "purpose_check": {
        "status": "COMPLIANT",
        "purpose": "REGULATORY_REPORTING",
        "allowed_purposes": ["REGULATORY_REPORTING", "FINANCIAL_CLOSE", "SOX_COMPLIANCE", "AUDIT"]
      },
      "sox_compliance": {
        "status": "ACTIVE",
        "control_objective": "Ensure accuracy and completeness of regulatory reports",
        "evidence_retention": "7_YEARS"
      }
    },
    "canonical_intent": {
      "measures": ["COUNT(*)", "SUM(variance_amount)", "SUM(gl_balance)", "SUM(report_balance)"],
      "dimensions": ["report_type", "reconciliation_status", "gl_account_name"],
      "filters": {
        "material_variance_flag": true,
        "reconciliation_status": ["IN", ["VARIANCE_UNEXPLAINED", "UNDER_REVIEW"]]
      },
      "order_by": ["ABS(variance_amount) DESC"]
    },
    "generated_sql": "SELECT report_type, gl_account, gl_account_name, gl_balance, report_balance, variance_amount, variance_pct, reconciliation_status, submission_deadline FROM fin_gl_regulatory_reconciliation WHERE material_variance_flag = TRUE AND reconciliation_status IN ('VARIANCE_UNEXPLAINED', 'UNDER_REVIEW') ORDER BY ABS(variance_amount) DESC LIMIT 100",
    "execution_results": {
      "row_count": 7,
      "execution_time_ms": 189,
      "data": [
        {
          "report_type": "CALL_REPORT",
          "gl_account": "1050",
          "gl_account_name": "Loans and Leases",
          "gl_balance": 8523456789.50,
          "report_balance": 8523125000.00,
          "variance_amount": -331789.50,
          "variance_pct": -0.004,
          "reconciliation_status": "UNDER_REVIEW",
          "submission_deadline": "2024-01-30",
          "days_until_deadline": 15
        },
        {
          "report_type": "FR_Y9C",
          "gl_account": "2010",
          "gl_account_name": "Deposits - Non-Interest Bearing",
          "gl_balance": 5234567890.25,
          "report_balance": 5234798000.00,
          "variance_amount": 230109.75,
          "variance_pct": 0.004,
          "reconciliation_status": "VARIANCE_UNEXPLAINED",
          "submission_deadline": "2024-01-30",
          "days_until_deadline": 15
        },
        {
          "report_type": "CALL_REPORT",
          "gl_account": "4010",
          "gl_account_name": "Interest Income",
          "gl_balance": 125678901.00,
          "report_balance": 125550000.00,
          "variance_amount": -128901.00,
          "variance_pct": -0.103,
          "reconciliation_status": "UNDER_REVIEW",
          "submission_deadline": "2024-01-30",
          "days_until_deadline": 15
        },
        {
          "report_type": "FR_Y9C",
          "gl_account": "1070",
          "gl_account_name": "Trading Assets",
          "gl_balance": 987654321.00,
          "report_balance": 987540000.00,
          "variance_amount": -114321.00,
          "variance_pct": -0.012,
          "reconciliation_status": "VARIANCE_UNEXPLAINED",
          "submission_deadline": "2024-02-15",
          "days_until_deadline": 30
        }
      ],
      "summary": {
        "total_material_variances": 7,
        "under_review": 3,
        "unexplained": 4,
        "total_variance_amount": -445678.25,
        "total_gl_balance": 15234567123.50,
        "total_report_balance": 15234121445.25,
        "largest_variance": -331789.50,
        "sox_control_status": "AT_RISK"
      }
    },
    "control_totals": {
      "gl_system_total": 15234567123.50,
      "regulatory_report_total": 15234121445.25,
      "net_variance": -445678.25,
      "variance_pct": -0.003,
      "within_tolerance": false,
      "tolerance_threshold": 100000,
      "requires_escalation": true
    },
    "freshness_check": {
      "as_of_date": "$(date +%Y-%m-%d)",
      "data_age_hours": 4,
      "sla_met": true,
      "daily_sla": "17:00 UTC"
    },
    "citations": {
      "datasets_used": [
        {
          "dataset_id": "fin_gl_regulatory_reconciliation",
          "name": "Finance GL Reconciliation",
          "owner": "Finance Regulatory Reporting Team",
          "last_updated": "$(date +%Y-%m-%d) 13:00 UTC"
        }
      ]
    },
    "budget_tracking": {
      "tokens_used": 278,
      "estimated_cost_usd": 0.0042,
      "remaining_daily_budget": 99359
    }
  }
}
EOF
)

write_evidence_file "$EVIDENCE_DIR" "query_results_material_variances.json" "$QUERY_RESULTS"
log_success "Query executed with SOX compliance tracking"

# Step 7: Generate evidence pack
log_section "STEP 7: Generate Evidence Pack"
FINAL_EVIDENCE_DIR=$(generate_evidence_pack "$EVIDENCE_DIR" "Finance_Regulatory_Reconciliation")

# Print summary
log_section "DEMO COMPLETE"
echo -e "${GREEN}✅ All steps completed successfully${NC}\n"

echo -e "${CYAN}Workflow Summary:${NC}"
echo "  1. ✅ Generated specs for regulatory reconciliation"
echo "  2. ✅ Validated specs with SOX compliance checks"
echo "  3. ✅ Committed specs with audit trail"
echo "  4. ✅ Generated reconciliation pipeline with control tests"
echo "  5. ✅ Approval flow (standard: auto-approved)"
echo "  6. ✅ Executed reconciliation query with control totals"
echo "  7. ✅ Generated auditor-ready evidence pack"
echo ""

echo -e "${CYAN}Key Findings:${NC}"
echo "  • 7 material variances identified"
echo "  • Total net variance: -\$445,678.25"
echo "  • 4 variances unexplained (requires investigation)"
echo "  • 3 variances under review"
echo "  • Largest variance: -\$331,789.50 (Loans and Leases)"
echo "  • Net variance exceeds tolerance threshold"
echo ""

echo -e "${RED}⚠ CONTROL ALERT${NC}"
echo "  SOX Control Status: AT_RISK"
echo "  Reason: Net variance exceeds \$100K threshold"
echo "  Required Action: Controller review and approval required"
echo "  Deadline: 15 days until submission deadline"
echo ""

echo -e "${CYAN}SOX Compliance Controls:${NC}"
echo "  • ✅ All changes logged for 7-year retention"
echo "  • ✅ Material variances flagged automatically"
echo "  • ✅ Control totals calculated and verified"
echo "  • ✅ Submission deadline tracking active"
echo "  • ⚠ Material variances require resolution within 24 hours"
echo "  • ⚠ Escalation to Controller required"
echo ""

echo -e "${CYAN}Regulatory Reports Affected:${NC}"
echo "  • CALL_REPORT (Bank Call Report) - 2 variances"
echo "  • FR_Y9C (Bank Holding Company Report) - 2 variances"
echo "  • Submission deadlines: Jan 30 and Feb 15, 2024"
echo ""

echo -e "${CYAN}AUREUS Guard Actions:${NC}"
echo "  • Policy evaluation: 5 checks performed"
echo "  • SOX compliance verified"
echo "  • Audit events: 7 events logged"
echo "  • Snapshots: 3 rollback points created"
echo "  • Budget tracking: \$0.0042 consumed"
echo ""

print_evidence_summary "$FINAL_EVIDENCE_DIR"

log_section "REMEDIATION STEPS"
echo "Required Actions:"
echo "  1. Review variance explanations for each material variance"
echo "  2. Update variance_explanation field with justification"
echo "  3. Obtain Controller approval for variances > \$100K"
echo "  4. Re-run reconciliation to verify corrections"
echo "  5. Update regulatory reports before submission deadline"
echo ""

log_section "NEXT STEPS"
echo "Review evidence pack:"
echo "  cd $FINAL_EVIDENCE_DIR"
echo "  cat evidence_pack.md"
echo ""
echo "Analyze material variances:"
echo "  cat $FINAL_EVIDENCE_DIR/query_results_material_variances.json | jq '.query_execution.execution_results.data'"
echo ""
echo "View control totals:"
echo "  cat $FINAL_EVIDENCE_DIR/query_results_material_variances.json | jq '.query_execution.control_totals'"
echo ""
echo "Run additional demos:"
echo "  ./scripts/demo_credit_risk.sh"
echo "  ./scripts/demo_fcc_triage.sh"
