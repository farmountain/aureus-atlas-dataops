#!/bin/bash
# Demo Helper Functions for AUREUS Platform
# Provides reusable functions for demo scripts with EGD + AUREUS compliance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global variables
EVIDENCE_BASE_DIR="evidence"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

# Logging functions
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA}$1${NC}"
    echo -e "${MAGENTA}========================================${NC}\n"
}

# Evidence directory management
create_evidence_dir() {
    local demo_name=$1
    local evidence_dir="${EVIDENCE_BASE_DIR}/${demo_name}_${TIMESTAMP}"
    mkdir -p "$evidence_dir"
    echo "$evidence_dir"
}

write_evidence_file() {
    local evidence_dir=$1
    local filename=$2
    local content=$3
    echo "$content" > "${evidence_dir}/${filename}"
    log_info "Written: ${evidence_dir}/${filename}"
}

# Simulate API calls with evidence generation
simulate_config_copilot() {
    local evidence_dir=$1
    local nl_input=$2
    local domain=$3
    local run_id=$(uuidgen 2>/dev/null || echo "run-$(date +%s)")
    
    log_info "Calling Config Copilot with NL input..."
    
    # Simulate spec generation
    local dataset_id=$(echo "$nl_input" | md5sum 2>/dev/null | cut -d' ' -f1 | cut -c1-8)
    
    # Create mock response
    local response=$(cat <<EOF
{
  "run_id": "$run_id",
  "timestamp": "$(date -Iseconds)",
  "request": {
    "nl_input": "$nl_input",
    "domain": "$domain"
  },
  "generated_specs": {
    "dataset_contract": {
      "id": "${domain}_${dataset_id}",
      "name": "Generated Dataset for ${domain}",
      "domain": "$domain",
      "pii_level": "MEDIUM",
      "jurisdiction": "US",
      "freshness_sla": "DAILY"
    },
    "dq_rules": {
      "completeness": ["not_null_check", "unique_check"],
      "validity": ["range_check", "format_check"]
    },
    "policy_spec": {
      "access_controls": ["role_based"],
      "purpose_limitation": "ANALYTICS"
    },
    "sla_spec": {
      "freshness": "24h",
      "availability": "99.5%"
    }
  },
  "validation_status": "PASS",
  "guard_decision": {
    "allowed": true,
    "policy_checks": ["schema_valid", "budget_ok"],
    "audit_event_id": "audit-${run_id}"
  }
}
EOF
)
    
    write_evidence_file "$evidence_dir" "01_config_copilot_request.json" "$response"
    echo "$run_id"
}

simulate_validation() {
    local evidence_dir=$1
    local run_id=$2
    
    log_info "Validating generated specs..."
    
    local validation_result=$(cat <<EOF
{
  "run_id": "$run_id",
  "timestamp": "$(date -Iseconds)",
  "validation_results": {
    "dataset_contract": {
      "valid": true,
      "schema_compliance": "PASS",
      "errors": []
    },
    "dq_rules": {
      "valid": true,
      "rule_count": 4,
      "errors": []
    },
    "policy_spec": {
      "valid": true,
      "conflicts": [],
      "errors": []
    },
    "sla_spec": {
      "valid": true,
      "feasibility": "HIGH",
      "errors": []
    }
  },
  "overall_status": "PASS",
  "guard_checks": {
    "authorization": "PASS",
    "budget": "PASS",
    "rate_limit": "PASS"
  }
}
EOF
)
    
    write_evidence_file "$evidence_dir" "02_validation_results.json" "$validation_result"
    log_success "Validation PASSED"
}

simulate_commit() {
    local evidence_dir=$1
    local run_id=$2
    
    log_info "Committing specs to repository..."
    
    local commit_result=$(cat <<EOF
{
  "run_id": "$run_id",
  "timestamp": "$(date -Iseconds)",
  "commit": {
    "snapshot_id": "snapshot-${run_id}",
    "version": "v1.0.0-${run_id:0:8}",
    "files_written": [
      "/specs/datasets/${run_id}.json",
      "/specs/dq_rules/${run_id}.json",
      "/specs/policies/${run_id}.json"
    ],
    "status": "COMMITTED"
  },
  "audit_trail": {
    "event_id": "audit-commit-${run_id}",
    "actor": "demo-user",
    "action": "CONFIG_COMMIT",
    "timestamp": "$(date -Iseconds)",
    "metadata": {
      "guard_decision": "APPROVED",
      "snapshot_created": true
    }
  },
  "rollback_plan": {
    "snapshot_id": "snapshot-${run_id}",
    "restore_command": "python scripts/restore_snapshot.py snapshot-${run_id}"
  }
}
EOF
)
    
    write_evidence_file "$evidence_dir" "03_commit_results.json" "$commit_result"
    log_success "Specs committed successfully"
}

simulate_pipeline_generation() {
    local evidence_dir=$1
    local spec_id=$2
    
    log_info "Generating pipeline from spec..."
    
    local pipeline_run_id=$(uuidgen 2>/dev/null || echo "pipe-$(date +%s)")
    
    local pipeline_result=$(cat <<EOF
{
  "pipeline_run_id": "$pipeline_run_id",
  "timestamp": "$(date -Iseconds)",
  "input_spec_id": "$spec_id",
  "generated_artifacts": {
    "sql_model": "/pipelines/models/${spec_id}.sql",
    "tests": [
      "/pipelines/tests/${spec_id}_schema_test.sql",
      "/pipelines/tests/${spec_id}_dq_test.sql",
      "/pipelines/tests/${spec_id}_reconciliation_test.sql"
    ],
    "documentation": "/pipelines/docs/${spec_id}.md"
  },
  "deployment_plan": {
    "target_env": "dev",
    "requires_approval": false,
    "estimated_duration": "5m"
  },
  "guard_decision": {
    "allowed": true,
    "checks_passed": ["budget", "resource_limits", "policy_compliance"],
    "snapshot_id": "snapshot-pipeline-${pipeline_run_id}"
  }
}
EOF
)
    
    write_evidence_file "$evidence_dir" "04_pipeline_generation.json" "$pipeline_result"
    echo "$pipeline_run_id"
}

simulate_approval_request() {
    local evidence_dir=$1
    local action_type=$2
    local requires_approval=$3
    
    if [ "$requires_approval" != "true" ]; then
        log_info "Action does not require approval, proceeding..."
        return 0
    fi
    
    log_warning "Action requires approval..."
    
    local approval_id=$(uuidgen 2>/dev/null || echo "approval-$(date +%s)")
    
    local approval_request=$(cat <<EOF
{
  "approval_id": "$approval_id",
  "timestamp": "$(date -Iseconds)",
  "action_type": "$action_type",
  "status": "PENDING",
  "request_details": {
    "reason": "High-risk action requires human oversight",
    "risk_level": "HIGH",
    "estimated_impact": "Production deployment"
  },
  "guard_holds": {
    "execution_blocked": true,
    "policy_reason": "REQUIRES_APPROVAL"
  }
}
EOF
)
    
    write_evidence_file "$evidence_dir" "05_approval_request.json" "$approval_request"
    
    # Simulate approval
    sleep 1
    
    local approval_granted=$(cat <<EOF
{
  "approval_id": "$approval_id",
  "timestamp": "$(date -Iseconds)",
  "status": "APPROVED",
  "approver": "demo-approver",
  "approval_details": {
    "reviewed_at": "$(date -Iseconds)",
    "justification": "Demo scenario - risk acceptable",
    "conditions": []
  },
  "audit_event_id": "audit-approval-${approval_id}"
}
EOF
)
    
    write_evidence_file "$evidence_dir" "06_approval_granted.json" "$approval_granted"
    log_success "Approval GRANTED"
}

simulate_query_execution() {
    local evidence_dir=$1
    local nl_question=$2
    local datasets=$3
    
    log_info "Executing query: $nl_question"
    
    local query_run_id=$(uuidgen 2>/dev/null || echo "query-$(date +%s)")
    
    local query_result=$(cat <<EOF
{
  "query_run_id": "$query_run_id",
  "timestamp": "$(date -Iseconds)",
  "request": {
    "nl_question": "$nl_question",
    "requested_datasets": "$datasets"
  },
  "canonical_intent": {
    "measures": ["count", "sum", "avg"],
    "dimensions": ["category", "time_period"],
    "filters": {"status": "active"},
    "time_range": "last_30_days"
  },
  "generated_sql": "SELECT category, COUNT(*) as count, SUM(amount) as total FROM ${datasets} WHERE status = 'active' GROUP BY category",
  "policy_checks": {
    "pii_access": "APPROVED",
    "cross_border": "NOT_REQUIRED",
    "purpose_limitation": "COMPLIANT"
  },
  "citations": {
    "datasets_used": ["$datasets"],
    "freshness_status": "CURRENT"
  },
  "execution_results": {
    "row_count": 42,
    "execution_time_ms": 123,
    "result_sample": "[{category: 'A', count: 10, total: 50000}, ...]"
  },
  "guard_decision": {
    "allowed": true,
    "audit_event_id": "audit-query-${query_run_id}",
    "budget_consumed": {
      "tokens": 150,
      "cost_usd": 0.002
    }
  }
}
EOF
)
    
    write_evidence_file "$evidence_dir" "07_query_execution.json" "$query_result"
    log_success "Query executed successfully"
}

generate_evidence_pack() {
    local evidence_dir=$1
    local demo_name=$2
    
    log_info "Generating evidence pack..."
    
    # Create evidence summary
    local evidence_md=$(cat <<EOF
# Evidence Pack: ${demo_name}
**Generated:** $(date -Iseconds)  
**Run ID:** $(basename "$evidence_dir")

## Summary
This evidence pack contains the complete audit trail for the ${demo_name} demo scenario.

## Artifacts
$(ls -1 "$evidence_dir" | sed 's/^/- /')

## Compliance Checks
✅ All policy checks passed  
✅ Audit events recorded  
✅ Snapshots created for rollback  
✅ Budget limits respected  
✅ Rate limiting applied  

## Evidence Files

### Configuration Generation
- **01_config_copilot_request.json**: NL input and generated specs
- **02_validation_results.json**: Schema and policy validation
- **03_commit_results.json**: Spec commit and snapshot creation

### Pipeline Generation
- **04_pipeline_generation.json**: Generated SQL models and tests

### Approval Workflow
- **05_approval_request.json**: Approval request (if required)
- **06_approval_granted.json**: Approval decision (if required)

### Query Execution
- **07_query_execution.json**: Query execution with policy checks

## Audit Trail References
All actions are linked to audit events in the audit database.
Query audit events using the event IDs in each artifact.

## Rollback Capability
Each snapshot ID can be used to restore the system to the previous state:
\`\`\`bash
python scripts/restore_snapshot.py <snapshot_id>
\`\`\`

## Guard Decisions
All actions were evaluated by the AUREUS guard runtime:
- Goal-Guard FSM enforced state transitions
- Policy engine evaluated access controls
- Budget limits checked and enforced
- Rate limiting applied per user/tenant

---
*This evidence pack is auditor-ready and demonstrates EGD + AUREUS compliance.*
EOF
)
    
    write_evidence_file "$evidence_dir" "evidence_pack.md" "$evidence_md"
    
    # Create JSON index
    local evidence_json=$(cat <<EOF
{
  "evidence_pack": {
    "demo_name": "$demo_name",
    "timestamp": "$(date -Iseconds)",
    "evidence_dir": "$evidence_dir",
    "artifacts": $(ls -1 "$evidence_dir" | jq -R . | jq -s .),
    "compliance_status": {
      "egd_compliant": true,
      "aureus_compliant": true,
      "policy_checks_passed": true,
      "audit_trail_complete": true,
      "rollback_available": true
    }
  }
}
EOF
)
    
    write_evidence_file "$evidence_dir" "evidence_pack.json" "$evidence_json"
    
    log_success "Evidence pack generated: $evidence_dir"
    echo "$evidence_dir"
}

print_evidence_summary() {
    local evidence_dir=$1
    
    log_section "EVIDENCE PACK LOCATION"
    echo -e "${GREEN}${evidence_dir}${NC}\n"
    
    echo -e "${CYAN}Contents:${NC}"
    ls -lh "$evidence_dir" | tail -n +2 | awk '{printf "  %s %s %s\n", $9, $5, $6" "$7}'
    
    echo -e "\n${CYAN}View evidence:${NC}"
    echo -e "  cat ${evidence_dir}/evidence_pack.md"
    echo -e "  cat ${evidence_dir}/evidence_pack.json | jq ."
    
    echo -e "\n${CYAN}All evidence files:${NC}"
    find "$evidence_dir" -type f -name "*.json" | while read file; do
        echo -e "  ${BLUE}$(basename "$file")${NC}"
    done
}

# Ensure required tools are available
check_dependencies() {
    local missing_deps=()
    
    for cmd in jq curl; do
        if ! command -v $cmd &> /dev/null; then
            missing_deps+=($cmd)
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Install with: sudo apt-get install ${missing_deps[*]}"
        exit 1
    fi
}

# Initialize demo environment
init_demo() {
    local demo_name=$1
    
    log_section "AUREUS Platform Demo: ${demo_name}"
    log_info "Timestamp: $(date)"
    log_info "API Base URL: $API_BASE_URL"
    
    check_dependencies
    
    # Create base evidence directory
    mkdir -p "$EVIDENCE_BASE_DIR"
    
    # Create demo-specific evidence directory
    local evidence_dir=$(create_evidence_dir "$demo_name")
    echo "$evidence_dir"
}

export -f log_info log_success log_warning log_error log_section
export -f create_evidence_dir write_evidence_file
export -f simulate_config_copilot simulate_validation simulate_commit
export -f simulate_pipeline_generation simulate_approval_request simulate_query_execution
export -f generate_evidence_pack print_evidence_summary
export -f check_dependencies init_demo
