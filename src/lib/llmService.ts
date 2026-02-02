import type { DataContract, PipelineSpec, Dataset, QueryResult, PolicyCheck } from './types';
import { SAMPLE_DATASETS } from './mockData';
import { observabilityService } from './observability';
import { wrapWithBudgetEnforcement } from './budget-enforcer';
import { validateUserInput, validateLLMOutput } from './prompt-injection-defense';

export async function generateDataContract(description: string): Promise<DataContract> {
  // Validate user input for prompt injection
  const validation = validateUserInput(description, 'config');
  if (!validation.isValid) {
    throw new Error(`Input validation failed: ${validation.issues.join(', ')}`);
  }
  if (validation.riskLevel === 'CRITICAL' || validation.riskLevel === 'HIGH') {
    throw new Error(`Input rejected due to ${validation.riskLevel} risk: ${validation.issues.join(', ')}`);
  }

  return wrapWithBudgetEnforcement(
    async () => {
      const prompt = `You are a data governance expert at a bank. A user wants to onboard a new dataset.

User description: ${description}

Generate a complete data contract specification. Return ONLY valid JSON matching this exact structure:
{
  "name": "snake_case_name",
  "domain": "one of: credit_risk, aml_fcc, finance, treasury, retail, ops",
  "owner": "team-name",
  "description": "detailed description",
  "schema": [
    {"name": "column_name", "type": "string|integer|decimal|date|timestamp|boolean", "nullable": true|false, "pii": true|false, "description": "column purpose"}
  ],
  "piiLevel": "none|low|high",
  "jurisdiction": "US|EU|UK|APAC|multi",
  "freshnessSLA": 1,
  "tags": ["tag1", "tag2"],
  "ingestionSchedule": "cron expression or description",
  "validationRules": ["rule1", "rule2"]
}

Rules:
- Infer PII fields carefully (customer_id, account_number, email, phone, ssn, address are PII)
- Set piiLevel to "high" if ANY column has pii:true
- Choose appropriate domain based on dataset purpose
- Freshness SLA is in hours (1=hourly, 24=daily, 168=weekly)
- Include realistic validation rules
- Owner should be a relevant team name`;

      const response = await window.spark.llm(prompt, 'gpt-4o', true);
      
      // Validate LLM output
      const outputValidation = validateLLMOutput(response, { name: 'string', domain: 'string' });
      if (!outputValidation.isValid) {
        throw new Error(`LLM output validation failed: ${outputValidation.issues.join(', ')}`);
      }
      
      const contract = JSON.parse(response) as DataContract;
      
      return contract;
    },
    'config_copilot',
    description
  );
}

export async function generatePipelineSpec(
  description: string,
  availableDatasets: Dataset[]
): Promise<PipelineSpec> {
  // Validate user input for prompt injection
  const validation = validateUserInput(description, 'config');
  if (!validation.isValid) {
    throw new Error(`Input validation failed: ${validation.issues.join(', ')}`);
  }
  if (validation.riskLevel === 'CRITICAL' || validation.riskLevel === 'HIGH') {
    throw new Error(`Input rejected due to ${validation.riskLevel} risk: ${validation.issues.join(', ')}`);
  }

  return wrapWithBudgetEnforcement(
    async () => {
      const datasetsContext = availableDatasets.map(ds => ({
        name: ds.name,
        domain: ds.domain,
        schema: ds.schema.map(col => `${col.name}:${col.type}`).join(', '),
      }));

      const prompt = `You are a data engineering expert at a bank. A user wants to create a data pipeline.

User request: ${description}

Available datasets:
${JSON.stringify(datasetsContext, null, 2)}

Generate a complete pipeline specification. Return ONLY valid JSON matching this exact structure:
{
  "name": "snake_case_pipeline_name",
  "description": "what this pipeline does",
  "domain": "one of: credit_risk, aml_fcc, finance, treasury, retail, ops",
  "sourceDatasets": ["dataset_name1", "dataset_name2"],
  "targetDataset": "output_dataset_name",
  "sql": "SELECT ... SQL query that transforms source to target",
  "tests": [
    {
      "name": "test_name",
      "type": "unit",
      "sampleInput": [{"col1": "val1"}],
      "expectedOutput": [{"col1": "val1"}]
    }
  ],
  "dqChecks": [
    {
      "name": "check_name",
      "type": "completeness|uniqueness|validity|consistency",
      "rule": "SQL or description",
      "threshold": 0.99
    }
  ],
  "schedule": "cron or description"
}

Rules:
- SQL must be valid and reference actual source datasets
- Include at least 2 unit tests with realistic sample data
- Include at least 3 DQ checks (completeness, uniqueness, and one other)
- Choose source datasets from the available list that match the requirements
- Target dataset name should reflect what the pipeline produces`;

      const response = await window.spark.llm(prompt, 'gpt-4o', true);
      
      // Validate LLM output
      const outputValidation = validateLLMOutput(response, { name: 'string', sql: 'string' });
      if (!outputValidation.isValid) {
        throw new Error(`LLM output validation failed: ${outputValidation.issues.join(', ')}`);
      }
      
      const spec = JSON.parse(response) as PipelineSpec;
      
      return spec;
    },
    'pipeline',
    description
  );
}

export async function generateSQLFromQuestion(
  question: string,
  availableDatasets: Dataset[]
): Promise<{ sql: string; datasets: Dataset[]; intent: Record<string, unknown> }> {
  // Validate user input for prompt injection
  const validation = validateUserInput(question, 'query');
  if (!validation.isValid) {
    throw new Error(`Question validation failed: ${validation.issues.join(', ')}`);
  }
  if (validation.riskLevel === 'CRITICAL') {
    throw new Error(`Question rejected due to CRITICAL security risk: ${validation.issues.join(', ')}`);
  }

  return wrapWithBudgetEnforcement(
    async () => {
      const datasetsContext = availableDatasets.map(ds => ({
        name: ds.name,
        domain: ds.domain,
        description: ds.description,
        schema: ds.schema.map(col => ({
          name: col.name,
          type: col.type,
          pii: col.pii,
        })),
      }));

      const prompt = `You are a SQL expert at a bank. A user asks a data question.

User question: ${question}

Available datasets:
${JSON.stringify(datasetsContext, null, 2)}

Analyze the question and generate:
1. An intent schema identifying requirements
2. Which datasets are needed
3. Valid SQL to answer the question

Return ONLY valid JSON matching this exact structure:
{
  "intent": {
    "question": "rephrased clear question",
    "requiredDomains": ["domain1"],
    "requiredDatasets": ["dataset_name1"],
    "containsPII": true|false,
    "aggregationType": "summary|detail|timeseries"
  },
  "datasets": ["dataset_name1", "dataset_name2"],
  "sql": "SELECT ... valid SQL query"
}

Rules:
- SQL must reference actual tables from available datasets
- Set containsPII to true if query needs PII columns
- Choose appropriate datasets that can answer the question
- SQL should be read-only (no INSERT/UPDATE/DELETE)
- Include appropriate WHERE, GROUP BY, ORDER BY clauses`;

      const response = await window.spark.llm(prompt, 'gpt-4o', true);
      
      // Validate LLM output
      const outputValidation = validateLLMOutput(response, { sql: 'string', datasets: 'array' });
      if (!outputValidation.isValid) {
        throw new Error(`LLM output validation failed: ${outputValidation.issues.join(', ')}`);
      }
      
      const result = JSON.parse(response) as {
        intent: Record<string, unknown>;
        datasets: string[];
        sql: string;
      };

      // Validate generated SQL
      const sqlValidation = validateGeneratedSQL(
        result.sql,
        result.datasets
      );
      if (!sqlValidation.isValid) {
        throw new Error(`Generated SQL validation failed: ${sqlValidation.issues.join(', ')}`);
      }
      if (sqlValidation.riskLevel === 'CRITICAL') {
        throw new Error(`Generated SQL rejected due to CRITICAL security risk: ${sqlValidation.issues.join(', ')}`);
      }

      const matchedDatasets = availableDatasets.filter(ds => 
        result.datasets.includes(ds.name)
      );

      return {
        sql: result.sql,
        datasets: matchedDatasets,
        intent: result.intent,
      };
    },
    'query',
    question
  );
}

export async function executeQuery(
  question: string,
  sql: string,
  datasets: Dataset[],
  policyChecks: PolicyCheck[]
): Promise<QueryResult> {
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

  const mockResults: Record<string, unknown>[] = [];
  
  if (datasets.some(ds => ds.domain === 'credit_risk')) {
    mockResults.push(
      { risk_rating: 'High', total_balance: 2_450_000_000, loan_count: 1234 },
      { risk_rating: 'Medium', total_balance: 8_900_000_000, loan_count: 5678 },
      { risk_rating: 'Low', total_balance: 15_600_000_000, loan_count: 12345 }
    );
  } else if (datasets.some(ds => ds.domain === 'aml_fcc')) {
    mockResults.push(
      { alert_type: 'Large Cash Transaction', count: 45, avg_risk_score: 72 },
      { alert_type: 'Structured Transaction', count: 23, avg_risk_score: 85 },
      { alert_type: 'Suspicious Pattern', count: 12, avg_risk_score: 91 }
    );
  } else if (datasets.some(ds => ds.domain === 'retail')) {
    mockResults.push(
      { channel: 'ATM', daily_volume: 2_345_678, avg_amount: 250 },
      { channel: 'Online', daily_volume: 5_678_901, avg_amount: 125 },
      { channel: 'Branch', daily_volume: 1_234_567, avg_amount: 450 },
      { channel: 'Mobile', daily_volume: 8_901_234, avg_amount: 75 }
    );
  } else if (datasets.some(ds => ds.domain === 'treasury')) {
    mockResults.push(
      { asset_class: 'Equities', unrealized_pnl: 15_234_567, position_count: 234 },
      { asset_class: 'Fixed Income', unrealized_pnl: -2_345_678, position_count: 567 },
      { asset_class: 'Derivatives', unrealized_pnl: 8_901_234, position_count: 123 }
    );
  } else {
    mockResults.push(
      { category: 'Category A', value: 12345, percentage: 45.2 },
      { category: 'Category B', value: 8901, percentage: 32.5 },
      { category: 'Category C', value: 6123, percentage: 22.3 }
    );
  }

  return {
    id: `qry-${Date.now()}`,
    question,
    sql,
    datasets,
    results: mockResults,
    executionTime: 800 + Math.random() * 400,
    policyChecks,
    timestamp: new Date().toISOString(),
  };
}
