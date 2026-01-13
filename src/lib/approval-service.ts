import { useKV } from '@github/spark/hooks';
import { AureusGuard } from './aureus-guard';
import { PolicyEvaluator } from './policy-evaluator';
import type { UserRole } from './types';
import type { ActionContext, AuditEvent, Snapshot, Environment } from './aureus-types';
import { EvidenceKeys, storeEvidenceBundle, type ApprovalEvidenceStage } from './evidence-store';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ApprovalActionType = 
  | 'prod_deploy' 
  | 'policy_change' 
  | 'pii_access_high';

const APPROVAL_QUEUE_KEY = 'approval_queue';

const canUseKV = () => typeof window !== 'undefined' && !!window.spark?.kv;

const readApprovalQueue = async (): Promise<ApprovalObject[]> => {
  if (!canUseKV()) return [];
  return (await window.spark.kv.get<ApprovalObject[]>(APPROVAL_QUEUE_KEY)) || [];
};

const writeApprovalQueue = async (approvals: ApprovalObject[]): Promise<void> => {
  if (!canUseKV()) return;
  await window.spark.kv.set(APPROVAL_QUEUE_KEY, approvals);
};

const upsertApprovalQueue = async (approval: ApprovalObject): Promise<void> => {
  const approvals = await readApprovalQueue();
  const existingIndex = approvals.findIndex(item => item.id === approval.id);
  const nextApprovals =
    existingIndex >= 0
      ? approvals.map(item => (item.id === approval.id ? approval : item))
      : [approval, ...approvals];
  await writeApprovalQueue(nextApprovals);
};

export const useApprovalQueue = () => useKV<ApprovalObject[]>(APPROVAL_QUEUE_KEY, []);

export interface ApprovalObject {
  id: string;
  status: ApprovalStatus;
  actionType: ApprovalActionType;
  requester: string;
  requesterRole: UserRole;
  timestamp: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  actionPayload: Record<string, unknown>;
  actionContext: ActionContext;
  evidencePackId: string;
  approver?: string;
  approverRole?: UserRole;
  approvalTimestamp?: string;
  approvalComment?: string;
  snapshotId?: string;
  auditEventIds: string[];
}

export interface ApprovalRequestInput {
  actionType: ApprovalActionType;
  requester: string;
  requesterRole: UserRole;
  description: string;
  actionPayload: Record<string, unknown>;
  actionContext: ActionContext;
}

export interface ApprovalExecutionResult {
  success: boolean;
  approvalId: string;
  snapshotId: string;
  auditEventId: string;
  executedAction: Record<string, unknown>;
  error?: string;
}

export class ApprovalService {
  private approvals: Map<string, ApprovalObject> = new Map();
  private guard: AureusGuard;
  private policyEvaluator: PolicyEvaluator;
  private evidenceDir: string;

  constructor(guard: AureusGuard, evidenceDir: string = '/evidence/approval_runs') {
    this.guard = guard;
    this.policyEvaluator = new PolicyEvaluator();
    this.evidenceDir = evidenceDir;
  }

  private generateId(): string {
    return `apr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEvidencePackId(): string {
    return `evd-apr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  isHighRiskAction(actionType: ApprovalActionType, context: ActionContext): boolean {
    if (actionType === 'prod_deploy' && context.environment === 'prod') {
      return true;
    }
    if (actionType === 'policy_change') {
      return true;
    }
    if (actionType === 'pii_access_high' && context.metadata.piiLevel === 'high') {
      return true;
    }
    return false;
  }

  async requestApproval(input: ApprovalRequestInput): Promise<ApprovalObject> {
    const approvalId = this.generateId();
    const evidencePackId = this.generateEvidencePackId();
    const timestamp = new Date().toISOString();

    const isHighRisk = this.isHighRiskAction(input.actionType, input.actionContext);
    const riskLevel: 'low' | 'medium' | 'high' = isHighRisk ? 'high' : 'medium';

    const auditContext: ActionContext = {
      actionType: 'approval_request',
      actor: input.requester,
      role: input.requesterRole,
      environment: input.actionContext.environment,
      metadata: {
        approvalId,
        originalActionType: input.actionType,
        riskLevel,
        ...input.actionContext.metadata,
      },
    };

    const policyCheck = await this.guard.checkPolicy(auditContext);

    const auditEvent = await this.guard.execute({
      context: auditContext,
      payload: {
        approvalId,
        description: input.description,
        actionPayload: input.actionPayload,
      },
    });

    const approval: ApprovalObject = {
      id: approvalId,
      status: 'PENDING',
      actionType: input.actionType,
      requester: input.requester,
      requesterRole: input.requesterRole,
      timestamp,
      description: input.description,
      riskLevel,
      actionPayload: input.actionPayload,
      actionContext: input.actionContext,
      evidencePackId,
      auditEventIds: [auditEvent.auditEventId],
    };

    this.approvals.set(approvalId, approval);
    await upsertApprovalQueue(approval);

    await this.writeEvidencePack(approval, 'request');

    console.log(`[ApprovalService] Created approval request ${approvalId} - ${input.description}`);

    return approval;
  }

  async approveAndExecute(
    approvalId: string,
    approver: string,
    approverRole: UserRole,
    comment?: string
  ): Promise<ApprovalExecutionResult> {
    const approval = this.approvals.get(approvalId);

    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    if (approval.status !== 'PENDING') {
      throw new Error(`Approval ${approvalId} is not pending (status: ${approval.status})`);
    }

    if (approverRole !== 'approver' && approverRole !== 'admin') {
      throw new Error(`User role '${approverRole}' is not authorized to approve. Must be 'approver' or 'admin'.`);
    }

    approval.status = 'APPROVED';
    approval.approver = approver;
    approval.approverRole = approverRole;
    approval.approvalTimestamp = new Date().toISOString();
    approval.approvalComment = comment;

    const approvalAuditContext: ActionContext = {
      actionType: 'approval_grant',
      actor: approver,
      role: approverRole,
      environment: approval.actionContext.environment,
      metadata: {
        approvalId,
        originalActionType: approval.actionType,
        requester: approval.requester,
      },
    };

    const approvalAuditEvent = await this.guard.execute({
      context: approvalAuditContext,
      payload: {
        approvalId,
        comment,
      },
    });

    approval.auditEventIds.push(approvalAuditEvent.auditEventId);

    const snapshotBeforeExecution = await this.createSnapshot(approval);
    approval.snapshotId = snapshotBeforeExecution.id;

    const executionResult = await this.executeApprovedAction(approval);

    await this.writeEvidencePack(approval, 'approved_and_executed', executionResult);

    console.log(`[ApprovalService] Approved and executed ${approvalId} by ${approver}`);
    await upsertApprovalQueue(approval);

    return {
      success: true,
      approvalId,
      snapshotId: snapshotBeforeExecution.id,
      auditEventId: approvalAuditEvent.auditEventId,
      executedAction: executionResult,
    };
  }

  async reject(
    approvalId: string,
    approver: string,
    approverRole: UserRole,
    comment?: string
  ): Promise<void> {
    const approval = this.approvals.get(approvalId);

    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    if (approval.status !== 'PENDING') {
      throw new Error(`Approval ${approvalId} is not pending (status: ${approval.status})`);
    }

    if (approverRole !== 'approver' && approverRole !== 'admin') {
      throw new Error(`User role '${approverRole}' is not authorized to reject. Must be 'approver' or 'admin'.`);
    }

    approval.status = 'REJECTED';
    approval.approver = approver;
    approval.approverRole = approverRole;
    approval.approvalTimestamp = new Date().toISOString();
    approval.approvalComment = comment;

    const rejectionAuditContext: ActionContext = {
      actionType: 'approval_grant',
      actor: approver,
      role: approverRole,
      environment: approval.actionContext.environment,
      metadata: {
        approvalId,
        decision: 'REJECTED',
        originalActionType: approval.actionType,
        requester: approval.requester,
      },
    };

    const rejectionAuditEvent = await this.guard.execute({
      context: rejectionAuditContext,
      payload: {
        approvalId,
        decision: 'REJECTED',
        comment,
      },
    });

    approval.auditEventIds.push(rejectionAuditEvent.auditEventId);
    await upsertApprovalQueue(approval);

    await this.writeEvidencePack(approval, 'rejected');

    console.log(`[ApprovalService] Rejected ${approvalId} by ${approver}`);
  }

  private async executeApprovedAction(approval: ApprovalObject): Promise<Record<string, unknown>> {
    console.log(`[ApprovalService] Executing approved action: ${approval.actionType}`);

    const executionContext: ActionContext = {
      ...approval.actionContext,
      metadata: {
        ...approval.actionContext.metadata,
        approvalId: approval.id,
        approvedBy: approval.approver,
      },
    };

    const executionResult = await this.guard.execute({
      context: executionContext,
      payload: approval.actionPayload,
    });

    approval.auditEventIds.push(executionResult.auditEventId);

    return {
      executionResult,
      timestamp: new Date().toISOString(),
      actionType: approval.actionType,
      payload: approval.actionPayload,
    };
  }

  private async createSnapshot(approval: ApprovalObject): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      actor: approval.approver!,
      action: approval.actionContext.actionType,
      environment: approval.actionContext.environment,
      state: {
        metadata: {
          approvalId: approval.id,
          actionType: approval.actionType,
          requester: approval.requester,
        },
        specs: approval.actionPayload,
      },
    };

    console.log(`[ApprovalService] Created snapshot ${snapshot.id} before executing approval ${approval.id}`);

    return snapshot;
  }

  private async writeEvidencePack(
    approval: ApprovalObject,
    stage: ApprovalEvidenceStage,
    executionResult?: Record<string, unknown>
  ): Promise<void> {
    const evidencePack = {
      approvalId: approval.id,
      evidencePackId: approval.evidencePackId,
      stage,
      timestamp: new Date().toISOString(),
      approval: {
        id: approval.id,
        status: approval.status,
        actionType: approval.actionType,
        requester: approval.requester,
        requesterRole: approval.requesterRole,
        description: approval.description,
        riskLevel: approval.riskLevel,
        requestedAt: approval.timestamp,
        approver: approval.approver,
        approverRole: approval.approverRole,
        approvalTimestamp: approval.approvalTimestamp,
        approvalComment: approval.approvalComment,
        snapshotId: approval.snapshotId,
      },
      actionContext: approval.actionContext,
      actionPayload: approval.actionPayload,
      auditEventIds: approval.auditEventIds,
      executionResult,
    };

    const evidenceKey = EvidenceKeys.approvalPack(approval.evidencePackId, stage);
    await storeEvidenceBundle(evidenceKey, evidencePack);

    console.log(`[ApprovalService] Evidence pack written: ${this.evidenceDir}/${approval.id}_${stage}.json`);
    console.log(`[ApprovalService] Evidence bundle stored: ${evidenceKey}`);
    console.log(JSON.stringify(evidencePack, null, 2));
  }

  getApproval(approvalId: string): ApprovalObject | undefined {
    return this.approvals.get(approvalId);
  }

  getAllApprovals(): ApprovalObject[] {
    return Array.from(this.approvals.values());
  }

  getPendingApprovals(): ApprovalObject[] {
    return this.getAllApprovals().filter(a => a.status === 'PENDING');
  }

  getApprovalsByStatus(status: ApprovalStatus): ApprovalObject[] {
    return this.getAllApprovals().filter(a => a.status === status);
  }

  clearApprovals(): void {
    this.approvals.clear();
    void writeApprovalQueue([]);
  }

  loadApprovals(approvals: ApprovalObject[]): void {
    this.approvals = new Map(approvals.map(approval => [approval.id, approval]));
  }
}
