import type { Dataset, PolicyCheck, Domain } from './types';
import { AureusGuard } from './aureus-guard';
import type { ActionContext } from './aureus-types';
import { PostgresSandbox } from './postgres-sandbox';
import { queryRateLimiter } from './rate-limiter';

export interface QueryIntent {
  question: string;
  measures: string[];
  dimensions: string[];
  filters: Array<{ field: string; operator: string; value: unknown }>;
  timeRange?: { start: string; end: string };
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  limit?: number;
}

export interface Citation {
  datasetId: string;
  datasetName: string;
  domain: Domain;
  columnsUsed: string[];
}

export interface FreshnessCheck {
  datasetId: string;
  datasetName: string;
  lastRefresh: string;
  freshnessSLA: number;
  hoursSinceRefresh: number;
  isStale: boolean;
  statusMessage: string;
}

export interface QueryLineage {
  queryId: string;
  timestamp: string;
  question: string;
  datasetsUsed: string[];
  actor: string;
  role: string;
}

export interface QueryAskRequest {
  question: string;
  domain?: Domain;
  actor: string;
  role: string;
}

export interface QueryAskResponse {
  queryId: string;
  intent: QueryIntent;
  sql: string;
  policyChecks: PolicyCheck[];
  citations: Citation[];
  freshnessChecks: FreshnessCheck[];
  results?: Array<Record<string, unknown>>;
  resultMetadata?: {
    rowCount: number;
    executionTimeMs: number;
    nullRateByColumn: Record<string, number>;
    controlTotals?: Record<string, number>;
  };
  lineageId: string;
  timestamp: string;
}

export class QueryService {
  private aureusGuard: AureusGuard;
  private sandbox: PostgresSandbox;
  private datasets: Map<string, Dataset>;
  private lineageStore: Map<string, QueryLineage> = new Map();

  constructor(aureusGuard: AureusGuard, datasets: Map<string, Dataset>) {
    this.aureusGuard = aureusGuard;
    this.datasets = datasets;
    this.sandbox = new PostgresSandbox();
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  async ask(request: QueryAskRequest): Promise<QueryAskResponse> {
    const rateLimitResult = await queryRateLimiter.checkLimit(request.actor);
    
    if (!rateLimitResult.allowed) {
      throw new Error(rateLimitResult.reason || 'Rate limit exceeded');
    }

    const queryId = this.generateId('query');
    const timestamp = new Date().toISOString();

    const intent = await this.parseIntent(request.question, request.domain);

    const requiredDatasets = this.identifyRequiredDatasets(intent, request.domain);

    const context: ActionContext = {
      actionType: 'query_execute',
      actor: request.actor,
      role: request.role as 'admin' | 'approver' | 'analyst' | 'viewer',
      environment: 'prod',
      metadata: {
        domain: request.domain,
        piiLevel: this.getMaxPIILevel(requiredDatasets),
        jurisdiction: this.getJurisdictions(requiredDatasets) as any,
        datasetsUsed: requiredDatasets.map(ds => ds.id),
      },
    };

    const guardRequest = {
      context,
      payload: {
        question: request.question,
        intent,
        datasets: requiredDatasets.map(ds => ds.id),
      },
    };

    const guardResult = await this.aureusGuard.execute(guardRequest);

    if (!guardResult.success) {
      throw new Error(`Query blocked by policy: ${guardResult.error}`);
    }

    const evaluation = this.aureusGuard['policyEvaluator'].evaluateAll(context);
    const policyChecks: PolicyCheck[] = evaluation.decisions.map((d) => ({
      policyId: d.policyId,
      policyName: d.policyName,
      result: d.allow ? 'allow' : d.requiresApproval ? 'require_approval' : 'block',
      reason: d.reason,
      evaluated: timestamp,
    }));

    const blockedCheck = policyChecks.find(p => p.result === 'block');
    if (blockedCheck) {
      throw new Error(`Query blocked: ${blockedCheck.reason}`);
    }

    const sql = this.generateSQL(intent, requiredDatasets);

    this.validateSQL(sql);

    const citations = this.generateCitations(requiredDatasets, intent);

    const freshnessChecks = this.checkFreshness(requiredDatasets);

    const staleDataset = freshnessChecks.find(fc => fc.isStale);
    if (staleDataset) {
      policyChecks.push({
        policyId: 'freshness-check',
        policyName: 'Data Freshness Policy',
        result: 'require_approval',
        reason: `Dataset ${staleDataset.datasetName} is stale (last refresh: ${staleDataset.hoursSinceRefresh}h ago, SLA: ${staleDataset.freshnessSLA}h)`,
        evaluated: timestamp,
      });
    }

    const results = await this.sandbox.execute(sql, requiredDatasets);

    const resultMetadata = this.calculateResultMetadata(results, Date.now() - new Date(timestamp).getTime());

    const lineageId = this.recordLineage({
      queryId,
      timestamp,
      question: request.question,
      datasetsUsed: requiredDatasets.map(ds => ds.id),
      actor: request.actor,
      role: request.role,
    });

    return {
      queryId,
      intent,
      sql,
      policyChecks,
      citations,
      freshnessChecks,
      results,
      resultMetadata,
      lineageId,
      timestamp,
    };
  }

  private async parseIntent(question: string, domain?: Domain): Promise<QueryIntent> {
    const prompt = spark.llmPrompt`You are a banking analytics expert. Parse this natural language question into a structured intent.

Question: ${question}
${domain ? `Domain context: ${domain}` : ''}

Return ONLY valid JSON matching this structure:
{
  "question": "clarified question",
  "measures": ["field1", "field2"],
  "dimensions": ["dimension1"],
  "filters": [{"field": "status", "operator": "=", "value": "active"}],
  "timeRange": {"start": "2024-01-01", "end": "2024-12-31"},
  "aggregation": "sum",
  "orderBy": {"field": "amount", "direction": "desc"},
  "limit": 100
}

Rules:
- measures: numeric fields to calculate (amount, count, balance, etc.)
- dimensions: categorical fields to group by (region, product, status, etc.)
- filters: WHERE clause conditions
- timeRange: if question mentions dates/periods
- aggregation: sum, avg, count, min, max
- orderBy: sorting preference
- limit: row limit (default 1000, max 10000)`;

    const response = await spark.llm(prompt, 'gpt-4o', true);
    const intent = JSON.parse(response) as QueryIntent;

    if (!intent.limit || intent.limit > 10000) {
      intent.limit = 10000;
    }

    return intent;
  }

  private identifyRequiredDatasets(intent: QueryIntent, domain?: Domain): Dataset[] {
    const allDatasets = Array.from(this.datasets.values());

    if (domain) {
      return allDatasets.filter(ds => ds.domain === domain);
    }

    const candidateDatasets = allDatasets.filter(ds => {
      const allFields = [...intent.measures, ...intent.dimensions, ...intent.filters.map(f => f.field)];
      const schemaFields = ds.schema.map(col => col.name.toLowerCase());
      
      const matchCount = allFields.filter(field => 
        schemaFields.some(sf => sf.includes(field.toLowerCase()) || field.toLowerCase().includes(sf))
      ).length;

      return matchCount > 0;
    });

    return candidateDatasets.slice(0, 3);
  }

  private getMaxPIILevel(datasets: Dataset[]): 'none' | 'low' | 'high' {
    const levels = datasets.map(ds => ds.piiLevel);
    if (levels.includes('high')) return 'high';
    if (levels.includes('low')) return 'low';
    return 'none';
  }

  private getJurisdictions(datasets: Dataset[]): string {
    const jurisdictions = new Set(datasets.map(ds => ds.jurisdiction));
    if (jurisdictions.size > 1) return 'multi';
    return Array.from(jurisdictions)[0] || 'US';
  }

  private generateSQL(intent: QueryIntent, datasets: Dataset[]): string {
    const mainDataset = datasets[0];
    const tableName = mainDataset.name;

    const selectCols: string[] = [];
    
    intent.dimensions.forEach(dim => {
      selectCols.push(dim);
    });

    intent.measures.forEach(measure => {
      const agg = intent.aggregation || 'sum';
      selectCols.push(`${agg.toUpperCase()}(${measure}) as ${measure}_${agg}`);
    });

    let sql = `SELECT ${selectCols.join(', ')}\nFROM ${tableName}`;

    if (intent.filters && intent.filters.length > 0) {
      const whereClauses = intent.filters.map(f => {
        const value = typeof f.value === 'string' ? `'${f.value}'` : f.value;
        return `${f.field} ${f.operator} ${value}`;
      });
      sql += `\nWHERE ${whereClauses.join(' AND ')}`;
    }

    if (intent.timeRange) {
      const timeField = this.inferTimeField(mainDataset);
      if (timeField) {
        const connector = intent.filters && intent.filters.length > 0 ? 'AND' : 'WHERE';
        sql += `\n${connector} ${timeField} BETWEEN '${intent.timeRange.start}' AND '${intent.timeRange.end}'`;
      }
    }

    if (intent.dimensions.length > 0) {
      sql += `\nGROUP BY ${intent.dimensions.join(', ')}`;
    }

    if (intent.orderBy) {
      sql += `\nORDER BY ${intent.orderBy.field} ${intent.orderBy.direction?.toUpperCase() || 'DESC'}`;
    }

    if (intent.limit) {
      sql += `\nLIMIT ${intent.limit}`;
    }

    return sql;
  }

  private inferTimeField(dataset: Dataset): string | null {
    const timeFields = dataset.schema.filter(col => 
      col.type === 'date' || col.type === 'timestamp' || 
      col.name.toLowerCase().includes('date') || col.name.toLowerCase().includes('time')
    );
    return timeFields.length > 0 ? timeFields[0].name : null;
  }

  private validateSQL(sql: string): void {
    const sqlLower = sql.toLowerCase();

    const prohibited = ['insert', 'update', 'delete', 'drop', 'create', 'alter', 'truncate', 'grant', 'revoke'];
    for (const keyword of prohibited) {
      if (sqlLower.includes(keyword)) {
        throw new Error(`Prohibited SQL keyword detected: ${keyword}. Only SELECT queries allowed.`);
      }
    }

    if (!sqlLower.startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }

    if (sqlLower.includes(';') && sqlLower.indexOf(';') < sqlLower.length - 1) {
      throw new Error('Multiple SQL statements not allowed');
    }
  }

  private generateCitations(datasets: Dataset[], intent: QueryIntent): Citation[] {
    return datasets.map(ds => {
      const usedColumns = new Set<string>();
      
      intent.measures.forEach(m => usedColumns.add(m));
      intent.dimensions.forEach(d => usedColumns.add(d));
      intent.filters.forEach(f => usedColumns.add(f.field));

      const actualColumns = Array.from(usedColumns).filter(col => 
        ds.schema.some(s => s.name.toLowerCase() === col.toLowerCase())
      );

      return {
        datasetId: ds.id,
        datasetName: ds.name,
        domain: ds.domain,
        columnsUsed: actualColumns,
      };
    });
  }

  private checkFreshness(datasets: Dataset[]): FreshnessCheck[] {
    return datasets.map(ds => {
      const lastRefresh = new Date(ds.lastRefresh);
      const now = new Date();
      const hoursSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60 * 60);
      const isStale = hoursSinceRefresh > ds.freshnessSLA;

      let statusMessage: string;
      if (isStale) {
        statusMessage = `STALE: Last updated ${Math.round(hoursSinceRefresh)}h ago (SLA: ${ds.freshnessSLA}h)`;
      } else {
        const remaining = ds.freshnessSLA - hoursSinceRefresh;
        statusMessage = `FRESH: Updated ${Math.round(hoursSinceRefresh)}h ago (${Math.round(remaining)}h until stale)`;
      }

      return {
        datasetId: ds.id,
        datasetName: ds.name,
        lastRefresh: ds.lastRefresh,
        freshnessSLA: ds.freshnessSLA,
        hoursSinceRefresh: Math.round(hoursSinceRefresh * 10) / 10,
        isStale,
        statusMessage,
      };
    });
  }

  private calculateResultMetadata(
    results: Array<Record<string, unknown>>,
    executionTimeMs: number
  ): {
    rowCount: number;
    executionTimeMs: number;
    nullRateByColumn: Record<string, number>;
    controlTotals?: Record<string, number>;
  } {
    const rowCount = results.length;

    const nullRateByColumn: Record<string, number> = {};
    if (rowCount > 0) {
      const columns = Object.keys(results[0]);
      columns.forEach(col => {
        const nullCount = results.filter(row => row[col] === null || row[col] === undefined).length;
        nullRateByColumn[col] = nullCount / rowCount;
      });
    }

    const controlTotals: Record<string, number> = {};
    if (rowCount > 0) {
      const columns = Object.keys(results[0]);
      columns.forEach(col => {
        const firstValue = results[0][col];
        if (typeof firstValue === 'number') {
          const sum = results.reduce((acc, row) => {
            const val = row[col];
            return acc + (typeof val === 'number' ? val : 0);
          }, 0);
          controlTotals[`${col}_sum`] = sum;
        }
      });
    }

    return {
      rowCount,
      executionTimeMs: Math.round(executionTimeMs),
      nullRateByColumn,
      controlTotals: Object.keys(controlTotals).length > 0 ? controlTotals : undefined,
    };
  }

  private recordLineage(lineage: QueryLineage): string {
    const lineageId = this.generateId('lineage');
    this.lineageStore.set(lineageId, lineage);
    return lineageId;
  }

  getLineage(lineageId: string): QueryLineage | undefined {
    return this.lineageStore.get(lineageId);
  }

  getAllLineage(): QueryLineage[] {
    return Array.from(this.lineageStore.values());
  }
}
