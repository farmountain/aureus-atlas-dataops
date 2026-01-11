import { describe, it, expect, beforeEach, vi } from 'vitest';
import { observabilityService, type MetricRecord, type BudgetConfig } from '../observability';

const mockKVStore: Map<string, unknown> = new Map();

global.window = {
  spark: {
    kv: {
      get: vi.fn(async (key: string) => mockKVStore.get(key)),
      set: vi.fn(async (key: string, value: unknown) => {
        mockKVStore.set(key, value);
      }),
      delete: vi.fn(async (key: string) => {
        mockKVStore.delete(key);
      }),
      keys: vi.fn(async () => Array.from(mockKVStore.keys())),
    },
  },
} as never;

describe('ObservabilityService', () => {
  beforeEach(() => {
    mockKVStore.clear();
    vi.clearAllMocks();
  });

  describe('estimateTokens', () => {
    it('should estimate tokens based on character count', () => {
      expect(observabilityService.estimateTokens('hello')).toBe(2);
      expect(observabilityService.estimateTokens('a'.repeat(100))).toBe(25);
      expect(observabilityService.estimateTokens('')).toBe(0);
    });
  });

  describe('estimateCost', () => {
    it('should calculate cost based on token count', () => {
      expect(observabilityService.estimateCost(1000)).toBe(0.01);
      expect(observabilityService.estimateCost(100000)).toBe(1);
      expect(observabilityService.estimateCost(0)).toBe(0);
    });
  });

  describe('recordMetric', () => {
    it('should record a metric with all required fields', async () => {
      const metric = await observabilityService.recordMetric(
        'query',
        150,
        'success',
        'What is the total balance?',
        'Result data here',
        undefined,
        { userId: 'test-user' }
      );

      expect(metric).toMatchObject({
        operation: 'query',
        latencyMs: 150,
        status: 'success',
        metadata: { userId: 'test-user' },
      });
      expect(metric.id).toMatch(/^metric_/);
      expect(metric.timestamp).toBeGreaterThan(0);
      expect(metric.tokenUsageEstimated).toBeGreaterThan(0);
      expect(metric.queryCostEstimate).toBeGreaterThan(0);
    });

    it('should record error metric with error message', async () => {
      const metric = await observabilityService.recordMetric(
        'pipeline',
        100,
        'error',
        'Create pipeline spec',
        undefined,
        'Database connection failed'
      );

      expect(metric.status).toBe('error');
      expect(metric.errorMessage).toBe('Database connection failed');
    });

    it('should persist metrics to KV store', async () => {
      await observabilityService.recordMetric('query', 50, 'success', 'test', 'output');
      await observabilityService.recordMetric('config_copilot', 100, 'success', 'test2', 'output2');

      const metrics = await observabilityService.getMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0].operation).toBe('config_copilot');
      expect(metrics[1].operation).toBe('query');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics sorted by timestamp descending', async () => {
      await observabilityService.recordMetric('query', 50, 'success', 'first', 'output1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await observabilityService.recordMetric('pipeline', 100, 'success', 'second', 'output2');

      const metrics = await observabilityService.getMetrics();
      expect(metrics[0].operation).toBe('pipeline');
      expect(metrics[1].operation).toBe('query');
    });

    it('should limit results when limit is provided', async () => {
      for (let i = 0; i < 10; i++) {
        await observabilityService.recordMetric('query', 50, 'success', `test${i}`, 'output');
      }

      const metrics = await observabilityService.getMetrics(5);
      expect(metrics).toHaveLength(5);
    });
  });

  describe('getMetricsSummary', () => {
    beforeEach(async () => {
      await observabilityService.recordMetric('query', 100, 'success', 'a'.repeat(400), 'b'.repeat(400));
      await observabilityService.recordMetric('query', 200, 'success', 'c'.repeat(800), 'd'.repeat(800));
      await observabilityService.recordMetric('pipeline', 150, 'error', 'e'.repeat(400), undefined, 'Error');
      await observabilityService.recordMetric('config_copilot', 50, 'blocked', 'f'.repeat(400), undefined, 'Budget exceeded');
    });

    it('should calculate total tokens used', async () => {
      const summary = await observabilityService.getMetricsSummary();
      expect(summary.totalTokensUsed).toBeGreaterThan(0);
    });

    it('should calculate total cost estimate', async () => {
      const summary = await observabilityService.getMetricsSummary();
      expect(summary.totalCostEstimate).toBeGreaterThan(0);
    });

    it('should calculate success rate correctly', async () => {
      const summary = await observabilityService.getMetricsSummary();
      expect(summary.successRate).toBe(0.5);
      expect(summary.totalRequests).toBe(4);
    });

    it('should calculate average latency', async () => {
      const summary = await observabilityService.getMetricsSummary();
      expect(summary.avgLatencyMs).toBe(125);
    });

    it('should count errors and blocked requests', async () => {
      const summary = await observabilityService.getMetricsSummary();
      expect(summary.errorCount).toBe(1);
      expect(summary.blockedCount).toBe(1);
    });

    it('should calculate budget utilization', async () => {
      await observabilityService.setBudget({ tokenBudget: 1000, costBudget: 0.1 });
      const summary = await observabilityService.getMetricsSummary();
      
      expect(summary.budgetUtilization.tokenPercent).toBeGreaterThan(0);
      expect(summary.budgetUtilization.costPercent).toBeGreaterThan(0);
    });
  });

  describe('checkBudget', () => {
    it('should allow when under budget', async () => {
      await observabilityService.setBudget({ tokenBudget: 1000000, costBudget: 100 });
      await observabilityService.recordMetric('query', 50, 'success', 'test', 'output');

      const check = await observabilityService.checkBudget();
      expect(check.allowed).toBe(true);
      expect(check.reason).toBeUndefined();
    });

    it('should block when token budget exceeded', async () => {
      await observabilityService.setBudget({ tokenBudget: 100, costBudget: 100 });
      await observabilityService.recordMetric('query', 50, 'success', 'a'.repeat(1000), 'b'.repeat(1000));

      const check = await observabilityService.checkBudget();
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Token budget exceeded');
    });

    it('should block when cost budget exceeded', async () => {
      await observabilityService.setBudget({ tokenBudget: 1000000, costBudget: 0.001 });
      await observabilityService.recordMetric('query', 50, 'success', 'a'.repeat(1000), 'b'.repeat(1000));

      const check = await observabilityService.checkBudget();
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Cost budget exceeded');
    });

    it('should emit audit event when budget exceeded', async () => {
      await observabilityService.setBudget({ tokenBudget: 10, costBudget: 0.0001 });
      await observabilityService.recordMetric('query', 50, 'success', 'a'.repeat(1000), 'b'.repeat(1000));

      await observabilityService.checkBudget();

      const auditLogs = await observabilityService.getAuditLogs();
      const budgetExceededLogs = auditLogs.filter(log => log.event === 'budget_exceeded');
      expect(budgetExceededLogs.length).toBeGreaterThan(0);
    });
  });

  describe('setBudget', () => {
    it('should update budget configuration', async () => {
      await observabilityService.setBudget({ tokenBudget: 500000, costBudget: 50 });

      const budget = await observabilityService.getBudget();
      expect(budget.tokenBudget).toBe(500000);
      expect(budget.costBudget).toBe(50);
    });

    it('should emit audit event on budget change', async () => {
      await observabilityService.setBudget({ tokenBudget: 200000 });

      const auditLogs = await observabilityService.getAuditLogs();
      const budgetUpdateLogs = auditLogs.filter(log => log.event === 'budget_updated');
      expect(budgetUpdateLogs).toHaveLength(1);
    });

    it('should merge with existing budget', async () => {
      await observabilityService.setBudget({ tokenBudget: 100000, costBudget: 10, periodMs: 3600000 });
      await observabilityService.setBudget({ tokenBudget: 200000 });

      const budget = await observabilityService.getBudget();
      expect(budget.tokenBudget).toBe(200000);
      expect(budget.costBudget).toBe(10);
      expect(budget.periodMs).toBe(3600000);
    });
  });

  describe('resetMetrics', () => {
    it('should clear all metrics', async () => {
      await observabilityService.recordMetric('query', 50, 'success', 'test1', 'output1');
      await observabilityService.recordMetric('query', 50, 'success', 'test2', 'output2');

      await observabilityService.resetMetrics();

      const metrics = await observabilityService.getMetrics();
      expect(metrics).toHaveLength(0);
    });

    it('should emit audit event on reset', async () => {
      await observabilityService.resetMetrics();

      const auditLogs = await observabilityService.getAuditLogs();
      const resetLogs = auditLogs.filter(log => log.event === 'metrics_reset');
      expect(resetLogs).toHaveLength(1);
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs sorted by timestamp', async () => {
      await observabilityService.recordMetric('query', 50, 'success', 'test', 'output');
      await observabilityService.setBudget({ tokenBudget: 100000 });

      const logs = await observabilityService.getAuditLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should limit results when limit is provided', async () => {
      for (let i = 0; i < 10; i++) {
        await observabilityService.recordMetric('query', 50, 'success', `test${i}`, 'output');
      }

      const logs = await observabilityService.getAuditLogs(5);
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });
});
