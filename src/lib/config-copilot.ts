import type { 
  ConfigDrafts, 
  DatasetContractSpec, 
  DQRuleSpec, 
  PolicySpec, 
  SLASpec,
  ValidationResult 
} from './config-schemas';
import { 
  validateAllSpecs, 
  validateDatasetContract,
  validateDQRules,
  validatePolicies,
  validateSLAs 
} from './config-schemas';
import type { AuditEvent, UserRole } from './types';
import { v4 as uuidv4 } from 'uuid';
import { EvidenceKeys, getEvidenceBundle, storeEvidenceBundle } from './evidence-store';
import { AureusGuard } from './aureus-guard';
import { PolicyEvaluator } from './policy-evaluator';
import type { ActionContext, GuardConfig } from './aureus-types';
import { ApprovalService } from './approval-service';

export interface ConfigDescribeRequest {
  nlInput: string;
  context?: {
    domain?: string;
    existingDatasets?: string[];
    complianceRequirements?: string[];
  };
}

export interface ConfigDescribeResponse {
  requestId: string;
  timestamp: string;
  nlInput: string;
  drafts: ConfigDrafts;
  reasoning: string;
  confidence: number;
  validationPreview: ValidationResult;
}

export interface ConfigCommitRequest {
  requestId: string;
  drafts: ConfigDrafts;
  commitMessage: string;
  actor: string;
  role: UserRole;
  environment?: GuardConfig['environment'];
}

export interface ConfigCommitResponse {
  commitId: string;
  timestamp: string;
  filesWritten: string[];
  validationResult: ValidationResult;
  auditEventId: string;
  snapshotId: string;
  status: 'success' | 'failed';
  errors?: string[];
}

export interface ConfigEvidence {
  id: string;
  timestamp: string;
  requestId: string;
  nlInput: string;
  generatedSpecs: ConfigDrafts;
  validationResults: ValidationResult;
  commitResult?: ConfigCommitResponse;
  auditLogRefs: string[];
  actor: string;
}

export class ConfigCopilotService {
  private static async generateDatasetContract(nlInput: string, context?: Record<string, unknown>): Promise<DatasetContractSpec | null> {
    const prompt = spark.llmPrompt`You are a data contract specification expert for banking systems.

Given the following natural language description, generate a complete dataset contract specification.

Natural Language Input:
${nlInput}

Context:
${JSON.stringify(context || {})}

Generate a dataset contract that includes:
1. A clear dataset name (snake_case)
2. Appropriate banking domain (credit_risk, aml_fcc, finance, treasury, retail, ops)
3. Owner email
4. Detailed description
5. Complete schema with columns (name, type, nullable, pii flags, descriptions)
6. PII level assessment (none/low/high)
7. Jurisdiction (US/EU/UK/APAC/multi)
8. Freshness SLA in hours
9. Relevant tags
10. Ingestion schedule if applicable
11. Source system if mentioned
12. Retention policy if applicable

Return ONLY a valid JSON object with a single "datasetContract" property containing the specification. Use this format:
{
  "datasetContract": {
    "name": "dataset_name",
    "domain": "credit_risk",
    "owner": "owner@bank.com",
    "description": "Detailed description",
    "schema": [
      {
        "name": "column_name",
        "type": "string",
        "nullable": false,
        "pii": false,
        "description": "Column description"
      }
    ],
    "piiLevel": "high",
    "jurisdiction": "US",
    "freshnessSLA": 24,
    "tags": ["regulatory", "risk"],
    "ingestionSchedule": "0 2 * * *",
    "sourceSystem": "Core Banking",
    "retention": {
      "period": 7,
      "unit": "years"
    }
  }
}`;

    try {
      const response = await spark.llm(prompt, 'gpt-4o', true);
      const parsed = JSON.parse(response);
      return parsed.datasetContract || null;
    } catch (error) {
      console.error('Failed to generate dataset contract:', error);
      return null;
    }
  }

  private static async generateDQRules(nlInput: string, datasetContract?: DatasetContractSpec): Promise<DQRuleSpec[]> {
    const prompt = spark.llmPrompt`You are a data quality rule specification expert for banking systems.

Given the following natural language description and dataset contract, generate comprehensive data quality rules.

Natural Language Input:
${nlInput}

Dataset Contract:
${JSON.stringify(datasetContract || {})}

Generate DQ rules that include:
1. Completeness checks (non-null required fields)
2. Uniqueness checks (primary keys, unique identifiers)
3. Validity checks (value ranges, enums, formats)
4. Consistency checks (cross-field validations)
5. Timeliness checks (freshness, staleness)

For each rule specify:
- ruleName: descriptive name
- ruleType: completeness/uniqueness/validity/consistency/timeliness
- description: what the rule checks
- column: which column (if applicable)
- condition: SQL-like condition
- threshold: pass percentage (0-100)
- severity: error or warning
- enabled: true/false

Return ONLY a valid JSON object with a single "dqRules" property containing an array. Use this format:
{
  "dqRules": [
    {
      "ruleName": "account_id_not_null",
      "ruleType": "completeness",
      "description": "Account ID must be populated",
      "column": "account_id",
      "condition": "account_id IS NOT NULL",
      "threshold": 100,
      "severity": "error",
      "enabled": true
    }
  ]
}`;

    try {
      const response = await spark.llm(prompt, 'gpt-4o', true);
      const parsed = JSON.parse(response);
      return parsed.dqRules || [];
    } catch (error) {
      console.error('Failed to generate DQ rules:', error);
      return [];
    }
  }

  private static async generatePolicies(nlInput: string, datasetContract?: DatasetContractSpec): Promise<PolicySpec[]> {
    const prompt = spark.llmPrompt`You are a data governance policy specification expert for banking systems.

Given the following natural language description and dataset contract, generate appropriate governance policies.

Natural Language Input:
${nlInput}

Dataset Contract:
${JSON.stringify(datasetContract || {})}

Generate policies that cover:
1. Access control (who can access what)
2. Data quality gates (minimum quality thresholds)
3. Retention policies (how long to keep data)
4. Approval workflows (what requires approval)
5. Masking policies (PII protection)

For each policy specify:
- policyId: unique identifier (lowercase_snake_case)
- policyName: human-readable name
- policyType: access/quality/retention/approval/masking
- description: what the policy enforces
- scope: which domains/datasets/piiLevels/jurisdictions/roles
- condition: evaluation condition
- action: allow/block/require_approval/mask
- approvers: list of approver emails (if action is require_approval)
- effectiveDate: ISO date
- priority: number (higher = evaluated first)

Return ONLY a valid JSON object with a single "policies" property containing an array. Use this format:
{
  "policies": [
    {
      "policyId": "pii_high_requires_approval",
      "policyName": "High PII Access Requires Approval",
      "policyType": "access",
      "description": "Access to high PII datasets requires manager approval",
      "scope": {
        "piiLevels": ["high"]
      },
      "condition": "user.role != 'admin' AND dataset.piiLevel = 'high'",
      "action": "require_approval",
      "approvers": ["data.governance@bank.com"],
      "effectiveDate": "${new Date().toISOString()}",
      "priority": 100
    }
  ]
}`;

    try {
      const response = await spark.llm(prompt, 'gpt-4o', true);
      const parsed = JSON.parse(response);
      return parsed.policies || [];
    } catch (error) {
      console.error('Failed to generate policies:', error);
      return [];
    }
  }

  private static async generateSLAs(nlInput: string, datasetContract?: DatasetContractSpec): Promise<SLASpec[]> {
    const prompt = spark.llmPrompt`You are a service level agreement (SLA) specification expert for banking data systems.

Given the following natural language description and dataset contract, generate appropriate SLA specifications.

Natural Language Input:
${nlInput}

Dataset Contract:
${JSON.stringify(datasetContract || {})}

Generate SLAs that define:
1. Freshness targets (how often data should be updated)
2. Availability targets (uptime percentage)
3. Quality targets (DQ pass rate percentage)
4. Latency targets (query response time)
5. Alerting configuration

For each SLA specify:
- slaName: descriptive name
- datasetName: target dataset
- metrics: freshness/availability/quality/latency with targets
- alerting: channels, recipients, threshold
- owner: responsible party email
- reviewCadence: weekly/monthly/quarterly

Return ONLY a valid JSON object with a single "slas" property containing an array. Use this format:
{
  "slas": [
    {
      "slaName": "Credit Risk Daily Refresh",
      "datasetName": "loan_portfolio",
      "metrics": {
        "freshness": {
          "target": 24,
          "unit": "hours",
          "measurement": "last_update_age"
        },
        "availability": {
          "target": 99.9,
          "unit": "percentage",
          "measurement": "uptime"
        },
        "quality": {
          "target": 95,
          "unit": "percentage",
          "measurement": "dq_pass_rate"
        }
      },
      "alerting": {
        "channels": ["email", "slack"],
        "recipients": ["risk.team@bank.com"],
        "threshold": 90
      },
      "owner": "risk.lead@bank.com",
      "reviewCadence": "monthly"
    }
  ]
}`;

    try {
      const response = await spark.llm(prompt, 'gpt-4o', true);
      const parsed = JSON.parse(response);
      return parsed.slas || [];
    } catch (error) {
      console.error('Failed to generate SLAs:', error);
      return [];
    }
  }

  static async describe(request: ConfigDescribeRequest): Promise<ConfigDescribeResponse> {
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();

    const datasetContract = await this.generateDatasetContract(request.nlInput, request.context);
    
    const [dqRules, policies, slas] = await Promise.all([
      this.generateDQRules(request.nlInput, datasetContract || undefined),
      this.generatePolicies(request.nlInput, datasetContract || undefined),
      this.generateSLAs(request.nlInput, datasetContract || undefined)
    ]);

    const drafts: ConfigDrafts = {
      datasetContract: datasetContract || undefined,
      dqRules: dqRules.length > 0 ? dqRules : undefined,
      policies: policies.length > 0 ? policies : undefined,
      slas: slas.length > 0 ? slas : undefined
    };

    const validationPreview = validateAllSpecs(drafts);

    const hasAnySpec = !!(drafts.datasetContract || drafts.dqRules || drafts.policies || drafts.slas);
    const confidence = hasAnySpec ? (validationPreview.valid ? 0.95 : 0.75) : 0.3;

    const reasoningPrompt = spark.llmPrompt`Summarize in 2-3 sentences why these specifications were generated for the input: "${request.nlInput}"`;
    let reasoning = 'Generated specifications based on natural language input.';
    try {
      reasoning = await spark.llm(reasoningPrompt, 'gpt-4o-mini', false);
    } catch {
      
    }

    return {
      requestId,
      timestamp,
      nlInput: request.nlInput,
      drafts,
      reasoning,
      confidence,
      validationPreview
    };
  }

  static async commit(request: ConfigCommitRequest): Promise<ConfigCommitResponse> {
    const commitId = uuidv4();
    const timestamp = new Date().toISOString();
    const filesWritten: string[] = [];
    const errors: string[] = [];
    const environment = request.environment ?? 'prod';

    const validationResult = validateAllSpecs(request.drafts);

    if (!validationResult.valid) {
      return {
        commitId,
        timestamp,
        filesWritten: [],
        validationResult,
        auditEventId: '',
        snapshotId: '',
        status: 'failed',
        errors: validationResult.errors.map(e => `${e.field}: ${e.message}`)
      };
    }

    try {
      const guardConfig: GuardConfig = {
        environment,
        budgetLimits: {
          tokenBudget: 10000,
          queryCostBudget: 1000,
        },
        enableAudit: true,
        enableSnapshots: true,
      };
      const guard = new AureusGuard(guardConfig, new PolicyEvaluator());
      const approvalService = new ApprovalService(guard);
      const datasetContract = request.drafts.datasetContract;
      const policyContext: ActionContext = {
        actionType: 'config.commit',
        actor: request.actor,
        role: request.role,
        environment,
        metadata: {
          domain: datasetContract?.domain,
          piiLevel: datasetContract?.piiLevel,
          requestId: request.requestId,
        },
      };

      const policyCheck = await guard.checkPolicy(policyContext);
      if (!policyCheck.allow && policyCheck.requiresApproval) {
        const approval = await approvalService.requestApproval({
          actionType: 'policy_change',
          requester: request.actor,
          requesterRole: request.role,
          description: `Config commit requires approval: ${request.commitMessage}`,
          actionPayload: {
            requestId: request.requestId,
            commitMessage: request.commitMessage,
            drafts: request.drafts,
          },
          actionContext: policyContext,
        });

        return {
          commitId,
          timestamp,
          filesWritten: [],
          validationResult,
          auditEventId: '',
          snapshotId: '',
          status: 'failed',
          errors: [`Approval required (${approval.id}): ${policyCheck.reason}`],
        };
      }

      if (!policyCheck.allow) {
        return {
          commitId,
          timestamp,
          filesWritten: [],
          validationResult,
          auditEventId: '',
          snapshotId: '',
          status: 'failed',
          errors: [policyCheck.reason],
        };
      }

      const baseKey = `specs/${commitId}`;
      
      if (request.drafts.datasetContract) {
        const key = `${baseKey}/dataset_contract.json`;
        await spark.kv.set(key, request.drafts.datasetContract);
        filesWritten.push(key);
      }

      if (request.drafts.dqRules) {
        const key = `${baseKey}/dq_rules.json`;
        await spark.kv.set(key, request.drafts.dqRules);
        filesWritten.push(key);
      }

      if (request.drafts.policies) {
        const key = `${baseKey}/policies.json`;
        await spark.kv.set(key, request.drafts.policies);
        filesWritten.push(key);
      }

      if (request.drafts.slas) {
        const key = `${baseKey}/slas.json`;
        await spark.kv.set(key, request.drafts.slas);
        filesWritten.push(key);
      }

      const metadataKey = `${baseKey}/metadata.json`;
      await spark.kv.set(metadataKey, {
        commitId,
        timestamp,
        requestId: request.requestId,
        commitMessage: request.commitMessage,
        actor: request.actor,
        filesWritten
      });
      filesWritten.push(metadataKey);

      const snapshotId = `snapshot_${commitId}`;
      await spark.kv.set(`snapshots/${snapshotId}`, {
        snapshotId,
        timestamp,
        commitId,
        specs: request.drafts,
        actor: request.actor
      });

      const auditEvent: AuditEvent = {
        id: uuidv4(),
        timestamp,
        actor: request.actor,
        action: 'config.commit',
        entityType: 'config_specs',
        entityId: commitId,
        outcome: 'success',
        policyResults: [],
        evidenceRef: `evidence/config_copilot_runs/${commitId}`
      };

      const auditKey = `audit_events/${auditEvent.id}`;
      await spark.kv.set(auditKey, auditEvent);

      const evidence: ConfigEvidence = {
        id: commitId,
        timestamp,
        requestId: request.requestId,
        nlInput: '',
        generatedSpecs: request.drafts,
        validationResults: validationResult,
        commitResult: {
          commitId,
          timestamp,
          filesWritten,
          validationResult,
          auditEventId: auditEvent.id,
          snapshotId,
          status: 'success'
        },
        auditLogRefs: [auditEvent.id],
        actor: request.actor
      };

      await storeEvidenceBundle(EvidenceKeys.configCopilotRun(commitId), evidence);

      return {
        commitId,
        timestamp,
        filesWritten,
        validationResult,
        auditEventId: auditEvent.id,
        snapshotId,
        status: 'success'
      };

    } catch (error) {
      errors.push(`Commit failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        commitId,
        timestamp,
        filesWritten,
        validationResult,
        auditEventId: '',
        snapshotId: '',
        status: 'failed',
        errors
      };
    }
  }

  static async saveEvidence(evidence: ConfigEvidence): Promise<void> {
    await storeEvidenceBundle(EvidenceKeys.configCopilotRun(evidence.id), evidence);
  }

  static async getEvidence(evidenceId: string): Promise<ConfigEvidence | null> {
    const bundle = await getEvidenceBundle<ConfigEvidence>(EvidenceKeys.configCopilotRun(evidenceId));
    return bundle?.payload || null;
  }

  static async listEvidenceRuns(): Promise<string[]> {
    const allKeys = await spark.kv.keys();
    return allKeys.filter(key => key.startsWith('evidence/config_copilot_runs/'));
  }
}
