# Config Copilot Evidence Runs

This directory stores evidence artifacts for all Config Copilot operations.

Each evidence run is stored in a subdirectory named by commit ID:
`/evidence/config_copilot_runs/{commitId}/`

## Evidence Structure

Each evidence artifact contains:

```json
{
  "id": "uuid",
  "timestamp": "ISO 8601",
  "requestId": "original describe request ID",
  "nlInput": "natural language input from user",
  "generatedSpecs": {
    "datasetContract": {},
    "dqRules": [],
    "policies": [],
    "slas": []
  },
  "validationResults": {
    "valid": boolean,
    "errors": [],
    "warnings": []
  },
  "commitResult": {
    "commitId": "uuid",
    "filesWritten": [],
    "auditEventId": "uuid",
    "snapshotId": "uuid",
    "status": "success|failed"
  },
  "auditLogRefs": ["audit_event_ids"],
  "actor": "user@bank.com"
}
```

## Evidence Artifacts Include:

1. **Request Context**: Original NL input and metadata
2. **Generated Specifications**: All generated specs (contracts, DQ rules, policies, SLAs)
3. **Validation Results**: Schema validation outcomes, errors, warnings
4. **Commit Details**: Files written, snapshot ID, audit event ID
5. **Audit Trail**: References to audit log entries
6. **Actor Information**: Who performed the operation

## Accessing Evidence

Evidence can be retrieved programmatically:

```typescript
import { ConfigCopilotService } from '@/lib/config-copilot';

// Get specific evidence
const evidence = await ConfigCopilotService.getEvidence(commitId);

// List all evidence runs
const evidenceRuns = await ConfigCopilotService.listEvidenceRuns();
```

## Compliance & Audit

All Config Copilot operations are:
- ✅ Audited with immutable event logs
- ✅ Snapshotted for rollback capability
- ✅ Evidence-gated (no commit without validation)
- ✅ Policy-checked through AUREUS guard
- ✅ Traceable to original user intent
