import type { Dataset } from './types';

export interface SanityCheckResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
    value?: number | string;
  }>;
}

export class PostgresSandbox {
  private readonly MAX_ROW_COUNT = 10000;
  private readonly MAX_NULL_RATE = 0.5;

  async execute(sql: string, datasets: Dataset[]): Promise<Array<Record<string, unknown>>> {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

    const mockResults = this.generateMockResults(sql, datasets);

    const sanityCheck = this.performSanityChecks(mockResults);

    if (!sanityCheck.passed) {
      const failedChecks = sanityCheck.checks.filter(c => !c.passed);
      throw new Error(`Sanity checks failed: ${failedChecks.map(c => c.message).join('; ')}`);
    }

    return mockResults;
  }

  private generateMockResults(sql: string, datasets: Dataset[]): Array<Record<string, unknown>> {
    const mainDataset = datasets[0];
    const sqlLower = sql.toLowerCase();

    const isGroupBy = sqlLower.includes('group by');
    const isAggregation = /\b(sum|avg|count|min|max)\s*\(/i.test(sql);

    let rowCount = 5;
    if (sqlLower.includes('limit')) {
      const limitMatch = sql.match(/limit\s+(\d+)/i);
      if (limitMatch) {
        rowCount = Math.min(parseInt(limitMatch[1], 10), this.MAX_ROW_COUNT);
        rowCount = Math.min(rowCount, 100);
      }
    }

    const results: Array<Record<string, unknown>> = [];

    if (mainDataset.domain === 'credit_risk') {
      for (let i = 0; i < rowCount; i++) {
        results.push({
          risk_rating: ['High', 'Medium', 'Low'][i % 3],
          loan_id: `LOAN-${1000 + i}`,
          total_balance: Math.round(1_000_000 + Math.random() * 5_000_000),
          loan_count: Math.round(100 + Math.random() * 500),
          default_rate: +(Math.random() * 0.05).toFixed(4),
        });
      }
    } else if (mainDataset.domain === 'aml_fcc') {
      for (let i = 0; i < rowCount; i++) {
        results.push({
          alert_type: ['Large Cash Transaction', 'Structured Transaction', 'Suspicious Pattern', 'Cross-Border'][i % 4],
          alert_id: `ALERT-${2000 + i}`,
          count: Math.round(10 + Math.random() * 50),
          avg_risk_score: Math.round(60 + Math.random() * 40),
          total_amount: Math.round(500_000 + Math.random() * 2_000_000),
        });
      }
    } else if (mainDataset.domain === 'retail') {
      for (let i = 0; i < rowCount; i++) {
        results.push({
          channel: ['ATM', 'Online', 'Branch', 'Mobile'][i % 4],
          transaction_id: `TXN-${3000 + i}`,
          daily_volume: Math.round(1_000_000 + Math.random() * 5_000_000),
          avg_amount: Math.round(50 + Math.random() * 500),
          customer_count: Math.round(500 + Math.random() * 2000),
        });
      }
    } else if (mainDataset.domain === 'treasury') {
      for (let i = 0; i < rowCount; i++) {
        results.push({
          asset_class: ['Equities', 'Fixed Income', 'Derivatives', 'Commodities'][i % 4],
          position_id: `POS-${4000 + i}`,
          unrealized_pnl: Math.round((Math.random() - 0.5) * 10_000_000),
          position_count: Math.round(50 + Math.random() * 300),
          market_value: Math.round(5_000_000 + Math.random() * 20_000_000),
        });
      }
    } else if (mainDataset.domain === 'finance') {
      for (let i = 0; i < rowCount; i++) {
        results.push({
          account_type: ['Asset', 'Liability', 'Revenue', 'Expense'][i % 4],
          account_id: `ACCT-${5000 + i}`,
          balance: Math.round((Math.random() - 0.3) * 50_000_000),
          transaction_count: Math.round(100 + Math.random() * 1000),
          gl_code: `GL-${1000 + (i % 20)}`,
        });
      }
    } else {
      for (let i = 0; i < rowCount; i++) {
        results.push({
          category: `Category ${String.fromCharCode(65 + (i % 5))}`,
          record_id: `REC-${6000 + i}`,
          value: Math.round(10000 + Math.random() * 100000),
          percentage: +(Math.random() * 100).toFixed(2),
          status: ['Active', 'Pending', 'Complete'][i % 3],
        });
      }
    }

    return results;
  }

  private performSanityChecks(results: Array<Record<string, unknown>>): SanityCheckResult {
    const checks: Array<{ name: string; passed: boolean; message: string; value?: number | string }> = [];

    const rowCountCheck = results.length <= this.MAX_ROW_COUNT;
    checks.push({
      name: 'row_count_limit',
      passed: rowCountCheck,
      message: rowCountCheck 
        ? `Row count within limit (${results.length} <= ${this.MAX_ROW_COUNT})`
        : `Row count exceeds limit (${results.length} > ${this.MAX_ROW_COUNT})`,
      value: results.length,
    });

    if (results.length > 0) {
      const columns = Object.keys(results[0]);
      let maxNullRate = 0;
      let maxNullColumn = '';

      columns.forEach(col => {
        const nullCount = results.filter(row => row[col] === null || row[col] === undefined).length;
        const nullRate = nullCount / results.length;
        
        if (nullRate > maxNullRate) {
          maxNullRate = nullRate;
          maxNullColumn = col;
        }
      });

      const nullRateCheck = maxNullRate <= this.MAX_NULL_RATE;
      checks.push({
        name: 'null_rate_check',
        passed: nullRateCheck,
        message: nullRateCheck
          ? `Null rate acceptable (max ${(maxNullRate * 100).toFixed(1)}% in ${maxNullColumn || 'N/A'})`
          : `Null rate too high (${(maxNullRate * 100).toFixed(1)}% in ${maxNullColumn} > ${this.MAX_NULL_RATE * 100}%)`,
        value: maxNullRate,
      });

      const numericColumns = columns.filter(col => typeof results[0][col] === 'number');
      if (numericColumns.length > 0) {
        numericColumns.forEach(col => {
          const values = results.map(row => row[col] as number).filter(v => !isNaN(v));
          const sum = values.reduce((acc, v) => acc + v, 0);
          const avg = sum / values.length;
          
          const allZero = values.every(v => v === 0);
          const allSame = values.every(v => v === values[0]);
          
          const controlCheck = !allZero && !allSame;
          checks.push({
            name: `control_total_${col}`,
            passed: controlCheck,
            message: controlCheck
              ? `Control total for ${col}: sum=${sum.toFixed(2)}, avg=${avg.toFixed(2)}`
              : `Suspicious control total for ${col} (all ${allZero ? 'zero' : 'same value'})`,
            value: sum,
          });
        });
      }
    } else {
      checks.push({
        name: 'empty_result_check',
        passed: true,
        message: 'Query returned 0 rows (valid but may indicate issue with filters)',
        value: 0,
      });
    }

    const passed = checks.filter(c => !c.passed).length === 0;

    return { passed, checks };
  }

  getSanityCheckLimits() {
    return {
      maxRowCount: this.MAX_ROW_COUNT,
      maxNullRate: this.MAX_NULL_RATE,
    };
  }
}
