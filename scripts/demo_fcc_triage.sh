#!/bin/bash
# FCC/AML Alert Triage Demo
# Demonstrates compliance workflow for financial crime detection

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/demo_helpers.sh"

# Initialize demo
EVIDENCE_DIR=$(init_demo "fcc_aml_triage")

log_section "SCENARIO: FCC/AML Alert Triage & Investigation"
echo "Business Question: Which high-priority AML alerts require immediate investigation?"
echo "Domain: Financial Crime Compliance (FCC)"
echo "Datasets: AML Alerts, Transaction Monitoring, Customer Profiles"
echo ""

# Step 1: Create sample specs via Config Copilot
log_section "STEP 1: Generate Specs via Config Copilot"
NL_INPUT="I need to analyze AML alerts with transaction patterns, customer risk scores, alert priorities, and investigation status. This data contains customer names and account numbers which are highly sensitive PII. Data must be updated in real-time for compliance. Jurisdiction is US with cross-border monitoring for EU and APAC transactions."

log_info "Natural Language Input:"
echo -e "${YELLOW}\"${NL_INPUT}\"${NC}\n"

RUN_ID=$(simulate_config_copilot "$EVIDENCE_DIR" "$NL_INPUT" "FCC_AML")
log_success "Generated specs - Run ID: $RUN_ID"

# Step 2: Validate specs
log_section "STEP 2: Validate Specs"
simulate_validation "$EVIDENCE_DIR" "$RUN_ID"

# Create detailed dataset contract for evidence
DATASET_CONTRACT=$(cat <<EOF
{
  "dataset_id": "fcc_aml_alerts_${RUN_ID:0:8}",
  "name": "FCC AML Alerts",
  "description": "Anti-Money Laundering alerts from transaction monitoring system with investigation workflow",
  "domain": "Financial Crime Compliance",
  "owner": "FCC Compliance Team",
  "classification": {
    "pii_level": "HIGH",
    "jurisdiction": "US",
    "cross_border_monitoring": ["EU", "APAC"],
    "data_category": "COMPLIANCE_REGULATED",
    "retention_period": "7_YEARS",
    "regulatory_requirements": ["BSA", "AML", "OFAC", "KYC"]
  },
  "schema": {
    "columns": [
      {"name": "alert_id", "type": "string", "nullable": false, "pii": false},
      {"name": "customer_id", "type": "string", "nullable": false, "pii": true},
      {"name": "customer_name", "type": "string", "nullable": false, "pii": true},
      {"name": "account_number", "type": "string", "nullable": false, "pii": true},
      {"name": "alert_type", "type": "string", "nullable": false, "pii": false},
      {"name": "alert_priority", "type": "string", "nullable": false, "pii": false},
      {"name": "risk_score", "type": "decimal", "nullable": false, "pii": false},
      {"name": "transaction_count", "type": "integer", "nullable": false, "pii": false},
      {"name": "total_amount_usd", "type": "decimal", "nullable": false, "pii": false},
      {"name": "suspicious_pattern", "type": "string", "nullable": true, "pii": false},
      {"name": "jurisdiction", "type": "string", "nullable": false, "pii": false},
      {"name": "investigation_status", "type": "string", "nullable": false, "pii": false},
      {"name": "assigned_analyst", "type": "string", "nullable": true, "pii": false},
      {"name": "created_at", "type": "timestamp", "nullable": false, "pii": false},
      {"name": "sla_deadline", "type": "timestamp", "nullable": false, "pii": false}
    ]
  },
  "quality_rules": [
    {
      "rule_id": "fcc_001",
      "type": "completeness",
      "check": "not_null",
      "columns": ["alert_id", "customer_id", "alert_type", "risk_score"],
      "threshold": 1.0
    },
    {
      "rule_id": "fcc_002",
      "type": "validity",
      "check": "enum",
      "column": "alert_priority",
      "allowed_values": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    },
    {
      "rule_id": "fcc_003",
      "type": "validity",
      "check": "range",
      "column": "risk_score",
      "min": 0,
      "max": 100
    },
    {
      "rule_id": "fcc_004",
      "type": "consistency",
      "check": "sla_compliance",
      "rule": "sla_deadline > created_at"
    },
    {
      "rule_id": "fcc_005",
      "type": "timeliness",
      "check": "data_freshness",
      "max_age_minutes": 5
    }
  ],
  "freshness_sla": {
    "frequency": "REALTIME",
    "max_latency_seconds": 60,
    "grace_period_minutes": 5
  },
  "policies": {
    "access_control": {
      "required_roles": ["FCC_ANALYST", "FCC_MANAGER", "COMPLIANCE_OFFICER"],
      "requires_approval": true,
      "approval_reason": "Access to highly sensitive PII and regulatory data",
      "pii_masking": {
        "enabled": true,
        "columns": ["customer_name", "account_number"],
        "method": "TOKENIZATION",
        "unmask_requires_justification": true
      }
    },
    "purpose_limitation": ["AML_INVESTIGATION", "REGULATORY_REPORTING", "SAR_FILING"],
    "cross_border_restrictions": {
      "allowed_jurisdictions": ["US", "EU", "APAC"],
      "requires_approval": true,
      "gdpr_compliant": true
    },
    "audit_requirements": {
      "log_all_access": true,
      "retention_period": "10_YEARS",
      "alert_on_unusual_access": true
    }
  }
}
EOF
)

write_evidence_file "$EVIDENCE_DIR" "dataset_contract_fcc_aml.json" "$DATASET_CONTRACT"
log_success "Dataset contract validated and documented"

# Step 3: Commit specs
log_section "STEP 3: Commit Validated Specs"
log_warning "HIGH PII data - Enhanced audit trail required"
simulate_commit "$EVIDENCE_DIR" "$RUN_ID"

# Step 4: Generate pipeline
log_section "STEP 4: Generate Data Pipeline"
PIPELINE_RUN_ID=$(simulate_pipeline_generation "$EVIDENCE_DIR" "fcc_aml_alerts_${RUN_ID:0:8}")

# Create sample pipeline SQL for evidence
PIPELINE_SQL=$(cat <<'EOF'
-- FCC/AML Alert Triage Pipeline
-- Generated: 2024-01-15
-- Target: fcc_aml_alert_queue

WITH alert_enrichment AS (
  SELECT
    a.alert_id,
    a.customer_id,
    a.alert_type,
    a.alert_priority,
    a.risk_score,
    a.transaction_count,
    a.total_amount_usd,
    a.suspicious_pattern,
    a.jurisdiction,
    a.investigation_status,
    a.assigned_analyst,
    a.created_at,
    a.sla_deadline,
    CASE
      WHEN a.investigation_status = 'NEW' AND a.sla_deadline < CURRENT_TIMESTAMP THEN 'OVERDUE'
      WHEN a.investigation_status = 'NEW' AND a.sla_deadline < CURRENT_TIMESTAMP + INTERVAL '4 hours' THEN 'AT_RISK'
      ELSE 'ON_TIME'
    END as sla_status,
    EXTRACT(EPOCH FROM (a.sla_deadline - CURRENT_TIMESTAMP)) / 3600 as hours_until_deadline,
    c.customer_risk_rating,
    c.politically_exposed_person as pep_flag,
    c.high_risk_country_flag,
    tm.prior_alert_count_90d,
    tm.prior_sar_count
  FROM {{ ref('fcc_aml_alerts') }} a
  LEFT JOIN {{ ref('fcc_customer_profiles') }} c ON a.customer_id = c.customer_id
  LEFT JOIN {{ ref('fcc_transaction_monitoring') }} tm ON a.customer_id = tm.customer_id
  WHERE a.created_at >= CURRENT_DATE - INTERVAL '90 days'
),

priority_scoring AS (
  SELECT
    *,
    (
      CASE alert_priority
        WHEN 'CRITICAL' THEN 100
        WHEN 'HIGH' THEN 75
        WHEN 'MEDIUM' THEN 50
        WHEN 'LOW' THEN 25
      END +
      CASE sla_status
        WHEN 'OVERDUE' THEN 50
        WHEN 'AT_RISK' THEN 30
        ELSE 0
      END +
      CASE
        WHEN pep_flag THEN 20
        ELSE 0
      END +
      CASE
        WHEN high_risk_country_flag THEN 15
        ELSE 0
      END +
      (risk_score * 0.5) +
      (LEAST(prior_alert_count_90d, 10) * 2)
    ) as composite_priority_score
  FROM alert_enrichment
)

SELECT
  alert_id,
  customer_id,
  alert_type,
  alert_priority,
  risk_score,
  transaction_count,
  total_amount_usd,
  suspicious_pattern,
  jurisdiction,
  investigation_status,
  assigned_analyst,
  created_at,
  sla_deadline,
  sla_status,
  hours_until_deadline,
  customer_risk_rating,
  pep_flag,
  high_risk_country_flag,
  prior_alert_count_90d,
  prior_sar_count,
  composite_priority_score,
  ROW_NUMBER() OVER (ORDER BY composite_priority_score DESC, created_at ASC) as queue_position,
  CURRENT_TIMESTAMP as processed_at
FROM priority_scoring
WHERE investigation_status IN ('NEW', 'IN_PROGRESS')
ORDER BY composite_priority_score DESC;
EOF
)

write_evidence_file "$EVIDENCE_DIR" "pipeline_fcc_alert_triage.sql" "$PIPELINE_SQL"

# Create pipeline tests
PIPELINE_TESTS=$(cat <<'EOF'
-- FCC/AML Pipeline Tests
-- Test Suite: fcc_aml_alert_queue

-- Test 1: All critical alerts are present
SELECT
  'critical_alerts_test' as test_name,
  CASE
    WHEN source_count = queue_count THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  source_count,
  queue_count
FROM (
  SELECT
    (SELECT COUNT(*) FROM fcc_aml_alerts WHERE alert_priority = 'CRITICAL' AND investigation_status IN ('NEW', 'IN_PROGRESS')) as source_count,
    (SELECT COUNT(*) FROM fcc_aml_alert_queue WHERE alert_priority = 'CRITICAL') as queue_count
);

-- Test 2: SLA calculations are correct
SELECT
  'sla_calculation_test' as test_name,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM fcc_aml_alert_queue
WHERE (sla_status = 'OVERDUE' AND sla_deadline >= CURRENT_TIMESTAMP)
   OR (sla_status = 'ON_TIME' AND sla_deadline < CURRENT_TIMESTAMP);

-- Test 3: Priority scores are within valid range
SELECT
  'priority_score_test' as test_name,
  CASE
    WHEN MIN(composite_priority_score) >= 0 AND MAX(composite_priority_score) <= 300 THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM fcc_aml_alert_queue;

-- Test 4: No duplicate alerts
SELECT
  'duplicate_test' as test_name,
  CASE
    WHEN COUNT(*) = COUNT(DISTINCT alert_id) THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM fcc_aml_alert_queue;

-- Test 5: Data freshness check
SELECT
  'freshness_test' as test_name,
  CASE
    WHEN MAX(processed_at) >= CURRENT_TIMESTAMP - INTERVAL '5 minutes' THEN 'PASS'
    ELSE 'FAIL'
  END as status
FROM fcc_aml_alert_queue;
EOF
)

write_evidence_file "$EVIDENCE_DIR" "pipeline_fcc_tests.sql" "$PIPELINE_TESTS"
log_success "Pipeline and tests generated"

# Step 5: Request approval (HIGH PII requires approval)
log_section "STEP 5: Request Approval"
log_warning "HIGH PII data access requires FCC Manager approval"
simulate_approval_request "$EVIDENCE_DIR" "ACCESS_HIGH_PII_FCC_DATA" "true"

# Step 6: Run a query
log_section "STEP 6: Execute Compliance Query"
QUERY_QUESTION="Show me all critical priority AML alerts that are overdue or at risk of missing SLA, sorted by urgency"

log_info "Compliance Question:"
echo -e "${YELLOW}\"${QUERY_QUESTION}\"${NC}\n"

simulate_query_execution "$EVIDENCE_DIR" "$QUERY_QUESTION" "fcc_aml_alert_queue"

# Create detailed query results for evidence
QUERY_RESULTS=$(cat <<EOF
{
  "query_execution": {
    "question": "$QUERY_QUESTION",
    "executed_at": "$(date -Iseconds)",
    "approval_verified": {
      "approval_id": "approval-fcc-$(date +%s)",
      "approved_by": "FCC_Manager_Demo",
      "approved_at": "$(date -Iseconds)",
      "justification": "Critical AML alert investigation required for regulatory compliance"
    },
    "policy_checks": {
      "pii_access": {
        "status": "APPROVED_WITH_CONDITIONS",
        "reason": "User has FCC_ANALYST role and approval granted",
        "pii_columns_masked": ["customer_name", "account_number"],
        "unmask_requires_per_record_justification": true
      },
      "jurisdiction_check": {
        "status": "COMPLIANT",
        "requested": ["US", "EU", "APAC"],
        "user_authorized": ["US", "EU", "APAC"],
        "cross_border_approval": "GRANTED"
      },
      "purpose_check": {
        "status": "COMPLIANT",
        "purpose": "AML_INVESTIGATION",
        "allowed_purposes": ["AML_INVESTIGATION", "REGULATORY_REPORTING", "SAR_FILING"]
      },
      "audit_trail": {
        "all_access_logged": true,
        "alert_triggered": false,
        "retention_period": "10_YEARS"
      }
    },
    "canonical_intent": {
      "measures": ["COUNT(*)", "SUM(total_amount_usd)", "AVG(risk_score)"],
      "dimensions": ["alert_type", "sla_status", "jurisdiction"],
      "filters": {
        "alert_priority": "CRITICAL",
        "sla_status": ["IN", ["OVERDUE", "AT_RISK"]],
        "investigation_status": ["IN", ["NEW", "IN_PROGRESS"]]
      },
      "order_by": ["composite_priority_score DESC", "hours_until_deadline ASC"]
    },
    "generated_sql": "SELECT alert_id, alert_type, risk_score, total_amount_usd, jurisdiction, sla_status, hours_until_deadline, composite_priority_score FROM fcc_aml_alert_queue WHERE alert_priority = 'CRITICAL' AND sla_status IN ('OVERDUE', 'AT_RISK') ORDER BY composite_priority_score DESC, hours_until_deadline ASC LIMIT 100",
    "execution_results": {
      "row_count": 23,
      "execution_time_ms": 156,
      "data": [
        {
          "alert_id": "AML-2024-001523",
          "alert_type": "STRUCTURING",
          "risk_score": 92.5,
          "total_amount_usd": 485000,
          "jurisdiction": "US",
          "sla_status": "OVERDUE",
          "hours_until_deadline": -2.5,
          "composite_priority_score": 245.6
        },
        {
          "alert_id": "AML-2024-001489",
          "alert_type": "LAYERING",
          "risk_score": 88.3,
          "total_amount_usd": 1250000,
          "jurisdiction": "EU",
          "sla_status": "OVERDUE",
          "hours_until_deadline": -1.8,
          "composite_priority_score": 238.4
        },
        {
          "alert_id": "AML-2024-001567",
          "alert_type": "HIGH_RISK_COUNTRY",
          "risk_score": 85.7,
          "total_amount_usd": 750000,
          "jurisdiction": "APAC",
          "sla_status": "AT_RISK",
          "hours_until_deadline": 1.2,
          "composite_priority_score": 235.9
        }
      ],
      "totals": {
        "total_critical_alerts": 23,
        "overdue_count": 8,
        "at_risk_count": 15,
        "total_exposure_usd": 18750000,
        "avg_risk_score": 84.2
      }
    },
    "freshness_check": {
      "as_of_timestamp": "$(date -Iseconds)",
      "data_age_seconds": 45,
      "sla_met": true,
      "realtime_sla": "60 seconds"
    },
    "citations": {
      "datasets_used": [
        {
          "dataset_id": "fcc_aml_alert_queue",
          "name": "FCC AML Alert Queue",
          "owner": "FCC Compliance Team",
          "last_updated": "$(date -Iseconds)",
          "classification": "HIGH_PII"
        }
      ]
    },
    "budget_tracking": {
      "tokens_used": 312,
      "estimated_cost_usd": 0.0047,
      "remaining_daily_budget": 99637
    },
    "regulatory_compliance": {
      "bsa_compliant": true,
      "aml_compliant": true,
      "audit_trail_complete": true,
      "sar_filing_candidates": 3
    }
  }
}
EOF
)

write_evidence_file "$EVIDENCE_DIR" "query_results_critical_alerts.json" "$QUERY_RESULTS"
log_success "Query executed with enhanced compliance controls"

# Step 7: Generate evidence pack
log_section "STEP 7: Generate Evidence Pack"
FINAL_EVIDENCE_DIR=$(generate_evidence_pack "$EVIDENCE_DIR" "FCC_AML_Alert_Triage")

# Print summary
log_section "DEMO COMPLETE"
echo -e "${GREEN}✅ All steps completed successfully${NC}\n"

echo -e "${CYAN}Workflow Summary:${NC}"
echo "  1. ✅ Generated specs for HIGH PII compliance data"
echo "  2. ✅ Validated specs with enhanced regulatory checks"
echo "  3. ✅ Committed specs with comprehensive audit trail"
echo "  4. ✅ Generated real-time alert triage pipeline"
echo "  5. ✅ Obtained required approval for HIGH PII access"
echo "  6. ✅ Executed compliance query with full authorization"
echo "  7. ✅ Generated auditor-ready evidence pack"
echo ""

echo -e "${CYAN}Key Findings:${NC}"
echo "  • 23 critical priority alerts require attention"
echo "  • 8 alerts are overdue (SLA breach)"
echo "  • 15 alerts at risk of missing SLA"
echo "  • Total exposure: \$18.75M"
echo "  • 3 potential SAR filing candidates identified"
echo ""

echo -e "${CYAN}Compliance Controls Verified:${NC}"
echo "  • ✅ Approval obtained for HIGH PII access"
echo "  • ✅ PII masking enforced (customer_name, account_number)"
echo "  • ✅ Cross-border access authorized (US, EU, APAC)"
echo "  • ✅ Purpose limitation enforced (AML_INVESTIGATION)"
echo "  • ✅ All access logged for 10-year retention"
echo "  • ✅ Real-time SLA met (45 seconds < 60 second SLA)"
echo "  • ✅ BSA/AML regulatory compliance verified"
echo ""

echo -e "${CYAN}AUREUS Guard Actions:${NC}"
echo "  • Policy evaluation: 6 checks performed"
echo "  • Approval gate enforced"
echo "  • Audit events: 8 events logged"
echo "  • Snapshots: 3 rollback points created"
echo "  • Budget tracking: \$0.0047 consumed"
echo ""

print_evidence_summary "$FINAL_EVIDENCE_DIR"

log_section "REGULATORY NOTICE"
echo -e "${YELLOW}⚠ This demo contains simulated HIGH PII data${NC}"
echo "In production:"
echo "  • Each access requires documented business justification"
echo "  • Unmask operations require per-record approval"
echo "  • Unusual access patterns trigger alerts"
echo "  • All activity subject to regulatory audit"
echo ""

log_section "NEXT STEPS"
echo "Review evidence pack:"
echo "  cd $FINAL_EVIDENCE_DIR"
echo "  cat evidence_pack.md"
echo ""
echo "Investigate specific alerts:"
echo "  cat $FINAL_EVIDENCE_DIR/query_results_critical_alerts.json | jq '.query_execution.execution_results.data'"
echo ""
echo "Run additional demos:"
echo "  ./scripts/demo_credit_risk.sh"
echo "  ./scripts/demo_finance_recon.sh"
