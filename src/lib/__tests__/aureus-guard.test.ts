import { describe, it, expect, beforeEach } from 'vitest';
import { AureusGuard } from '../aureus-guard';
import { PolicyEvaluator } from '../policy-evaluator';
import type { ActionContext, GuardConfig } from '../aureus-types';

describe('AureusGuard', () => {
  let guard: AureusGuard;
  let config: GuardConfig;

  beforeEach(() => {
    config = {
      environment: 'dev',
      budgetLimits: {
        tokenBudget: 10000,
        queryCostBudget: 100,
      },
      enableAudit: true,
      enableSnapshots: true,
    };
    guard = new AureusGuard(config);
  });

  describe('Goal-Guard FSM', () => {
    it('should initialize in idle state', () => {
      expect(guard.getState()).toBe('idle');
    });

    it('should transition through states during policy check', async () => {
      const context: ActionContext = {
        actionType: 'query_execute',
        actor: 'test-user',
        role: 'analyst',
        environment: 'dev',
        metadata: {},
      };

      expect(guard.getState()).toBe('idle');
      
      const result = await guard.checkPolicy(context);
      
      expect(result.allow).toBe(true);
      expect(['planning', 'completed'].includes(guard.getState())).toBe(true);
    });
  });

  describe('Role-based action authorization', () => {
    it('should block viewer from production writes', async () => {
      const context: ActionContext = {
        actionType: 'dataset_create',
        actor: 'viewer-user',
        role: 'viewer',
        environment: 'prod',
        metadata: {},
      };

      const result = await guard.checkPolicy(context);
      
      expect(result.allow).toBe(false);
      expect(guard.getState()).toBe('blocked');
    });

    it('should allow admin to write to production', async () => {
      const context: ActionContext = {
        actionType: 'dataset_create',
        actor: 'admin-user',
        role: 'admin',
        environment: 'prod',
        metadata: {},
      };

      const result = await guard.checkPolicy(context);
      
      expect(result.allow).toBe(true);
    });

    it('should allow analyst to query in dev', async () => {
      const context: ActionContext = {
        actionType: 'query_execute',
        actor: 'analyst-user',
        role: 'analyst',
        environment: 'dev',
        metadata: {},
      };

      const result = await guard.checkPolicy(context);
      
      expect(result.allow).toBe(true);
    });

    it('should require approval for high PII access by analyst', async () => {
      const context: ActionContext = {
        actionType: 'query_execute',
        actor: 'analyst-user',
        role: 'analyst',
        environment: 'dev',
        metadata: {
          piiLevel: 'high',
        },
      };

      const result = await guard.checkPolicy(context);
      
      expect(result.allow).toBe(false);
      expect(result.requiresApproval).toBe(true);
      expect(result.reason).toContain('High PII');
    });

    it('should block multi-jurisdiction access for viewers', async () => {
      const context: ActionContext = {
        actionType: 'query_execute',
        actor: 'viewer-user',
        role: 'viewer',
        environment: 'dev',
        metadata: {
          jurisdiction: 'multi',
        },
      };

      const result = await guard.checkPolicy(context);
      
      expect(result.allow).toBe(false);
      expect(result.requiresApproval).toBe(false);
      expect(result.reason).toContain('multi-jurisdiction');
    });
  });

  describe('Audit logging', () => {
    it('should emit audit event on successful execution', async () => {
      const context: ActionContext = {
        actionType: 'query_execute',
        actor: 'test-user',
        role: 'analyst',
        environment: 'dev',
        metadata: {},
      };

      const result = await guard.execute({
        context,
        payload: { query: 'SELECT * FROM test' },
      });

      expect(result.success).toBe(true);
      expect(result.auditEventId).toBeDefined();

      const auditLog = guard.getAuditLog();
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].id).toBe(result.auditEventId);
      expect(auditLog[0].actor).toBe('test-user');
      expect(auditLog[0].action).toBe('query_execute');
    });

    it('should emit audit event when action is blocked', async () => {
      const context: ActionContext = {
        actionType: 'dataset_delete',
        actor: 'analyst-user',
        role: 'analyst',
        environment: 'prod',
        metadata: {},
      };

      const result = await guard.execute({
        context,
        payload: { datasetId: 'test-123' },
      });

      expect(result.success).toBe(false);

      const auditLog = guard.getAuditLog();
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].id).toBe(result.auditEventId);
    });
  });

  describe('Snapshot creation', () => {
    it('should create snapshot on successful execution', async () => {
      const context: ActionContext = {
        actionType: 'dataset_create',
        actor: 'admin-user',
        role: 'admin',
        environment: 'dev',
        metadata: {},
      };

      const payload = {
        name: 'test-dataset',
        domain: 'credit_risk',
      };

      const result = await guard.execute({
        context,
        payload,
      });

      expect(result.success).toBe(true);
      expect(result.snapshotId).toBeDefined();

      const snapshots = guard.getSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe(result.snapshotId);
      expect(snapshots[0].actor).toBe('admin-user');
      expect(snapshots[0].state.specs).toEqual(payload);
    });

    it('should not create snapshot when action is blocked', async () => {
      const context: ActionContext = {
        actionType: 'dataset_create',
        actor: 'viewer-user',
        role: 'viewer',
        environment: 'prod',
        metadata: {},
      };

      const result = await guard.execute({
        context,
        payload: { name: 'test' },
      });

      expect(result.success).toBe(false);
      expect(result.snapshotId).toBeUndefined();

      const snapshots = guard.getSnapshots();
      expect(snapshots.length).toBe(0);
    });
  });

  describe('Rollback', () => {
    it('should rollback to a previous snapshot', async () => {
      const context: ActionContext = {
        actionType: 'dataset_create',
        actor: 'admin-user',
        role: 'admin',
        environment: 'dev',
        metadata: {},
      };

      const payload = { name: 'original-dataset' };

      const execResult = await guard.execute({
        context,
        payload,
      });

      expect(execResult.success).toBe(true);
      expect(execResult.snapshotId).toBeDefined();

      const rollbackResult = await guard.rollback(execResult.snapshotId!);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.snapshotId).toBe(execResult.snapshotId);
      expect(rollbackResult.restoredState.specs).toEqual(payload);
      expect(guard.getState()).toBe('idle');
    });

    it('should fail to rollback to non-existent snapshot', async () => {
      const rollbackResult = await guard.rollback('non-existent-id');

      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.message).toContain('not found');
    });
  });

  describe('Budget enforcement', () => {
    it('should track token budget usage', async () => {
      const context: ActionContext = {
        actionType: 'query_execute',
        actor: 'analyst-user',
        role: 'analyst',
        environment: 'dev',
        metadata: {
          tokenCostEstimate: 1000,
          queryCostEstimate: 10,
        },
      };

      const result = await guard.execute({
        context,
        payload: { query: 'SELECT * FROM test' },
      });

      expect(result.success).toBe(true);

      const usage = guard.getBudgetUsage();
      expect(usage.tokensUsed).toBe(1000);
      expect(usage.queryCostUsed).toBe(10);
    });

    it('should block when token budget exceeded', async () => {
      const context: ActionContext = {
        actionType: 'query_execute',
        actor: 'analyst-user',
        role: 'analyst',
        environment: 'dev',
        metadata: {
          tokenCostEstimate: 15000,
          queryCostEstimate: 10,
        },
      };

      const result = await guard.execute({
        context,
        payload: { query: 'SELECT * FROM huge_table' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token budget exceeded');
    });

    it('should block when query cost budget exceeded', async () => {
      const context: ActionContext = {
        actionType: 'query_execute',
        actor: 'analyst-user',
        role: 'analyst',
        environment: 'dev',
        metadata: {
          tokenCostEstimate: 1000,
          queryCostEstimate: 150,
        },
      };

      const result = await guard.execute({
        context,
        payload: { query: 'SELECT * FROM expensive_table' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Query cost budget exceeded');
    });

    it('should log budget decision', async () => {
      const context: ActionContext = {
        actionType: 'query_execute',
        actor: 'analyst-user',
        role: 'analyst',
        environment: 'dev',
        metadata: {
          tokenCostEstimate: 5000,
          queryCostEstimate: 50,
        },
      };

      const budgetCheck = guard.checkBudget(5000, 50);
      
      expect(budgetCheck.withinBudget).toBe(true);
    });
  });

  describe('Evidence generation', () => {
    it('should export evidence with audit log and snapshots', async () => {
      const context: ActionContext = {
        actionType: 'dataset_create',
        actor: 'admin-user',
        role: 'admin',
        environment: 'dev',
        metadata: {},
      };

      await guard.execute({
        context,
        payload: { name: 'test-dataset' },
      });

      const evidence = guard.exportEvidence('/evidence/guard_smoke_run');

      expect(evidence.length).toBe(4);
      expect(evidence[0].path).toContain('audit_log');
      expect(evidence[1].path).toContain('snapshots');
      expect(evidence[2].path).toContain('budget_usage');
      expect(evidence[3].path).toContain('guard_summary');
    });
  });
});

describe('PolicyEvaluator', () => {
  let evaluator: PolicyEvaluator;

  beforeEach(() => {
    evaluator = new PolicyEvaluator();
  });

  it('should evaluate all policies', () => {
    const context: ActionContext = {
      actionType: 'query_execute',
      actor: 'test-user',
      role: 'analyst',
      environment: 'dev',
      metadata: {},
    };

    const result = evaluator.evaluateAll(context);

    expect(result.allow).toBe(true);
    expect(result.decisions.length).toBeGreaterThan(0);
  });

  it('should return multiple policy decisions', () => {
    const context: ActionContext = {
      actionType: 'dataset_create',
      actor: 'analyst-user',
      role: 'analyst',
      environment: 'prod',
      metadata: {
        piiLevel: 'high',
        jurisdiction: 'multi',
      },
    };

    const result = evaluator.evaluateAll(context);

    expect(result.decisions.length).toBeGreaterThan(1);
  });
});
