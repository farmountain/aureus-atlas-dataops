import { describe, it, expect, beforeEach } from 'vitest';
import { PipelineService } from '../pipeline-service';
import { AureusGuard } from '../aureus-guard';
import { PolicyEvaluator } from '../policy-evaluator';
import type { Dataset, UserRole } from '../types';
import type { GuardConfig } from '../aureus-types';

describe('PipelineService', () => {
  let pipelineService: PipelineService;
  let guard: AureusGuard;
  let mockDatasets: Dataset[];

  beforeEach(() => {
    const guardConfig: GuardConfig = {
      environment: 'dev',
      budgetLimits: {
        tokenBudget: 10000,
        queryCostBudget: 5000,
      },
      enableAudit: true,
      enableSnapshots: true,
    };

    const policyEvaluator = new PolicyEvaluator();
    guard = new AureusGuard(guardConfig, policyEvaluator);

    mockDatasets = [
      {
        id: 'ds-001',
        name: 'customer_transactions',
        domain: 'credit_risk',
        owner: 'risk-team',
        description: 'Customer transaction data',
        schema: [
          { name: 'transaction_id', type: 'string', nullable: false, pii: false },
          { name: 'customer_id', type: 'string', nullable: false, pii: true },
          { name: 'amount', type: 'decimal', nullable: false, pii: false },
          { name: 'transaction_date', type: 'date', nullable: false, pii: false },
          { name: 'status', type: 'string', nullable: false, pii: false },
        ],
        piiLevel: 'high',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date().toISOString(),
        tags: ['transactions', 'customer'],
      },
      {
        id: 'ds-002',
        name: 'merchant_data',
        domain: 'credit_risk',
        owner: 'risk-team',
        description: 'Merchant information',
        schema: [
          { name: 'merchant_id', type: 'string', nullable: false, pii: false },
          { name: 'merchant_name', type: 'string', nullable: false, pii: false },
          { name: 'category', type: 'string', nullable: false, pii: false },
        ],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 72,
        lastRefresh: new Date().toISOString(),
        tags: ['merchant'],
      },
    ];

    pipelineService = new PipelineService(guard, mockDatasets);
  });

  describe('generatePipeline', () => {
    it('should generate SQL model file with proper structure', async () => {
      const request = {
        name: 'customer_transaction_summary',
        description: 'Aggregate customer transactions by day',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'customer_daily_summary',
        transformRules: 'Group by customer and date, sum amounts',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.generatePipeline(request);

      expect(result.spec).toBeDefined();
      expect(result.spec.name).toBe('customer_transaction_summary');
      expect(result.spec.sourceDatasets).toEqual(['ds-001']);
      expect(result.sqlModel).toContain('-- Model: customer_transaction_summary');
      expect(result.sqlModel).toContain('WITH source_data AS');
      expect(result.sqlModel).toContain('customer_transactions');
    });

    it('should auto-generate schema/contract test', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.generatePipeline(request);

      expect(result.schemaTest).toContain('-- Schema/Contract Test');
      expect(result.schemaTest).toContain('information_schema.columns');
      expect(result.schemaTest).toContain('test_output');
      expect(result.schemaTest).toContain('Expected columns');
    });

    it('should auto-generate DQ tests based on schema', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.generatePipeline(request);

      expect(result.dqTests).toHaveLength(2);
      expect(result.dqTests[0]).toContain('-- DQ Test: Completeness Check');
      expect(result.dqTests[0]).toContain('null_percentage');
      expect(result.dqTests[1]).toContain('-- DQ Test: Uniqueness Check');
      expect(result.dqTests[1]).toContain('DISTINCT');
    });

    it('should auto-generate reconciliation/control totals test stub', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.generatePipeline(request);

      expect(result.reconciliationTest).toContain('-- Reconciliation/Control Totals Test');
      expect(result.reconciliationTest).toContain('source_totals');
      expect(result.reconciliationTest).toContain('target_totals');
      expect(result.reconciliationTest).toContain('reconciliation_test');
      expect(result.reconciliationTest).toContain('Threshold');
    });

    it('should include DQ checks in pipeline spec', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.generatePipeline(request);

      expect(result.spec.dqChecks.length).toBeGreaterThan(0);
      expect(result.spec.dqChecks[0]).toHaveProperty('name');
      expect(result.spec.dqChecks[0]).toHaveProperty('type');
      expect(result.spec.dqChecks[0]).toHaveProperty('rule');
      expect(result.spec.dqChecks[0]).toHaveProperty('threshold');
    });
  });

  describe('deployPipeline - Deployment Stages', () => {
    it('should allow deployment to dev without approval', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const generated = await pipelineService.generatePipeline(request);

      const deployRequest = {
        pipelineId: 'pipeline-001',
        stage: 'dev' as const,
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.deployPipeline(deployRequest, generated);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeDefined();
      expect(result.snapshotId).toBeDefined();
    });

    it('should allow deployment to uat for analyst', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const generated = await pipelineService.generatePipeline(request);

      const deployRequest = {
        pipelineId: 'pipeline-001',
        stage: 'uat' as const,
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.deployPipeline(deployRequest, generated);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeDefined();
    });

    it('should require approval for prod deployment', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const generated = await pipelineService.generatePipeline(request);

      const deployRequest = {
        pipelineId: 'pipeline-001',
        stage: 'prod' as const,
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.deployPipeline(deployRequest, generated);

      expect(result.requiresApproval).toBe(true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('production');
    });

    it('should allow prod deployment with approver role', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'approver@bank.com',
        role: 'approver' as UserRole,
      };

      const generated = await pipelineService.generatePipeline(request);

      const deployRequest = {
        pipelineId: 'pipeline-001',
        stage: 'prod' as const,
        actor: 'approver@bank.com',
        role: 'approver' as UserRole,
        approvalId: 'approval-001',
      };

      const result = await pipelineService.deployPipeline(deployRequest, generated);

      expect(result.success).toBe(true);
      expect(result.deploymentId).toBeDefined();
      expect(result.snapshotId).toBeDefined();
    });
  });

  describe('AUREUS Guard Integration', () => {
    it('should create snapshot on every deploy', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const generated = await pipelineService.generatePipeline(request);

      const deployRequest = {
        pipelineId: 'pipeline-001',
        stage: 'dev' as const,
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.deployPipeline(deployRequest, generated);

      expect(result.snapshotId).toBeDefined();
      expect(result.rollbackPlan).toBeDefined();
      expect(result.rollbackPlan?.snapshotId).toBe(result.snapshotId);
    });

    it('should include rollback plan in deployment result', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const generated = await pipelineService.generatePipeline(request);

      const deployRequest = {
        pipelineId: 'pipeline-001',
        stage: 'dev' as const,
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.deployPipeline(deployRequest, generated);

      expect(result.rollbackPlan).toBeDefined();
      expect(result.rollbackPlan?.steps).toBeDefined();
      expect(result.rollbackPlan?.steps.length).toBeGreaterThan(0);
      expect(result.rollbackPlan?.steps).toContain('Retrieve snapshot state from AUREUS guard');
      expect(result.rollbackPlan?.timestamp).toBeDefined();
    });

    it('should create evidence pack with generated files and guard decisions', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const generated = await pipelineService.generatePipeline(request);

      const deployRequest = {
        pipelineId: 'pipeline-001',
        stage: 'dev' as const,
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await pipelineService.deployPipeline(deployRequest, generated);

      expect(result.evidencePackId).toBeDefined();
      expect(result.evidencePackId).toContain('pipeline_');
    });

    it('should enforce budget limits through guard', async () => {
      const limitedGuardConfig: GuardConfig = {
        environment: 'dev',
        budgetLimits: {
          tokenBudget: 50,
          queryCostBudget: 25,
        },
        enableAudit: true,
        enableSnapshots: true,
      };

      const limitedGuard = new AureusGuard(limitedGuardConfig, new PolicyEvaluator());
      const limitedService = new PipelineService(limitedGuard, mockDatasets);

      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const generated = await limitedService.generatePipeline(request);

      const deployRequest = {
        pipelineId: 'pipeline-001',
        stage: 'dev' as const,
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const result = await limitedService.deployPipeline(deployRequest, generated);

      expect(result.success).toBe(false);
      expect(result.error).toContain('budget');
    });
  });

  describe('Evidence Pack Generation', () => {
    it('should include all generated files in evidence pack', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const generated = await pipelineService.generatePipeline(request);

      expect(generated.sqlModel).toBeDefined();
      expect(generated.schemaTest).toBeDefined();
      expect(generated.dqTests).toBeDefined();
      expect(generated.reconciliationTest).toBeDefined();
    });

    it('should include tests list in evidence pack', async () => {
      const request = {
        name: 'test_pipeline',
        description: 'Test pipeline',
        sourceDatasetIds: ['ds-001'],
        targetDatasetName: 'test_output',
        transformRules: 'pass through',
        domain: 'credit_risk',
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      };

      const generated = await pipelineService.generatePipeline(request);

      expect(generated.spec.tests).toBeDefined();
      expect(generated.spec.tests.length).toBeGreaterThan(0);
      expect(generated.spec.dqChecks).toBeDefined();
      expect(generated.spec.dqChecks.length).toBeGreaterThan(0);
    });
  });
});
