import type { UserRole, Domain, PIILevel, Jurisdiction } from './types';

export type Environment = 'dev' | 'uat' | 'prod';

export type GoalState = 'idle' | 'planning' | 'validating' | 'executing' | 'completed' | 'blocked';

export type ActionType = 
  | 'query_execute'
  | 'dataset_create'
  | 'dataset_update'
  | 'dataset_delete'
  | 'pipeline_create'
  | 'pipeline_deploy'
  | 'policy_create'
  | 'policy_update'
  | 'approval_request'
  | 'approval_grant'
  | 'config.describe'
  | 'config.commit';

export interface ActionContext {
  actionType: ActionType;
  actor: string;
  role: UserRole;
  environment: Environment;
  metadata: {
    domain?: Domain;
    piiLevel?: PIILevel;
    jurisdiction?: Jurisdiction;
    targetEnvironment?: Environment;
    [key: string]: unknown;
  };
}

export interface PolicyDecision {
  allow: boolean;
  requiresApproval: boolean;
  reason: string;
  policyId: string;
  policyName: string;
  tokenCostEstimate?: number;
  queryCostEstimate?: number;
}

export interface BudgetLimits {
  tokenBudget: number;
  queryCostBudget: number;
}

export interface BudgetUsage {
  tokensUsed: number;
  queryCostUsed: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: UserRole;
  action: ActionType;
  environment: Environment;
  decision: PolicyDecision;
  snapshotId?: string;
  metadata: Record<string, unknown>;
}

export interface Snapshot {
  id: string;
  timestamp: string;
  actor: string;
  action: ActionType;
  environment: Environment;
  state: {
    metadata: Record<string, unknown>;
    specs: Record<string, unknown>;
  };
  parentSnapshotId?: string;
}

export interface RollbackResult {
  success: boolean;
  snapshotId: string;
  restoredState: Snapshot['state'];
  message: string;
}

export interface GuardConfig {
  environment: Environment;
  budgetLimits: BudgetLimits;
  enableAudit: boolean;
  enableSnapshots: boolean;
}

export interface ExecutionRequest {
  context: ActionContext;
  payload: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  auditEventId: string;
  snapshotId?: string;
  data?: unknown;
  error?: string;
}
