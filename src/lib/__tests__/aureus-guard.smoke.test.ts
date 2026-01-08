import { describe, it, expect } from 'vitest';
import { AureusGuard } from '../aureus-guard';
import type { ActionContext, GuardConfig } from '../aureus-types';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Guard Smoke Test - Evidence Generation', () => {
  it('should execute complete smoke test and generate evidence', async () => {
    const config: GuardConfig = {
      environment: 'dev',
      budgetLimits: {
        tokenBudget: 10000,
        queryCostBudget: 100,
      },
      enableAudit: true,
      enableSnapshots: true,
    };

    const guard = new AureusGuard(config);

    const testCases: Array<{ name: string; context: ActionContext; shouldSucceed: boolean }> = [
      {
        name: 'Analyst queries in dev',
        context: {
          actionType: 'query_execute',
          actor: 'analyst-1',
          role: 'analyst',
          environment: 'dev',
          metadata: { tokenCostEstimate: 500, queryCostEstimate: 5 },
        },
        shouldSucceed: true,
      },
      {
        name: 'Admin creates dataset in dev',
        context: {
          actionType: 'dataset_create',
          actor: 'admin-1',
          role: 'admin',
          environment: 'dev',
          metadata: { domain: 'credit_risk', tokenCostEstimate: 100, queryCostEstimate: 1 },
        },
        shouldSucceed: true,
      },
      {
        name: 'Analyst attempts prod write (blocked)',
        context: {
          actionType: 'dataset_delete',
          actor: 'analyst-2',
          role: 'analyst',
          environment: 'prod',
          metadata: { tokenCostEstimate: 50, queryCostEstimate: 1 },
        },
        shouldSucceed: false,
      },
      {
        name: 'Viewer accesses multi-jurisdiction data (blocked)',
        context: {
          actionType: 'query_execute',
          actor: 'viewer-1',
          role: 'viewer',
          environment: 'dev',
          metadata: { jurisdiction: 'multi', tokenCostEstimate: 200, queryCostEstimate: 2 },
        },
        shouldSucceed: false,
      },
      {
        name: 'Analyst accesses high PII (requires approval)',
        context: {
          actionType: 'query_execute',
          actor: 'analyst-3',
          role: 'analyst',
          environment: 'dev',
          metadata: { piiLevel: 'high', tokenCostEstimate: 300, queryCostEstimate: 3 },
        },
        shouldSucceed: false,
      },
    ];

    for (const testCase of testCases) {
      const result = await guard.execute({
        context: testCase.context,
        payload: { testCase: testCase.name },
      });

      console.log(`[Smoke Test] ${testCase.name}: ${result.success ? 'SUCCESS' : 'BLOCKED/APPROVAL'}`);
      
      if (testCase.shouldSucceed) {
        expect(result.success).toBe(true);
        expect(result.snapshotId).toBeDefined();
      } else {
        expect(result.success).toBe(false);
      }
      expect(result.auditEventId).toBeDefined();
    }

    const evidenceDir = 'evidence/guard_smoke_run';
    const evidence = guard.exportEvidence(evidenceDir);

    const auditLog = guard.getAuditLog();
    const snapshots = guard.getSnapshots();

    expect(auditLog.length).toBe(testCases.length);
    expect(snapshots.length).toBe(testCases.filter(tc => tc.shouldSucceed).length);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
      mkdirSync(join(process.cwd(), evidenceDir), { recursive: true });
      
      evidence.forEach(e => {
        const filePath = join(process.cwd(), e.path);
        writeFileSync(filePath, JSON.stringify(e.data, null, 2));
        console.log(`[Evidence] Written: ${e.path}`);
      });
    } catch (error) {
      console.warn('[Evidence] Could not write files (may be in browser context):', error);
    }

    console.log('[Smoke Test] Summary:', {
      totalActions: testCases.length,
      successful: testCases.filter(tc => tc.shouldSucceed).length,
      blocked: testCases.filter(tc => !tc.shouldSucceed).length,
      auditEvents: auditLog.length,
      snapshots: snapshots.length,
      budgetUsage: guard.getBudgetUsage(),
    });
  });
});
