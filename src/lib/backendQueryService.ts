/**
 * Backend-Integrated Query Service
 * Routes queries to backend API instead of direct LLM calls
 */

import { apiClient } from './apiClient';
import type { Dataset, PolicyCheck, Domain, UserRole } from './types';
import { validateUserInput } from './prompt-injection-defense';

export interface QueryAskRequest {
  question: string;
  dataset?: Dataset;
  domain?: Domain;
  actor: string;
  role: string;
}

export interface QueryAskResponse {
  queryId: string;
  question: string;
  sql: string;
  columns: string[];
  results: Array<Record<string, unknown>>;
  rowCount: number;
  executionTime: number;
  evidence: any;
  policyChecks?: PolicyCheck[];
  timestamp: string;
}

export class BackendQueryService {
  async ask(request: QueryAskRequest): Promise<QueryAskResponse> {
    // Validate user input for prompt injection
    const validation = validateUserInput(request.question, 'query');
    if (!validation.isValid) {
      throw new Error(`Query validation failed: ${validation.issues.join(', ')}`);
    }
    if (validation.riskLevel === 'CRITICAL') {
      throw new Error(`Query rejected due to CRITICAL security risk: ${validation.issues.join(', ')}`);
    }

    try {
      // For now, we'll generate SQL on the frontend (future: backend LLM)
      const sql = await this.generateSQL(request.question, request.dataset);
      
      // Execute via backend API
      const result = await apiClient.executeQuery(
        sql,
        request.dataset?.id || 'default',
        request.question
      );

      return {
        queryId: result.execution_id,
        question: request.question,
        sql: result.sql,
        columns: result.columns,
        results: result.data,
        rowCount: result.row_count,
        executionTime: result.execution_time,
        evidence: result.evidence,
        policyChecks: result.evidence?.policy_checks ? [
          {
            policy: 'sql_validation',
            passed: result.evidence.policy_checks.sql_validation === 'passed',
            reason: 'SQL validation check'
          },
          {
            policy: 'read_only',
            passed: result.evidence.policy_checks.read_only === true,
            reason: 'Read-only enforcement'
          }
        ] : [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  private async generateSQL(question: string, dataset?: Dataset): Promise<string> {
    // Temporary: Use existing LLM service for SQL generation
    // Future: Move this to backend
    const prompt = `Generate a PostgreSQL SELECT query for this question: ${question}
    
Dataset: ${dataset?.name || 'users table'}
Schema: ${dataset ? JSON.stringify(dataset.schema) : 'id, email, role, created_at'}

Return ONLY the SQL query, no explanations.`;

    try {
      const response = await window.spark.llm(prompt, 'gpt-4o', true);
      return response.trim().replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    } catch (error) {
      // Fallback to simple SELECT
      return `SELECT * FROM users LIMIT 10`;
    }
  }

  async getHistory(limit: number = 50): Promise<any[]> {
    try {
      return await apiClient.getQueryHistory(limit);
    } catch (error) {
      console.error('Failed to fetch query history:', error);
      return [];
    }
  }
}

export const backendQueryService = new BackendQueryService();
