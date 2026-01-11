#!/bin/bash
# Credit Risk Portfolio Monitoring Demo
# Demonstrates end-to-end workflow for credit risk analytics

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/demo_helpers.sh"

# Initialize demo
EVIDENCE_DIR=$(init_demo "credit_risk_portfolio")

log_section "SCENARIO: Credit Risk Portfolio Monitoring"
echo "Business Question: What is our current exposure to high-risk loans?"
echo "Domain: Credit Risk"
echo "Datasets: Loan Portfolio, Risk Ratings, Collateral Valuations"
echo ""

# Step 1: Create sample specs via Config Copilot
log_section "STEP 1: Generate Specs via Config Copilot"
NL_INPUT="I need to analyze our loan portfolio with current balances, risk ratings, days past due, and non-performing loan flags. The data should be refreshed daily and contains borrower IDs which are PII. This is for US jurisdiction credit risk monitoring."

log_info "Natural Language Input:"
echo -e "${YELLOW}\"${NL_INPUT}\"${NC}\n"

RUN_ID=$(simulate_config_copilot "$EVIDENCE_DIR" "$NL_INPUT" "Credit_Risk")
log_success "Generated specs - Run ID: $RUN_ID"

# Step 2: Validate specs
log_section "STEP 2: Validate Specs"
simulate_validation "$EVIDENCE_DIR" "$RUN_ID"

# Create detailed dataset contract for evidence
DATASET_CONTRACT=$(cat <<EOF
{
  "dataset_id": "cr_loan_portfolio_${RUN_ID:0:8}",
  "name": "Credit Risk Loan Portfolio",
  "description": "Master loan portfolio with risk metrics and borrower information",
  "domain": "Credit Risk",
  "owner": "Credit Risk Analytics Team",
  "classification": {
    "pii_level": "HIGH",
    "jurisdiction": "US",
    "data_category": "FINANCIAL",
    "retention_period": "7_YEARS"
  },
  "schema": {
    "columns": [
      {"name": "loan_id", "type": "string", "nullable": false, "pii": false},
      {"name": "borrower_id", "type": "string", "nullable": false, "pii": true},
      {"name": "loan_type", "type": "string", "nullable": false, "pii": false},
      {"name": "current_balance", "type": "decimal", "nullable": false, "pii": false},
      {"name": "risk_rating", "type": "string", "nullable": false, "pii": false},
      {"name": "days_past_due", "type": "integer", "nullable": false, "pii": false},
      {"name": "npl_flag", "type": "boolean", "nullable": false, "pii": false},
      {"name": "probability_of_default", "type": "decimal", "nullable": true, "pii": false},
      {"name": "loss_given_default", "type": "decimal", "nullable": true, "pii": false}
    ]
  },
  "quality_rules": [
    {
      "rule_id": "cr_001",
      "type": "completeness",
      "check": "not_null",
      "columns": ["loan_id", "borrower_id", "current_balance"],
      "threshold": 1.0
    },
    {
      "rule_id": "cr_002",
      "type": "validity",
      "check": "range",
      "column": "current_balance",
      "min": 0,
      "max": 100000000
    },
    {
      "rule_id": "cr_003",
      "type": "validity",
      "check": "enum",
      "column": "risk_rating",
      "allowed_values": ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "CC", "C", "D"]
    },
    {
      "rule_id": "cr_004",
      "type": "consistency",
      "check": "npl_flag_consistency",
      "rule": "days_past_due > 90 implies npl_flag = true"
    }
  ],
  "freshness_sla": {
    "frequency": "DAILY",
    "cutoff_time": "09:00 UTC",
    "grace_period_minutes": 60
  },
  "policies": {
    "access_control": {
      "required_roles": ["CREDIT_RISK_ANALYST", "CREDIT_RISK_MANAGER"],
      "pii_masking": {
        "enabled": true,
        "columns": ["borrower_id"],
        "method": "HASH_SHA256"
      }
    },
    "purpose_limitation": ["CREDIT_RISK_MONITORING", "REGULATORY_REPORTING"],
    "cross_border_restrictions": {
      "allowed_jurisdictions": ["US"],
      "requires_approval": true
    }
  }
}
EOF
)

write_evidence_file "$EVIDENCE_DIR" "dataset_contract_credit_risk.json" "$DATASET_CONTRACT"
log_success "Dataset contract validated and documented"

# Step 3: Commit specs
log_section "STEP 3: Commit Validated Specs"
simulate_commit "$EVIDENCE_DIR" "$RUN_ID"

# Step 4: Generate pipeline
log_section "STEP 4: Generate Data Pipeline"
PIPELINE_RUN_ID=$(simulate_pipeline_generation "$EVIDENCE_DIR" "cr_loan_portfolio_${RUN_ID:0:8}")

# Create sample pipeline SQL for evidence
PIPELINE_SQL=$(cat <<'EOF'
-- Credit Risk Portfolio Monitoring Pipeline
-- Generated: 2024-01-15
-- Target: cr_loan_portfolio_daily_summary

WITH loan_risk_metrics AS (
  SELECT
    loan_type,
    risk_rating,
    COUNT(DISTINCT loan_id) as loan_count,
    SUM(current_balance) as total_exposure,
    AVG(current_balance) as avg_loan_size,
    SUM(CASE WHEN npl_flag THEN current_balance ELSE 0 END) as npl_exposure,
    AVG(probability_of_default) as avg_pd,
    AVG(loss_given_default) as avg_lgd,
    SUM(current_balance * probability_of_default * loss_given_default) as expected_loss
  FROM {{ ref('cr_loan_portfolio') }}
  WHERE as_of_date = CURRENT_DATE
  GROUP BY loan_type, risk_rating
),

portfolio_summary AS (
  SELECT
    loan_type,
    risk_rating,
    loan_count,
    total_exposure,
    avg_loan_size,
    npl_exposure,
    ROUND(npl_exposure / NULLIF(total_exposure, 0) * 100, 2) as npl_ratio_pct,
    avg_pd,
    avg_lgd,
    expected_loss,
    ROUND(expected_loss / NULLIF(total_exposure, 0) * 100, 2) as expected_loss_rate_pct
  FROM loan_risk_metrics
)

SELECT
  loan_type,
  risk_rating,
  loan_count,
  total_exposure,
  avg_loan_size,
  npl_exposure,
  npl_ratio_pct,
  avg_pd,
  avg_lgd,
  expected_loss,
  expected_loss_rate_pct,
  CURRENT_DATE as as_of_date,
  CURRENT_TIMESTAMP as processed_at
FROM portfolio_summary
ORDER BY total_exposure DESC;
EOF
)

write_evidence_file "$EVIDENCE_DIR" "pipeline_credit_risk_summary.sql" "$PIPELINE_SQL"

# Create pipeline tests
PIPELINE_TESTS=$(cat <<'EOF'
-- Credit Risk Pipeline Tests
-- Test Suite: cr_loan_portfolio_daily_summary

-- Test 1: Schema validation
SELECT
  'schema_test' as test_name,
  CASE
    WHEN COUNT(*) = 12 THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM information_schema.columns
WHERE table_name = 'cr_loan_portfolio_daily_summary';

-- Test 2: Data quality - no nulls in key fields
SELECT
  'dq_not_null_test' as test_name,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM cr_loan_portfolio_daily_summary
WHERE loan_type IS NULL
   OR risk_rating IS NULL
   OR total_exposure IS NULL;

-- Test 3: Data quality - NPL ratio within bounds
SELECT
  'dq_npl_ratio_test' as test_name,
  CASE
    WHEN MAX(npl_ratio_pct) <= 100 AND MIN(npl_ratio_pct) >= 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM cr_loan_portfolio_daily_summary;

-- Test 4: Reconciliation - total exposure matches source
SELECT
  'reconciliation_test' as test_name,
  CASE
    WHEN ABS(summary_total - source_total) < 0.01 THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM (
  SELECT
    (SELECT SUM(total_exposure) FROM cr_loan_portfolio_daily_summary) as summary_total,
    (SELECT SUM(current_balance) FROM cr_loan_portfolio WHERE as_of_date = CURRENT_DATE) as source_total
) reconciliation;
EOF
)

write_evidence_file "$EVIDENCE_DIR" "pipeline_credit_risk_tests.sql" "$PIPELINE_TESTS"
log_success "Pipeline and tests generated"

# Step 5: Request approval (for prod deployment)
log_section "STEP 5: Request Approval"
log_info "Deployment target: DEV (no approval required)"
log_info "For PROD deployment, approval would be required from Credit Risk Manager"
simulate_approval_request "$EVIDENCE_DIR" "PIPELINE_DEPLOY_DEV" "false"

# Step 6: Run a query
log_section "STEP 6: Execute Analytics Query"
QUERY_QUESTION="What is the total exposure and NPL ratio for high-risk loans (rating B or below)?"

log_info "Business Question:"
echo -e "${YELLOW}\"${QUERY_QUESTION}\"${NC}\n"

simulate_query_execution "$EVIDENCE_DIR" "$QUERY_QUESTION" "cr_loan_portfolio"

# Create detailed query results for evidence
QUERY_RESULTS=$(cat <<EOF
{
  "query_execution": {
    "question": "$QUERY_QUESTION",
    "executed_at": "$(date -Iseconds)",
    "policy_checks": {
      "pii_access": {
        "status": "APPROVED",
        "reason": "User has CREDIT_RISK_ANALYST role",
        "pii_columns_masked": ["borrower_id"]
      },
      "jurisdiction_check": {
        "status": "COMPLIANT",
        "requested": ["US"],
        "user_authorized": ["US"]
      },
      "purpose_check": {
        "status": "COMPLIANT",
        "purpose": "CREDIT_RISK_MONITORING",
        "allowed_purposes": ["CREDIT_RISK_MONITORING", "REGULATORY_REPORTING"]
      }
    },
    "canonical_intent": {
      "measures": ["SUM(current_balance)", "AVG(npl_flag)"],
      "dimensions": ["risk_rating"],
      "filters": {
        "risk_rating": ["IN", ["B", "CCC", "CC", "C", "D"]]
      },
      "time_range": "CURRENT_DATE"
    },
    "generated_sql": "SELECT risk_rating, SUM(current_balance) as total_exposure, AVG(CAST(npl_flag AS INT)) * 100 as npl_ratio_pct FROM cr_loan_portfolio WHERE risk_rating IN ('B', 'CCC', 'CC', 'C', 'D') AND as_of_date = CURRENT_DATE GROUP BY risk_rating ORDER BY total_exposure DESC",
    "execution_results": {
      "row_count": 5,
      "execution_time_ms": 234,
      "data": [
        {"risk_rating": "B", "total_exposure": 125000000, "npl_ratio_pct": 8.5},
        {"risk_rating": "CCC", "total_exposure": 45000000, "npl_ratio_pct": 22.3},
        {"risk_rating": "CC", "total_exposure": 15000000, "npl_ratio_pct": 45.2},
        {"risk_rating": "C", "total_exposure": 8000000, "npl_ratio_pct": 67.8},
        {"risk_rating": "D", "total_exposure": 2000000, "npl_ratio_pct": 95.1}
      ],
      "totals": {
        "total_high_risk_exposure": 195000000,
        "weighted_avg_npl_ratio": 17.8
      }
    },
    "freshness_check": {
      "as_of_date": "$(date +%Y-%m-%d)",
      "data_age_hours": 2,
      "sla_met": true
    },
    "citations": {
      "datasets_used": [
        {
          "dataset_id": "cr_loan_portfolio",
          "name": "Credit Risk Loan Portfolio",
          "owner": "Credit Risk Analytics Team",
          "last_updated": "$(date +%Y-%m-%d) 09:15 UTC"
        }
      ]
    },
    "budget_tracking": {
      "tokens_used": 245,
      "estimated_cost_usd": 0.0037,
      "remaining_daily_budget": 99950
    }
  }
}
EOF
)

write_evidence_file "$EVIDENCE_DIR" "query_results_high_risk_exposure.json" "$QUERY_RESULTS"
log_success "Query executed with full audit trail"

# Step 7: Generate evidence pack
log_section "STEP 7: Generate Evidence Pack"
FINAL_EVIDENCE_DIR=$(generate_evidence_pack "$EVIDENCE_DIR" "Credit_Risk_Portfolio_Monitoring")

# Print summary
log_section "DEMO COMPLETE"
echo -e "${GREEN}✅ All steps completed successfully${NC}\n"

echo -e "${CYAN}Workflow Summary:${NC}"
echo "  1. ✅ Generated specs from natural language input"
echo "  2. ✅ Validated specs against schemas and policies"
echo "  3. ✅ Committed specs with audit trail and snapshot"
echo "  4. ✅ Generated SQL pipeline with automated tests"
echo "  5. ✅ Approval flow (dev: auto-approved, prod: requires manual approval)"
echo "  6. ✅ Executed analytics query with policy enforcement"
echo "  7. ✅ Generated complete evidence pack"
echo ""

echo -e "${CYAN}Key Findings:${NC}"
echo "  • Total high-risk exposure: \$195M"
echo "  • Weighted average NPL ratio: 17.8%"
echo "  • Highest risk category (D): 95.1% NPL ratio"
echo "  • All policy checks passed"
echo "  • PII properly masked (borrower_id)"
echo ""

echo -e "${CYAN}Compliance Evidence:${NC}"
echo "  • AUREUS guard enforced at every step"
echo "  • All actions audited with event IDs"
echo "  • Snapshots created for rollback capability"
echo "  • Budget tracking active"
echo "  • Rate limiting enforced"
echo ""

print_evidence_summary "$FINAL_EVIDENCE_DIR"

log_section "NEXT STEPS"
echo "Review evidence pack:"
echo "  cd $FINAL_EVIDENCE_DIR"
echo "  cat evidence_pack.md"
echo ""
echo "View specific artifacts:"
echo "  cat $FINAL_EVIDENCE_DIR/query_results_high_risk_exposure.json | jq ."
echo ""
echo "Run additional demos:"
echo "  ./scripts/demo_fcc_triage.sh"
echo "  ./scripts/demo_finance_recon.sh"
