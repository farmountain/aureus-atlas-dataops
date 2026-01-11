import { describe, it, expect, beforeEach, vi } from 'vitest';
import { enforceBeforeExecution, wrapWithBudgetEnforcement, BudgetExceededError } from '../budget-enforcer';
import { observabilityService } from '../observability';

vi.mock('../observability');

describe('BudgetEnforcer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enforceBeforeExecution', () => {
    it('should allow execution when budget is not exceeded', async () => {
      vi.mocked(observabilityService.checkBudget).mockResolvedValue({
        allowed: true,
      });

      await expect(enforceBeforeExecution()).resolves.not.toThrow();
    });

    it('should block execution when budget is exceeded', async () => {
      vi.mocked(observabilityService.checkBudget).mockResolvedValue({
        allowed: false,
        reason: 'Token budget exceeded: 1,100,000 / 1,000,000',
      });

      await expect(enforceBeforeExecution()).rejects.toThrow(BudgetExceededError);
      await expect(enforceBeforeExecution()).rejects.toThrow('Token budget exceeded');
    });
  });

  describe('wrapWithBudgetEnforcement', () => {
    it('should execute operation and record success metric when budget allows', async () => {
      vi.mocked(observabilityService.checkBudget).mockResolvedValue({
        allowed: true,
      });
      vi.mocked(observabilityService.recordMetric).mockResolvedValue({
        id: 'test-metric',
        timestamp: Date.now(),
        operation: 'query',
        tokenUsageEstimated: 100,
        queryCostEstimate: 0.001,
        latencyMs: 50,
        status: 'success',
      });

      const operation = vi.fn().mockResolvedValue('result');
      const result = await wrapWithBudgetEnforcement(operation, 'query', 'test input');

      expect(result).toBe('result');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(observabilityService.recordMetric).toHaveBeenCalledWith(
        'query',
        expect.any(Number),
        'success',
        'test input',
        '"result"',
        undefined,
        { operation: 'budget_enforced_execution' }
      );
    });

    it('should block operation and record blocked metric when budget exceeded', async () => {
      vi.mocked(observabilityService.checkBudget).mockResolvedValue({
        allowed: false,
        reason: 'Cost budget exceeded: $110.00 / $100.00',
      });
      vi.mocked(observabilityService.recordMetric).mockResolvedValue({
        id: 'test-metric',
        timestamp: Date.now(),
        operation: 'pipeline',
        tokenUsageEstimated: 50,
        queryCostEstimate: 0.0005,
        latencyMs: 10,
        status: 'blocked',
        errorMessage: 'Cost budget exceeded: $110.00 / $100.00',
      });

      const operation = vi.fn().mockResolvedValue('result');

      await expect(
        wrapWithBudgetEnforcement(operation, 'pipeline', 'create pipeline')
      ).rejects.toThrow(BudgetExceededError);

      expect(operation).not.toHaveBeenCalled();
      expect(observabilityService.recordMetric).toHaveBeenCalledWith(
        'pipeline',
        expect.any(Number),
        'blocked',
        'create pipeline',
        undefined,
        'Cost budget exceeded: $110.00 / $100.00',
        { operation: 'budget_enforced_execution' }
      );
    });

    it('should record error metric when operation fails', async () => {
      vi.mocked(observabilityService.checkBudget).mockResolvedValue({
        allowed: true,
      });
      vi.mocked(observabilityService.recordMetric).mockResolvedValue({
        id: 'test-metric',
        timestamp: Date.now(),
        operation: 'config_copilot',
        tokenUsageEstimated: 200,
        queryCostEstimate: 0.002,
        latencyMs: 100,
        status: 'error',
        errorMessage: 'Something went wrong',
      });

      const operation = vi.fn().mockRejectedValue(new Error('Something went wrong'));

      await expect(
        wrapWithBudgetEnforcement(operation, 'config_copilot', 'generate config')
      ).rejects.toThrow('Something went wrong');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(observabilityService.recordMetric).toHaveBeenCalledWith(
        'config_copilot',
        expect.any(Number),
        'error',
        'generate config',
        undefined,
        'Something went wrong',
        { operation: 'budget_enforced_execution' }
      );
    });

    it('should measure latency accurately', async () => {
      vi.mocked(observabilityService.checkBudget).mockResolvedValue({
        allowed: true,
      });

      let recordedLatency: number | undefined;
      vi.mocked(observabilityService.recordMetric).mockImplementation(async (op, latency) => {
        recordedLatency = latency;
        return {
          id: 'test-metric',
          timestamp: Date.now(),
          operation: op,
          tokenUsageEstimated: 50,
          queryCostEstimate: 0.0005,
          latencyMs: latency,
          status: 'success',
        };
      });

      const operation = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'done';
      });

      await wrapWithBudgetEnforcement(operation, 'query', 'test');

      expect(recordedLatency).toBeGreaterThanOrEqual(45);
      expect(recordedLatency).toBeLessThan(200);
    });
  });
});
