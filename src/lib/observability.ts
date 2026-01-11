import { useKV } from '@github/spark/hooks';

export interface MetricRecord {
  id: string;
  timestamp: number;
  operation: 'query' | 'config_copilot' | 'pipeline' | 'approval';
  tokenUsageEstimated: number;
  tokenUsageActual?: number;
  queryCostEstimate: number;
  latencyMs: number;
  status: 'success' | 'error' | 'blocked';
  errorMessage?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface BudgetConfig {
  tokenBudget: number;
  costBudget: number;
  periodMs: number;
}

export interface MetricsSummary {
  totalTokensUsed: number;
  totalCostEstimate: number;
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  errorCount: number;
  blockedCount: number;
  budgetUtilization: {
    tokenPercent: number;
    costPercent: number;
  };
}

const DEFAULT_BUDGET: BudgetConfig = {
  tokenBudget: 1000000,
  costBudget: 100,
  periodMs: 24 * 60 * 60 * 1000,
};

const TOKEN_COST_RATE = 0.00001;

class ObservabilityService {
  private metricsKey = 'observability_metrics';
  private budgetKey = 'observability_budget';
  private auditLogKey = 'observability_audit';

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  estimateCost(tokens: number): number {
    return tokens * TOKEN_COST_RATE;
  }

  async recordMetric(
    operation: MetricRecord['operation'],
    latencyMs: number,
    status: MetricRecord['status'],
    textInput: string,
    textOutput?: string,
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ): Promise<MetricRecord> {
    const estimatedTokens = this.estimateTokens(textInput) + (textOutput ? this.estimateTokens(textOutput) : 0);
    const actualTokens = textOutput ? this.estimateTokens(textOutput) : undefined;
    const costEstimate = this.estimateCost(estimatedTokens);

    const metric: MetricRecord = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      operation,
      tokenUsageEstimated: estimatedTokens,
      tokenUsageActual: actualTokens,
      queryCostEstimate: costEstimate,
      latencyMs,
      status,
      errorMessage,
      metadata,
    };

    const existingMetrics = await window.spark.kv.get<MetricRecord[]>(this.metricsKey) || [];
    await window.spark.kv.set(this.metricsKey, [...existingMetrics, metric]);

    await this.auditLog({
      event: 'metric_recorded',
      metric,
      timestamp: Date.now(),
    });

    return metric;
  }

  async getMetrics(limit?: number): Promise<MetricRecord[]> {
    const metrics = await window.spark.kv.get<MetricRecord[]>(this.metricsKey) || [];
    const sorted = metrics.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async getMetricsSummary(periodMs?: number): Promise<MetricsSummary> {
    const budget = await this.getBudget();
    const period = periodMs || budget.periodMs;
    const cutoff = Date.now() - period;
    
    const metrics = await this.getMetrics();
    const periodMetrics = metrics.filter(m => m.timestamp >= cutoff);

    const totalTokens = periodMetrics.reduce((sum, m) => sum + m.tokenUsageEstimated, 0);
    const totalCost = periodMetrics.reduce((sum, m) => sum + m.queryCostEstimate, 0);
    const totalRequests = periodMetrics.length;
    const successCount = periodMetrics.filter(m => m.status === 'success').length;
    const errorCount = periodMetrics.filter(m => m.status === 'error').length;
    const blockedCount = periodMetrics.filter(m => m.status === 'blocked').length;
    const avgLatency = totalRequests > 0
      ? periodMetrics.reduce((sum, m) => sum + m.latencyMs, 0) / totalRequests
      : 0;

    return {
      totalTokensUsed: totalTokens,
      totalCostEstimate: totalCost,
      totalRequests,
      successRate: totalRequests > 0 ? successCount / totalRequests : 0,
      avgLatencyMs: avgLatency,
      errorCount,
      blockedCount,
      budgetUtilization: {
        tokenPercent: (totalTokens / budget.tokenBudget) * 100,
        costPercent: (totalCost / budget.costBudget) * 100,
      },
    };
  }

  async getBudget(): Promise<BudgetConfig> {
    const budget = await window.spark.kv.get<BudgetConfig>(this.budgetKey);
    return budget || DEFAULT_BUDGET;
  }

  async setBudget(budget: Partial<BudgetConfig>): Promise<void> {
    const current = await this.getBudget();
    const updated = { ...current, ...budget };
    await window.spark.kv.set(this.budgetKey, updated);
    await this.auditLog({
      event: 'budget_updated',
      oldBudget: current,
      newBudget: updated,
      timestamp: Date.now(),
    });
  }

  async checkBudget(): Promise<{ allowed: boolean; reason?: string }> {
    const budget = await this.getBudget();
    const summary = await this.getMetricsSummary(budget.periodMs);

    if (summary.totalTokensUsed >= budget.tokenBudget) {
      await this.auditLog({
        event: 'budget_exceeded',
        budgetType: 'tokens',
        used: summary.totalTokensUsed,
        limit: budget.tokenBudget,
        timestamp: Date.now(),
      });
      return {
        allowed: false,
        reason: `Token budget exceeded: ${summary.totalTokensUsed.toLocaleString()} / ${budget.tokenBudget.toLocaleString()}`,
      };
    }

    if (summary.totalCostEstimate >= budget.costBudget) {
      await this.auditLog({
        event: 'budget_exceeded',
        budgetType: 'cost',
        used: summary.totalCostEstimate,
        limit: budget.costBudget,
        timestamp: Date.now(),
      });
      return {
        allowed: false,
        reason: `Cost budget exceeded: $${summary.totalCostEstimate.toFixed(2)} / $${budget.costBudget.toFixed(2)}`,
      };
    }

    return { allowed: true };
  }

  async resetMetrics(): Promise<void> {
    await window.spark.kv.delete(this.metricsKey);
    await this.auditLog({
      event: 'metrics_reset',
      timestamp: Date.now(),
    });
  }

  private async auditLog(event: Record<string, unknown>): Promise<void> {
    const logs = await window.spark.kv.get<Record<string, unknown>[]>(this.auditLogKey) || [];
    await window.spark.kv.set(this.auditLogKey, [...logs, event]);
  }

  async getAuditLogs(limit?: number): Promise<Record<string, unknown>[]> {
    const logs = await window.spark.kv.get<Record<string, unknown>[]>(this.auditLogKey) || [];
    const sorted = logs.sort((a, b) => ((b.timestamp as number) || 0) - ((a.timestamp as number) || 0));
    return limit ? sorted.slice(0, limit) : sorted;
  }
}

export const observabilityService = new ObservabilityService();

export function useObservabilityMetrics() {
  const [metrics] = useKV<MetricRecord[]>('observability_metrics', []);
  return metrics || [];
}

export function useObservabilityBudget() {
  const [budget, setBudget] = useKV<BudgetConfig>('observability_budget', DEFAULT_BUDGET);
  return [budget || DEFAULT_BUDGET, setBudget] as const;
}
