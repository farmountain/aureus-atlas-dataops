import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryService } from '../query-service';
import { AureusGuard } from '../aureus-guard';
import { PolicyEvaluator } from '../policy-evaluator';
import type { Dataset } from '../types';

vi.stubGlobal('spark', {
  llmPrompt: (strings: TemplateStringsArray, ...values: unknown[]) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
  },
  llm: async (prompt: string, model?: string, jsonMode?: boolean) => {
    if (prompt.includes('Parse this natural language question')) {
      return JSON.stringify({
        question: "What is the total loan balance by risk rating?",
        measures: ["total_balance", "loan_count"],
        dimensions: ["risk_rating"],
        filters: [],
        aggregation: "sum",
        orderBy: { field: "total_balance", direction: "desc" },
        limit: 1000
      });
    }
    return '{}';
  },
});

describe('QueryService', () => {
  let service: QueryService;
  let guard: AureusGuard;
  let datasets: Map<string, Dataset>;

  beforeEach(() => {
    guard = new AureusGuard(
      {
        environment: 'prod',
        budgetLimits: { tokenBudget: 100000, queryCostBudget: 10000 },
        enableAudit: true,
        enableSnapshots: true,
      },
      new PolicyEvaluator()
    );

    datasets = new Map<string, Dataset>();

    const lowPIIDataset: Dataset = {
      id: 'ds-low-pii',
      name: 'loan_summary',
      domain: 'credit_risk',
      owner: 'risk-team',
      description: 'Aggregated loan data without PII',
      schema: [
        { name: 'risk_rating', type: 'string', nullable: false, pii: false },
        { name: 'total_balance', type: 'decimal', nullable: false, pii: false },
        { name: 'loan_count', type: 'integer', nullable: false, pii: false },
      ],
      piiLevel: 'none',
      jurisdiction: 'US',
      freshnessSLA: 24,
      lastRefresh: new Date().toISOString(),
      tags: ['credit', 'loans'],
    };

    const highPIIDataset: Dataset = {
      id: 'ds-high-pii',
      name: 'customer_transactions',
      domain: 'retail',
      owner: 'retail-team',
      description: 'Individual customer transactions',
      schema: [
        { name: 'transaction_id', type: 'string', nullable: false, pii: false },
        { name: 'customer_id', type: 'string', nullable: false, pii: true },
        { name: 'ssn', type: 'string', nullable: true, pii: true },
        { name: 'amount', type: 'decimal', nullable: false, pii: false },
      ],
      piiLevel: 'high',
      jurisdiction: 'US',
      freshnessSLA: 1,
      lastRefresh: new Date().toISOString(),
      tags: ['retail', 'pii'],
    };

    const crossBorderDataset: Dataset = {
      id: 'ds-cross-border',
      name: 'global_transactions',
      domain: 'treasury',
      owner: 'treasury-team',
      description: 'Cross-border transaction data',
      schema: [
        { name: 'transaction_id', type: 'string', nullable: false, pii: false },
        { name: 'amount_usd', type: 'decimal', nullable: false, pii: false },
        { name: 'country_code', type: 'string', nullable: false, pii: false },
      ],
      piiLevel: 'none',
      jurisdiction: 'multi',
      freshnessSLA: 12,
      lastRefresh: new Date().toISOString(),
      tags: ['global', 'treasury'],
    };

    datasets.set(lowPIIDataset.id, lowPIIDataset);
    datasets.set(highPIIDataset.id, highPIIDataset);
    datasets.set(crossBorderDataset.id, crossBorderDataset);

    service = new QueryService(guard, datasets);
  });

  describe('Query Ask Endpoint', () => {
    it('should return canonical intent JSON with measures, dimensions, filters', async () => {
      const response = await service.ask({
        question: 'What is the total loan balance by risk rating?',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.queryId).toBeDefined();
      expect(response.intent).toBeDefined();
      expect(response.intent.measures).toContain('total_balance');
      expect(response.intent.dimensions).toContain('risk_rating');
      expect(response.intent.aggregation).toBe('sum');
    });

    it('should generate valid SELECT-only SQL', async () => {
      const response = await service.ask({
        question: 'Show me loan balances by risk rating',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.sql).toBeDefined();
      expect(response.sql.toLowerCase()).toContain('select');
      expect(response.sql.toLowerCase()).toContain('from');
      expect(response.sql.toLowerCase()).not.toContain('insert');
      expect(response.sql.toLowerCase()).not.toContain('update');
      expect(response.sql.toLowerCase()).not.toContain('delete');
      expect(response.sql.toLowerCase()).not.toContain('drop');
    });

    it('should return policy check results', async () => {
      const response = await service.ask({
        question: 'What is the total loan balance?',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.policyChecks).toBeDefined();
      expect(Array.isArray(response.policyChecks)).toBe(true);
      expect(response.policyChecks.length).toBeGreaterThan(0);
      expect(response.policyChecks[0]).toHaveProperty('policyId');
      expect(response.policyChecks[0]).toHaveProperty('policyName');
      expect(response.policyChecks[0]).toHaveProperty('result');
      expect(response.policyChecks[0]).toHaveProperty('reason');
    });

    it('should return citations with dataset IDs and names', async () => {
      const response = await service.ask({
        question: 'Show me loan data',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.citations).toBeDefined();
      expect(Array.isArray(response.citations)).toBe(true);
      expect(response.citations.length).toBeGreaterThan(0);
      expect(response.citations[0]).toHaveProperty('datasetId');
      expect(response.citations[0]).toHaveProperty('datasetName');
      expect(response.citations[0]).toHaveProperty('domain');
      expect(response.citations[0]).toHaveProperty('columnsUsed');
    });

    it('should return freshness check results', async () => {
      const response = await service.ask({
        question: 'What is the loan balance?',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.freshnessChecks).toBeDefined();
      expect(Array.isArray(response.freshnessChecks)).toBe(true);
      expect(response.freshnessChecks.length).toBeGreaterThan(0);
      expect(response.freshnessChecks[0]).toHaveProperty('datasetId');
      expect(response.freshnessChecks[0]).toHaveProperty('lastRefresh');
      expect(response.freshnessChecks[0]).toHaveProperty('freshnessSLA');
      expect(response.freshnessChecks[0]).toHaveProperty('isStale');
      expect(response.freshnessChecks[0]).toHaveProperty('statusMessage');
    });

    it('should execute query and return results', async () => {
      const response = await service.ask({
        question: 'Show loan balances',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.results).toBeDefined();
      expect(Array.isArray(response.results)).toBe(true);
      expect(response.resultMetadata).toBeDefined();
      expect(response.resultMetadata?.rowCount).toBeDefined();
      expect(response.resultMetadata?.executionTimeMs).toBeDefined();
    });

    it('should record query lineage', async () => {
      const response = await service.ask({
        question: 'Show loan data',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.lineageId).toBeDefined();

      const lineage = service.getLineage(response.lineageId);
      expect(lineage).toBeDefined();
      expect(lineage?.queryId).toBe(response.queryId);
      expect(lineage?.question).toBe('Show loan data');
      expect(lineage?.actor).toBe('analyst-user');
      expect(lineage?.datasetsUsed).toBeDefined();
    });
  });

  describe('Policy Enforcement - PII Blocking', () => {
    it('should block query when pii_level is high for non-admin role', async () => {
      try {
        await service.ask({
          question: 'Show me customer SSNs',
          domain: 'retail',
          actor: 'analyst-user',
          role: 'analyst',
        });
        expect.fail('Should have blocked high PII query for analyst');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('blocked');
      }
    });

    it('should allow high PII query for admin role', async () => {
      const response = await service.ask({
        question: 'Show customer transactions',
        domain: 'retail',
        actor: 'admin-user',
        role: 'admin',
      });

      expect(response).toBeDefined();
      expect(response.queryId).toBeDefined();
    });
  });

  describe('Policy Enforcement - Cross-Jurisdiction', () => {
    it('should require approval for cross-border queries', async () => {
      const response = await service.ask({
        question: 'Show global treasury positions',
        domain: 'treasury',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.policyChecks).toBeDefined();
      const crossBorderCheck = response.policyChecks.find(
        (pc) => pc.result === 'require_approval' && pc.reason.toLowerCase().includes('jurisdiction')
      );

      expect(crossBorderCheck).toBeDefined();
    });
  });

  describe('SQL Validation', () => {
    it('should reject SQL with prohibited keywords', () => {
      const prohibitedSQL = [
        'INSERT INTO table VALUES (1, 2, 3)',
        'UPDATE table SET col = 1',
        'DELETE FROM table WHERE id = 1',
        'DROP TABLE table',
        'CREATE TABLE table (id INT)',
        'ALTER TABLE table ADD COLUMN col',
      ];

      prohibitedSQL.forEach((sql) => {
        expect(() => service['validateSQL'](sql)).toThrow();
      });
    });

    it('should accept valid SELECT queries', () => {
      const validSQL = [
        'SELECT * FROM table',
        'SELECT col1, col2 FROM table WHERE col1 > 10',
        'SELECT SUM(amount) FROM table GROUP BY category',
      ];

      validSQL.forEach((sql) => {
        expect(() => service['validateSQL'](sql)).not.toThrow();
      });
    });
  });

  describe('Sandboxed Execution', () => {
    it('should enforce row count limits', async () => {
      const response = await service.ask({
        question: 'Show me all loans',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.resultMetadata?.rowCount).toBeLessThanOrEqual(10000);
    });

    it('should calculate null rates by column', async () => {
      const response = await service.ask({
        question: 'Show loan data',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      expect(response.resultMetadata?.nullRateByColumn).toBeDefined();
      expect(typeof response.resultMetadata?.nullRateByColumn).toBe('object');
    });

    it('should calculate control totals for numeric columns', async () => {
      const response = await service.ask({
        question: 'Show loan balances',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      if (response.resultMetadata?.controlTotals) {
        expect(typeof response.resultMetadata.controlTotals).toBe('object');
        const keys = Object.keys(response.resultMetadata.controlTotals);
        expect(keys.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Freshness Checks', () => {
    it('should mark stale data and flag for approval', async () => {
      const staleDataset: Dataset = {
        id: 'ds-stale',
        name: 'stale_data',
        domain: 'finance',
        owner: 'finance-team',
        description: 'Old data',
        schema: [{ name: 'id', type: 'string', nullable: false, pii: false }],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 1,
        lastRefresh: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        tags: ['finance'],
      };

      datasets.set(staleDataset.id, staleDataset);
      service = new QueryService(guard, datasets);

      const response = await service.ask({
        question: 'Show finance data',
        domain: 'finance',
        actor: 'analyst-user',
        role: 'analyst',
      });

      const staleCheck = response.freshnessChecks.find((fc) => fc.isStale);
      expect(staleCheck).toBeDefined();
      expect(staleCheck?.hoursSinceRefresh).toBeGreaterThan(staleCheck?.freshnessSLA || 0);

      const stalePolicy = response.policyChecks.find(
        (pc) => pc.policyId === 'freshness-check' && pc.result === 'require_approval'
      );
      expect(stalePolicy).toBeDefined();
    });
  });

  describe('Lineage Recording', () => {
    it('should store query -> datasets mapping', async () => {
      const response = await service.ask({
        question: 'Show loan balances',
        domain: 'credit_risk',
        actor: 'analyst-user',
        role: 'analyst',
      });

      const lineage = service.getLineage(response.lineageId);
      expect(lineage).toBeDefined();
      expect(lineage?.datasetsUsed.length).toBeGreaterThan(0);
      expect(lineage?.timestamp).toBeDefined();
    });

    it('should retrieve all lineage records', async () => {
      await service.ask({
        question: 'Query 1',
        domain: 'credit_risk',
        actor: 'user1',
        role: 'analyst',
      });

      await service.ask({
        question: 'Query 2',
        domain: 'retail',
        actor: 'user2',
        role: 'analyst',
      });

      const allLineage = service.getAllLineage();
      expect(allLineage.length).toBeGreaterThanOrEqual(2);
    });
  });
});
