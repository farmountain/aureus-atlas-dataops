#!/bin/bash
# Evidence export utility for AUREUS Platform
# Exports audit logs, evidence packs, and compliance reports

set -e

# Default values
START_DATE=""
END_DATE=""
OUTPUT_FILE=""
USER_FILTER=""
DATASET_FILTER=""
EVENT_TYPE="all"
FORMAT="json"
INCLUDE_LINEAGE=false
INCLUDE_ATTACHMENTS=false
COMPRESS=true
ENCRYPT=false
REPORT_TYPE=""
ARCHIVE=false
OLDER_THAN=""
DESTINATION=""
DRY_RUN=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Usage function
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Export evidence and audit data from AUREUS Platform.

OPTIONS:
    --start-date YYYY-MM-DD    Start date for evidence range (required for exports)
    --end-date YYYY-MM-DD      End date for evidence range (required for exports)
    --output PATH              Output file path (required)
    --user EMAIL               Filter by user email
    --dataset NAME             Filter by dataset name
    --event-type TYPE          Filter by event type (query, approval, deployment, policy, all)
    --format FORMAT            Output format: json, csv, pdf (default: json)
    --include-lineage          Include data lineage information
    --include-attachments      Include binary attachments (logs, screenshots)
    --compress                 Compress output (default: true)
    --encrypt                  Encrypt output with GPG
    --report-type TYPE         Generate report: compliance, security, usage
    --archive                  Archive mode: move old evidence to cold storage
    --older-than DAYS          For archive: process evidence older than N days (e.g., 365d)
    --destination PATH         For archive: destination path (e.g., s3://bucket/)
    --dry-run                  Preview actions without executing
    --help                     Show this help message

EXAMPLES:
    # Export all evidence for January 2024
    $0 --start-date 2024-01-01 --end-date 2024-01-31 --output /tmp/evidence-jan2024.tar.gz

    # Export user activity for investigation
    $0 --user john.analyst@example.com --start-date 2024-01-01 --end-date 2024-01-31 --output /tmp/user-evidence.tar.gz

    # Generate compliance report
    $0 --report-type compliance --start-date 2024-01-01 --end-date 2024-12-31 --format pdf --output /tmp/compliance-2024.pdf

    # Archive old evidence to S3
    $0 --archive --older-than 365d --destination s3://aureus-evidence-archive/ --dry-run

EOF
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --start-date) START_DATE="$2"; shift 2 ;;
        --end-date) END_DATE="$2"; shift 2 ;;
        --output) OUTPUT_FILE="$2"; shift 2 ;;
        --user) USER_FILTER="$2"; shift 2 ;;
        --dataset) DATASET_FILTER="$2"; shift 2 ;;
        --event-type) EVENT_TYPE="$2"; shift 2 ;;
        --format) FORMAT="$2"; shift 2 ;;
        --include-lineage) INCLUDE_LINEAGE=true; shift ;;
        --include-attachments) INCLUDE_ATTACHMENTS=true; shift ;;
        --compress) COMPRESS=true; shift ;;
        --encrypt) ENCRYPT=true; shift ;;
        --report-type) REPORT_TYPE="$2"; shift 2 ;;
        --archive) ARCHIVE=true; shift ;;
        --older-than) OLDER_THAN="$2"; shift 2 ;;
        --destination) DESTINATION="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --help) usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

# Validate inputs
if [ "$ARCHIVE" = false ]; then
    if [ -z "$START_DATE" ] || [ -z "$END_DATE" ] || [ -z "$OUTPUT_FILE" ]; then
        echo -e "${RED}Error: --start-date, --end-date, and --output are required for exports${NC}"
        usage
    fi
fi

if [ "$ARCHIVE" = true ]; then
    if [ -z "$OLDER_THAN" ] || [ -z "$DESTINATION" ]; then
        echo -e "${RED}Error: --older-than and --destination are required for archiving${NC}"
        usage
    fi
fi

# Helper functions
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Function to export evidence
export_evidence() {
    info "Starting evidence export..."
    info "Date range: $START_DATE to $END_DATE"
    [ -n "$USER_FILTER" ] && info "User filter: $USER_FILTER"
    [ -n "$DATASET_FILTER" ] && info "Dataset filter: $DATASET_FILTER"
    info "Event type: $EVENT_TYPE"
    info "Output format: $FORMAT"
    info "Output file: $OUTPUT_FILE"
    
    # Create temp directory
    TEMP_DIR=$(mktemp -d)
    info "Using temp directory: $TEMP_DIR"
    
    # Export audit logs
    info "Exporting audit logs..."
    if command -v kubectl >/dev/null 2>&1; then
        # Kubernetes environment
        POD_NAME=$(kubectl get pod -n aureus -l component=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        if [ -n "$POD_NAME" ]; then
            kubectl exec -n aureus "$POD_NAME" -- find /app/evidence/audit/ -name "*.json" \
                -exec grep -l "$START_DATE\|$END_DATE" {} \; > "$TEMP_DIR/audit_files.txt" 2>/dev/null || true
            
            while IFS= read -r file; do
                kubectl cp "aureus/$POD_NAME:$file" "$TEMP_DIR/audit/" 2>/dev/null || true
            done < "$TEMP_DIR/audit_files.txt"
        else
            warn "No frontend pod found, skipping pod-based export"
        fi
    elif command -v docker >/dev/null 2>&1; then
        # Docker environment
        if docker ps | grep -q aureus-frontend; then
            docker cp aureus-frontend:/app/evidence/audit "$TEMP_DIR/" 2>/dev/null || true
        else
            warn "AUREUS container not running, checking local evidence directory"
            if [ -d "./evidence/audit" ]; then
                cp -r ./evidence/audit "$TEMP_DIR/" 2>/dev/null || true
            fi
        fi
    else
        # Local filesystem
        if [ -d "./evidence/audit" ]; then
            cp -r ./evidence/audit "$TEMP_DIR/" 2>/dev/null || true
        fi
    fi
    
    # Filter by date range, user, dataset
    if [ -d "$TEMP_DIR/audit" ]; then
        AUDIT_COUNT=$(find "$TEMP_DIR/audit" -name "*.json" | wc -l)
        info "Found $AUDIT_COUNT audit log files"
        
        # Apply filters
        if [ -n "$USER_FILTER" ]; then
            info "Filtering by user: $USER_FILTER"
            find "$TEMP_DIR/audit" -name "*.json" -exec grep -L "$USER_FILTER" {} \; | xargs rm -f 2>/dev/null || true
        fi
        
        if [ -n "$DATASET_FILTER" ]; then
            info "Filtering by dataset: $DATASET_FILTER"
            find "$TEMP_DIR/audit" -name "*.json" -exec grep -L "$DATASET_FILTER" {} \; | xargs rm -f 2>/dev/null || true
        fi
        
        FILTERED_COUNT=$(find "$TEMP_DIR/audit" -name "*.json" | wc -l)
        info "After filtering: $FILTERED_COUNT files"
    fi
    
    # Generate manifest
    info "Generating evidence manifest..."
    cat > "$TEMP_DIR/manifest.json" <<EOF
{
  "export_id": "export-$(date +%Y%m%d-%H%M%S)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "date_range": {
    "start": "$START_DATE",
    "end": "$END_DATE"
  },
  "filters": {
    "user": "$USER_FILTER",
    "dataset": "$DATASET_FILTER",
    "event_type": "$EVENT_TYPE"
  },
  "options": {
    "format": "$FORMAT",
    "include_lineage": $INCLUDE_LINEAGE,
    "include_attachments": $INCLUDE_ATTACHMENTS,
    "compressed": $COMPRESS,
    "encrypted": $ENCRYPT
  },
  "statistics": {
    "total_files": $FILTERED_COUNT,
    "export_size_bytes": $(du -sb "$TEMP_DIR" | cut -f1)
  }
}
EOF
    
    # Convert format if needed
    if [ "$FORMAT" == "csv" ]; then
        info "Converting to CSV format..."
        # Simple JSON to CSV conversion (requires jq)
        if command -v jq >/dev/null 2>&1; then
            find "$TEMP_DIR/audit" -name "*.json" -exec cat {} \; | \
                jq -r '[.timestamp, .actor.user_id, .event_type, .action.type, .outcome] | @csv' \
                > "$TEMP_DIR/audit_export.csv"
            success "CSV conversion complete"
        else
            warn "jq not found, skipping CSV conversion"
        fi
    elif [ "$FORMAT" == "pdf" ]; then
        info "PDF generation requested but not implemented in this script"
        warn "Use --format json and convert externally"
    fi
    
    # Compress if requested
    if [ "$COMPRESS" = true ]; then
        info "Compressing evidence package..."
        OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
        mkdir -p "$OUTPUT_DIR"
        tar -czf "$OUTPUT_FILE" -C "$TEMP_DIR" .
        success "Evidence compressed to: $OUTPUT_FILE"
    else
        info "Copying evidence to output..."
        cp -r "$TEMP_DIR"/* "$(dirname "$OUTPUT_FILE")/"
        success "Evidence exported to: $(dirname "$OUTPUT_FILE")"
    fi
    
    # Encrypt if requested
    if [ "$ENCRYPT" = true ]; then
        info "Encrypting evidence package..."
        if command -v gpg >/dev/null 2>&1; then
            gpg --symmetric --cipher-algo AES256 "$OUTPUT_FILE"
            rm "$OUTPUT_FILE"
            OUTPUT_FILE="${OUTPUT_FILE}.gpg"
            success "Evidence encrypted to: $OUTPUT_FILE"
        else
            error "GPG not found, cannot encrypt"
        fi
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    # Generate verification checksum
    if command -v sha256sum >/dev/null 2>&1; then
        CHECKSUM=$(sha256sum "$OUTPUT_FILE" | awk '{print $1}')
        echo "$CHECKSUM  $OUTPUT_FILE" > "${OUTPUT_FILE}.sha256"
        info "SHA256: $CHECKSUM"
    fi
    
    success "Evidence export complete!"
    info "Output file: $OUTPUT_FILE"
    info "Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
}

# Function to archive old evidence
archive_evidence() {
    info "Starting evidence archival..."
    info "Age threshold: $OLDER_THAN"
    info "Destination: $DESTINATION"
    [ "$DRY_RUN" = true ] && info "DRY RUN MODE - No changes will be made"
    
    # Convert OLDER_THAN to days
    DAYS=$(echo "$OLDER_THAN" | grep -oP '\d+')
    
    # Find old evidence files
    if command -v kubectl >/dev/null 2>&1; then
        POD_NAME=$(kubectl get pod -n aureus -l component=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
        if [ -n "$POD_NAME" ]; then
            info "Finding evidence older than $DAYS days..."
            OLD_FILES=$(kubectl exec -n aureus "$POD_NAME" -- \
                find /app/evidence -type f -mtime "+$DAYS" 2>/dev/null || echo "")
            
            FILE_COUNT=$(echo "$OLD_FILES" | wc -l)
            info "Found $FILE_COUNT files to archive"
            
            if [ "$DRY_RUN" = false ] && [ -n "$OLD_FILES" ]; then
                # Archive to destination
                if [[ "$DESTINATION" == s3://* ]]; then
                    info "Archiving to S3..."
                    # Use AWS CLI to upload
                    kubectl exec -n aureus "$POD_NAME" -- \
                        tar -czf - $(echo "$OLD_FILES") | \
                        aws s3 cp - "${DESTINATION}/evidence-archive-$(date +%Y%m%d).tar.gz"
                    success "Archived to S3"
                else
                    info "Archiving to local destination..."
                    mkdir -p "$DESTINATION"
                    kubectl exec -n aureus "$POD_NAME" -- \
                        tar -czf - $(echo "$OLD_FILES") > "${DESTINATION}/evidence-archive-$(date +%Y%m%d).tar.gz"
                    success "Archived locally"
                fi
                
                # Delete archived files
                info "Removing archived files from active storage..."
                echo "$OLD_FILES" | while read -r file; do
                    kubectl exec -n aureus "$POD_NAME" -- rm "$file" 2>/dev/null || true
                done
                success "Cleanup complete"
            fi
        fi
    fi
    
    success "Evidence archival complete!"
}

# Generate compliance report
generate_compliance_report() {
    info "Generating $REPORT_TYPE report for $START_DATE to $END_DATE..."
    
    # This is a simplified version - real implementation would query database
    # and generate comprehensive reports
    
    TEMP_DIR=$(mktemp -d)
    
    cat > "$TEMP_DIR/compliance_report.md" <<EOF
# AUREUS Platform Compliance Report
## Period: $START_DATE to $END_DATE
## Generated: $(date)

### Executive Summary
- Total queries executed: [FROM DATABASE]
- Total approvals processed: [FROM DATABASE]
- Policy compliance rate: [FROM DATABASE]
- Audit coverage: [FROM DATABASE]

### Detailed Findings
[Would be generated from actual data]

### Recommendations
[Based on analysis]
EOF
    
    if [ "$FORMAT" == "pdf" ]; then
        warn "PDF generation requires external tool (pandoc, wkhtmltopdf, etc.)"
        info "Markdown report available at: $TEMP_DIR/compliance_report.md"
    fi
    
    cp "$TEMP_DIR/compliance_report.md" "$OUTPUT_FILE"
    rm -rf "$TEMP_DIR"
    success "Report generated: $OUTPUT_FILE"
}

# Main execution
if [ "$ARCHIVE" = true ]; then
    archive_evidence
elif [ -n "$REPORT_TYPE" ]; then
    generate_compliance_report
else
    export_evidence
fi

exit 0
