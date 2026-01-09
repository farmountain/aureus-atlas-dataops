import { AureusGuard } from './aureus-guard';
import type { ActionContext } from './aureus-types';
import type { PipelineSpec, Dataset, TestSpec, DQCheck, EvidencePack, UserRole } from './types';
import { pipelineRateLimiter } from './rate-limiter';

export type DeploymentStage = 'dev' | 'uat' | 'prod';

export interface PipelineGenerationRequest {
  name: string;
  description: string;
  sourceDatasetIds: string[];
  targetDatasetName: string;
  transformRules: string;
  domain: string;
  actor: string;
  role: UserRole;
}

export interface GeneratedPipeline {
  spec: PipelineSpec;
  sqlModel: string;
  schemaTest: string;
  dqTests: string[];
  reconciliationTest: string;
}

export interface DeploymentRequest {
  pipelineId: string;
  stage: DeploymentStage;
  actor: string;
  role: UserRole;
  approvalId?: string;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  snapshotId?: string;
  rollbackPlan?: RollbackPlan;
  evidencePackId?: string;
  error?: string;
  requiresApproval?: boolean;
}

export interface RollbackPlan {
  snapshotId: string;
  stage: DeploymentStage;
  timestamp: string;
  steps: string[];
}

export class PipelineService {
  private guard: AureusGuard;
  private datasets: Dataset[];
  private evidencePath = '/evidence/pipeline_runs';

  constructor(guard: AureusGuard, datasets: Dataset[]) {
    this.guard = guard;
    this.datasets = datasets;
  }

  async generatePipeline(request: PipelineGenerationRequest): Promise<GeneratedPipeline> {
    const rateLimitResult = await pipelineRateLimiter.checkLimit(request.actor);
    
    if (!rateLimitResult.allowed) {
      throw new Error(rateLimitResult.reason || 'Rate limit exceeded for pipeline generation');
    }

    console.log('[PipelineService] Generating pipeline:', request.name);

    const sourceDatasets = request.sourceDatasetIds
      .map(id => this.datasets.find(d => d.id === id))
      .filter((d): d is Dataset => d !== undefined);

    if (sourceDatasets.length === 0) {
      throw new Error('No valid source datasets found');
    }

    const sqlModel = this.generateSQLModel(request, sourceDatasets);
    const schemaTest = this.generateSchemaTest(request, sourceDatasets);
    const dqTests = this.generateDQTests(request, sourceDatasets);
    const reconciliationTest = this.generateReconciliationTest(request, sourceDatasets);

    const spec: PipelineSpec = {
      name: request.name,
      description: request.description,
      domain: request.domain as any,
      sourceDatasets: request.sourceDatasetIds,
      targetDataset: request.targetDatasetName,
      sql: sqlModel,
      tests: [
        {
          name: 'schema_contract_test',
          type: 'unit',
          sampleInput: [],
          expectedOutput: [],
        },
      ],
      dqChecks: this.inferDQChecks(sourceDatasets),
    };

    console.log('[PipelineService] Pipeline generated successfully');

    return {
      spec,
      sqlModel,
      schemaTest,
      dqTests,
      reconciliationTest,
    };
  }

  private generateSQLModel(request: PipelineGenerationRequest, sources: Dataset[]): string {
    const sourceRefs = sources.map(s => s.name).join(', ');
    
    return `-- Model: ${request.name}
-- Description: ${request.description}
-- Generated: ${new Date().toISOString()}

WITH source_data AS (
  SELECT *
  FROM ${sources[0].name}
  ${sources.length > 1 ? `-- Additional sources: ${sourceRefs}` : ''}
),

transformed AS (
  SELECT
    ${sources[0].schema.slice(0, 5).map(col => `    ${col.name}`).join(',\n')}${sources[0].schema.length > 5 ? ',\n    -- ... additional columns' : ''}
  FROM source_data
  -- Transform rules: ${request.transformRules}
)

SELECT * FROM transformed;
`;
  }

  private generateSchemaTest(request: PipelineGenerationRequest, sources: Dataset[]): string {
    const expectedColumns = sources[0].schema.slice(0, 5).map(col => col.name);
    
    return `-- Schema/Contract Test for ${request.name}
-- Validates output schema matches expected contract

SELECT 
  CASE 
    WHEN COUNT(*) = ${expectedColumns.length} THEN 'PASS'
    ELSE 'FAIL'
  END as schema_test_result
FROM information_schema.columns
WHERE table_name = '${request.targetDatasetName}'
  AND column_name IN (${expectedColumns.map(c => `'${c}'`).join(', ')});

-- Expected columns: ${expectedColumns.join(', ')}
`;
  }

  private generateDQTests(request: PipelineGenerationRequest, sources: Dataset[]): string[] {
    const tests: string[] = [];

    tests.push(`-- DQ Test: Completeness Check for ${request.name}
SELECT 
  '${request.targetDatasetName}' as target,
  COUNT(*) as total_rows,
  ${sources[0].schema[0].name ? `SUM(CASE WHEN ${sources[0].schema[0].name} IS NULL THEN 1 ELSE 0 END) as null_count,` : '0 as null_count,'}
  ${sources[0].schema[0].name ? `(SUM(CASE WHEN ${sources[0].schema[0].name} IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as null_percentage` : '0 as null_percentage'}
FROM ${request.targetDatasetName}
HAVING null_percentage > 5.0; -- Threshold: 5%
`);

    tests.push(`-- DQ Test: Uniqueness Check for ${request.name}
SELECT 
  '${request.targetDatasetName}' as target,
  COUNT(*) as total_rows,
  COUNT(DISTINCT ${sources[0].schema[0].name || 'id'}) as distinct_rows,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT ${sources[0].schema[0].name || 'id'}) THEN 'PASS'
    ELSE 'FAIL'
  END as uniqueness_test
FROM ${request.targetDatasetName};
`);

    return tests;
  }

  private generateReconciliationTest(request: PipelineGenerationRequest, sources: Dataset[]): string {
    return `-- Reconciliation/Control Totals Test for ${request.name}
-- Validates row counts and control totals between source and target

WITH source_totals AS (
  SELECT 
    COUNT(*) as source_count
  FROM ${sources[0].name}
),
target_totals AS (
  SELECT 
    COUNT(*) as target_count
  FROM ${request.targetDatasetName}
)
SELECT 
  s.source_count,
  t.target_count,
  t.target_count - s.source_count as difference,
  CASE 
    WHEN ABS(t.target_count - s.source_count) <= s.source_count * 0.01 THEN 'PASS'
    ELSE 'FAIL'
  END as reconciliation_test
FROM source_totals s
CROSS JOIN target_totals t;

-- Threshold: 1% variance allowed
`;
  }

  private inferDQChecks(sources: Dataset[]): DQCheck[] {
    const checks: DQCheck[] = [];

    const primaryCol = sources[0].schema[0];
    if (primaryCol) {
      checks.push({
        name: `${primaryCol.name}_completeness`,
        type: 'completeness',
        rule: `${primaryCol.name} IS NOT NULL`,
        threshold: 0.95,
      });

      if (!primaryCol.nullable) {
        checks.push({
          name: `${primaryCol.name}_uniqueness`,
          type: 'uniqueness',
          rule: `COUNT(DISTINCT ${primaryCol.name}) = COUNT(*)`,
          threshold: 1.0,
        });
      }
    }

    return checks;
  }

  async deployPipeline(request: DeploymentRequest, generated: GeneratedPipeline): Promise<DeploymentResult> {
    const rateLimitResult = await pipelineRateLimiter.checkLimit(request.actor);
    
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: rateLimitResult.reason || 'Rate limit exceeded for pipeline deployment',
      };
    }

    console.log('[PipelineService] Deploying pipeline to', request.stage);

    const context: ActionContext = {
      actionType: 'pipeline_deploy',
      actor: request.actor,
      role: request.role,
      environment: request.stage,
      metadata: {
        pipelineId: request.pipelineId,
        targetEnvironment: request.stage,
        approvalId: request.approvalId,
        tokenCostEstimate: 100,
        queryCostEstimate: 50,
      },
    };

    const policyCheck = await this.guard.checkPolicy(context);

    if (!policyCheck.allow && policyCheck.requiresApproval) {
      console.log('[PipelineService] Deployment requires approval');
      return {
        success: false,
        requiresApproval: true,
        error: policyCheck.reason,
      };
    }

    if (!policyCheck.allow) {
      console.log('[PipelineService] Deployment blocked:', policyCheck.reason);
      return {
        success: false,
        error: policyCheck.reason,
      };
    }

    const executionResult = await this.guard.execute({
      context,
      payload: {
        pipelineSpec: generated.spec,
        sqlModel: generated.sqlModel,
        tests: {
          schema: generated.schemaTest,
          dq: generated.dqTests,
          reconciliation: generated.reconciliationTest,
        },
      },
    });

    if (!executionResult.success) {
      return {
        success: false,
        error: executionResult.error,
      };
    }

    const deploymentId = this.generateId();
    const rollbackPlan = this.createRollbackPlan(request.stage, executionResult.snapshotId!);

    const evidencePackId = await this.createEvidencePack(
      deploymentId,
      request,
      generated,
      executionResult,
      rollbackPlan
    );

    console.log('[PipelineService] Deployment successful:', deploymentId);

    return {
      success: true,
      deploymentId,
      snapshotId: executionResult.snapshotId,
      rollbackPlan,
      evidencePackId,
    };
  }

  private createRollbackPlan(stage: DeploymentStage, snapshotId: string): RollbackPlan {
    return {
      snapshotId,
      stage,
      timestamp: new Date().toISOString(),
      steps: [
        'Retrieve snapshot state from AUREUS guard',
        'Restore pipeline specification to previous version',
        'Restore SQL model files to previous version',
        'Re-run validation tests on restored state',
        'Update metadata service with restored pipeline state',
        'Emit rollback audit event',
      ],
    };
  }

  private async createEvidencePack(
    deploymentId: string,
    request: DeploymentRequest,
    generated: GeneratedPipeline,
    executionResult: any,
    rollbackPlan: RollbackPlan
  ): Promise<string> {
    const evidencePackId = `pipeline_${deploymentId}_${Date.now()}`;
    
    const evidencePack = {
      id: evidencePackId,
      timestamp: new Date().toISOString(),
      deployment: {
        id: deploymentId,
        stage: request.stage,
        pipelineId: request.pipelineId,
        actor: request.actor,
        role: request.role,
        approvalId: request.approvalId,
      },
      generatedFiles: {
        sqlModel: generated.sqlModel,
        schemaTest: generated.schemaTest,
        dqTests: generated.dqTests,
        reconciliationTest: generated.reconciliationTest,
      },
      testsList: [
        'schema_contract_test',
        ...generated.spec.dqChecks.map(c => c.name),
        'reconciliation_test',
      ],
      guardDecisions: {
        auditEventId: executionResult.auditEventId,
        snapshotId: executionResult.snapshotId,
        policyChecksPassed: true,
      },
      rollbackPlan,
      pipelineSpec: generated.spec,
    };

    console.log('[PipelineService] Evidence pack created:', evidencePackId);
    console.log('[PipelineService] Evidence would be written to:', `${this.evidencePath}/${evidencePackId}/`);

    if (typeof window !== 'undefined' && window.spark?.kv) {
      await window.spark.kv.set(`evidence:${evidencePackId}`, evidencePack);
    }

    return evidencePackId;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
