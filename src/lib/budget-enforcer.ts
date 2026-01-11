import { observabilityService } from './observability';

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export async function enforceBeforeExecution(): Promise<void> {
  const budgetCheck = await observabilityService.checkBudget();
  
  if (!budgetCheck.allowed) {
    throw new BudgetExceededError(budgetCheck.reason || 'Budget exceeded');
  }
}

export async function wrapWithBudgetEnforcement<T>(
  operation: () => Promise<T>,
  operationType: 'query' | 'config_copilot' | 'pipeline' | 'approval',
  textInput: string
): Promise<T> {
  await enforceBeforeExecution();
  
  const startTime = Date.now();
  let result: T;
  let error: Error | undefined;
  
  try {
    result = await operation();
    const latencyMs = Date.now() - startTime;
    
    await observabilityService.recordMetric(
      operationType,
      latencyMs,
      'success',
      textInput,
      typeof result === 'string' ? result : JSON.stringify(result),
      undefined,
      { operation: 'budget_enforced_execution' }
    );
    
    return result;
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    error = err instanceof Error ? err : new Error(String(err));
    
    const status = error instanceof BudgetExceededError ? 'blocked' : 'error';
    
    await observabilityService.recordMetric(
      operationType,
      latencyMs,
      status,
      textInput,
      undefined,
      error.message,
      { operation: 'budget_enforced_execution' }
    );
    
    throw error;
  }
}
