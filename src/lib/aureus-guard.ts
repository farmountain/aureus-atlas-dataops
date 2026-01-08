import { PolicyEvaluator } from './policy-evaluator';
import type {
  ActionContext,
  GoalState,
  AuditEvent,
  Snapshot,
  RollbackResult,
  GuardConfig,
  ExecutionRequest,
  ExecutionResult,
  BudgetUsage,
} from './aureus-types';

export class AureusGuard {
  private state: GoalState = 'idle';
  private policyEvaluator: PolicyEvaluator;
  private auditLog: AuditEvent[] = [];
  private snapshots: Snapshot[] = [];
  private config: GuardConfig;
  private budgetUsage: BudgetUsage = {
    tokensUsed: 0,
    queryCostUsed: 0,
  };

  constructor(config: GuardConfig, policyEvaluator?: PolicyEvaluator) {
    this.config = config;
    this.policyEvaluator = policyEvaluator || new PolicyEvaluator();
  }

  getState(): GoalState {
    return this.state;
  }

  private setState(newState: GoalState): void {
    console.log(`[AureusGuard] State transition: ${this.state} -> ${newState}`);
    this.state = newState;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  checkBudget(tokenCost: number, queryCost: number): { withinBudget: boolean; reason?: string } {
    const newTokenUsage = this.budgetUsage.tokensUsed + tokenCost;
    const newQueryCostUsage = this.budgetUsage.queryCostUsed + queryCost;

    if (newTokenUsage > this.config.budgetLimits.tokenBudget) {
      const message = `Token budget exceeded: ${newTokenUsage}/${this.config.budgetLimits.tokenBudget}`;
      console.log(`[AureusGuard] Budget check failed: ${message}`);
      return { withinBudget: false, reason: message };
    }

    if (newQueryCostUsage > this.config.budgetLimits.queryCostBudget) {
      const message = `Query cost budget exceeded: ${newQueryCostUsage}/${this.config.budgetLimits.queryCostBudget}`;
      console.log(`[AureusGuard] Budget check failed: ${message}`);
      return { withinBudget: false, reason: message };
    }

    console.log(`[AureusGuard] Budget check passed: tokens ${newTokenUsage}/${this.config.budgetLimits.tokenBudget}, query cost ${newQueryCostUsage}/${this.config.budgetLimits.queryCostBudget}`);
    return { withinBudget: true };
  }

  private incrementBudget(tokenCost: number, queryCost: number): void {
    this.budgetUsage.tokensUsed += tokenCost;
    this.budgetUsage.queryCostUsed += queryCost;
    console.log(`[AureusGuard] Budget updated: tokens ${this.budgetUsage.tokensUsed}/${this.config.budgetLimits.tokenBudget}, query cost ${this.budgetUsage.queryCostUsed}/${this.config.budgetLimits.queryCostBudget}`);
  }

  getBudgetUsage(): BudgetUsage {
    return { ...this.budgetUsage };
  }

  resetBudget(): void {
    this.budgetUsage = {
      tokensUsed: 0,
      queryCostUsed: 0,
    };
    console.log('[AureusGuard] Budget reset');
  }

  async checkPolicy(context: ActionContext): Promise<{ allow: boolean; requiresApproval: boolean; reason: string }> {
    this.setState('validating');

    const evaluation = this.policyEvaluator.evaluateAll(context);

    if (!evaluation.allow && !evaluation.requiresApproval) {
      this.setState('blocked');
      const blockingDecisions = evaluation.decisions.filter(d => !d.allow && !d.requiresApproval);
      return {
        allow: false,
        requiresApproval: false,
        reason: blockingDecisions.map(d => d.reason).join('; '),
      };
    }

    if (evaluation.requiresApproval) {
      this.setState('blocked');
      const approvalDecisions = evaluation.decisions.filter(d => d.requiresApproval);
      return {
        allow: false,
        requiresApproval: true,
        reason: approvalDecisions.map(d => d.reason).join('; '),
      };
    }

    this.setState('planning');
    return {
      allow: true,
      requiresApproval: false,
      reason: 'All policies passed',
    };
  }

  private createAuditEvent(context: ActionContext, outcome: 'success' | 'blocked' | 'requires_approval', snapshotId?: string): AuditEvent {
    const primaryDecision = this.policyEvaluator.evaluateAll(context).decisions[0];
    const auditEvent: AuditEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      actor: context.actor,
      role: context.role,
      action: context.actionType,
      environment: context.environment,
      decision: primaryDecision,
      snapshotId,
      metadata: context.metadata,
    };

    if (this.config.enableAudit) {
      this.auditLog.push(auditEvent);
      console.log('[AureusGuard] Audit event created:', auditEvent.id, outcome);
    }

    return auditEvent;
  }

  private createSnapshot(context: ActionContext, state: Snapshot['state']): Snapshot {
    const snapshot: Snapshot = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      actor: context.actor,
      action: context.actionType,
      environment: context.environment,
      state,
      parentSnapshotId: this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].id : undefined,
    };

    if (this.config.enableSnapshots) {
      this.snapshots.push(snapshot);
      console.log('[AureusGuard] Snapshot created:', snapshot.id);
    }

    return snapshot;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const { context, payload } = request;

    const policyCheck = await this.checkPolicy(context);

    if (!policyCheck.allow) {
      const outcome = policyCheck.requiresApproval ? 'requires_approval' : 'blocked';
      const auditEvent = this.createAuditEvent(context, outcome);

      return {
        success: false,
        auditEventId: auditEvent.id,
        error: policyCheck.reason,
      };
    }

    const tokenCost = (context.metadata.tokenCostEstimate as number) || 0;
    const queryCost = (context.metadata.queryCostEstimate as number) || 0;

    const budgetCheck = this.checkBudget(tokenCost, queryCost);
    if (!budgetCheck.withinBudget) {
      const auditEvent = this.createAuditEvent(context, 'blocked');
      return {
        success: false,
        auditEventId: auditEvent.id,
        error: budgetCheck.reason,
      };
    }

    this.setState('executing');

    const snapshot = this.createSnapshot(context, {
      metadata: context.metadata,
      specs: payload,
    });

    this.incrementBudget(tokenCost, queryCost);

    const auditEvent = this.createAuditEvent(context, 'success', snapshot.id);

    this.setState('completed');

    return {
      success: true,
      auditEventId: auditEvent.id,
      snapshotId: snapshot.id,
      data: payload,
    };
  }

  async rollback(snapshotId: string): Promise<RollbackResult> {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);

    if (!snapshot) {
      return {
        success: false,
        snapshotId,
        restoredState: { metadata: {}, specs: {} },
        message: `Snapshot ${snapshotId} not found`,
      };
    }

    console.log('[AureusGuard] Rolling back to snapshot:', snapshotId);

    this.setState('idle');

    return {
      success: true,
      snapshotId,
      restoredState: snapshot.state,
      message: `Successfully rolled back to snapshot ${snapshotId}`,
    };
  }

  getAuditLog(): AuditEvent[] {
    return [...this.auditLog];
  }

  getSnapshots(): Snapshot[] {
    return [...this.snapshots];
  }

  getSnapshot(snapshotId: string): Snapshot | undefined {
    return this.snapshots.find(s => s.id === snapshotId);
  }

  exportEvidence(outputDir: string): { path: string; data: unknown }[] {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const evidence = [
      {
        path: `${outputDir}/audit_log_${timestamp}.json`,
        data: {
          timestamp,
          environment: this.config.environment,
          events: this.auditLog,
          summary: {
            total: this.auditLog.length,
            success: this.auditLog.filter(e => e.decision.allow).length,
            blocked: this.auditLog.filter(e => !e.decision.allow && !e.decision.requiresApproval).length,
            requiresApproval: this.auditLog.filter(e => e.decision.requiresApproval).length,
          },
        },
      },
      {
        path: `${outputDir}/snapshots_${timestamp}.json`,
        data: {
          timestamp,
          environment: this.config.environment,
          snapshots: this.snapshots,
          summary: {
            total: this.snapshots.length,
            byAction: this.snapshots.reduce((acc, s) => {
              acc[s.action] = (acc[s.action] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          },
        },
      },
      {
        path: `${outputDir}/budget_usage_${timestamp}.json`,
        data: {
          timestamp,
          environment: this.config.environment,
          limits: this.config.budgetLimits,
          usage: this.budgetUsage,
          utilization: {
            tokens: `${((this.budgetUsage.tokensUsed / this.config.budgetLimits.tokenBudget) * 100).toFixed(2)}%`,
            queryCost: `${((this.budgetUsage.queryCostUsed / this.config.budgetLimits.queryCostBudget) * 100).toFixed(2)}%`,
          },
        },
      },
      {
        path: `${outputDir}/guard_summary_${timestamp}.json`,
        data: {
          timestamp,
          environment: this.config.environment,
          state: this.state,
          config: this.config,
          statistics: {
            auditEvents: this.auditLog.length,
            snapshots: this.snapshots.length,
            budgetUsage: this.budgetUsage,
          },
        },
      },
    ];

    console.log('[AureusGuard] Evidence exported:', evidence.map(e => e.path));
    return evidence;
  }
}
