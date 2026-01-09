import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalService, type ApprovalRequestInput } from '../approval-service';
import { AureusGuard } from '../aureus-guard';
import { PolicyEvaluator } from '../policy-evaluator';
import type { GuardConfig, ActionContext } from '../aureus-types';

describe('ApprovalService', () => {
  let approvalService: ApprovalService;
  let guard: AureusGuard;

  beforeEach(() => {
    const guardConfig: GuardConfig = {
      environment: 'prod',
      budgetLimits: {
        tokenBudget: 100000,
        queryCostBudget: 1000,
      },
      enableAudit: true,
      enableSnapshots: true,
    };

    const policyEvaluator = new PolicyEvaluator();
    guard = new AureusGuard(guardConfig, policyEvaluator);
    approvalService = new ApprovalService(guard, '/evidence/approval_runs');
  });

  describe('requestApproval', () => {
    it('should create approval object with status PENDING', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy credit risk pipeline to production',
        actionPayload: {
          pipelineName: 'credit_risk_agg',
          environment: 'prod',
        },
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {
            domain: 'credit_risk',
          },
        },
      };

      const approval = await approvalService.requestApproval(input);

      expect(approval.status).toBe('PENDING');
      expect(approval.id).toMatch(/^apr-/);
      expect(approval.requester).toBe('john.analyst');
      expect(approval.actionType).toBe('prod_deploy');
      expect(approval.evidencePackId).toMatch(/^evd-apr-/);
      expect(approval.auditEventIds).toHaveLength(1);
    });

    it('should mark prod deploy as high risk', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      expect(approval.riskLevel).toBe('high');
    });

    it('should mark policy change as high risk', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'policy_change',
        requester: 'admin.user',
        requesterRole: 'admin',
        description: 'Update PII access policy',
        actionPayload: {
          policyId: 'pol-001',
        },
        actionContext: {
          actionType: 'policy_update',
          actor: 'admin.user',
          role: 'admin',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      expect(approval.riskLevel).toBe('high');
    });

    it('should mark high PII access as high risk', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'pii_access_high',
        requester: 'analyst.user',
        requesterRole: 'analyst',
        description: 'Access high PII dataset',
        actionPayload: {
          datasetId: 'ds-001',
        },
        actionContext: {
          actionType: 'query_execute',
          actor: 'analyst.user',
          role: 'analyst',
          environment: 'prod',
          metadata: {
            piiLevel: 'high',
          },
        },
      };

      const approval = await approvalService.requestApproval(input);

      expect(approval.riskLevel).toBe('high');
    });

    it('should emit audit event on approval request', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      expect(approval.auditEventIds.length).toBeGreaterThan(0);
    });
  });

  describe('approveAndExecute', () => {
    it('should approve and execute pending approval with approver role', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {
          pipelineName: 'test_pipeline',
        },
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);
      expect(approval.status).toBe('PENDING');

      const result = await approvalService.approveAndExecute(
        approval.id,
        'jane.approver',
        'approver',
        'Approved after review'
      );

      expect(result.success).toBe(true);
      expect(result.approvalId).toBe(approval.id);
      expect(result.snapshotId).toMatch(/^snap-/);
      expect(result.auditEventId).toBeDefined();

      const updatedApproval = approvalService.getApproval(approval.id);
      expect(updatedApproval?.status).toBe('APPROVED');
      expect(updatedApproval?.approver).toBe('jane.approver');
      expect(updatedApproval?.approvalComment).toBe('Approved after review');
      expect(updatedApproval?.snapshotId).toBeDefined();
    });

    it('should approve and execute pending approval with admin role', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      const result = await approvalService.approveAndExecute(
        approval.id,
        'admin.user',
        'admin',
        'Admin approval'
      );

      expect(result.success).toBe(true);
      const updatedApproval = approvalService.getApproval(approval.id);
      expect(updatedApproval?.status).toBe('APPROVED');
    });

    it('should NOT allow approval without approver role', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      await expect(
        approvalService.approveAndExecute(
          approval.id,
          'another.analyst',
          'analyst',
          'Trying to approve'
        )
      ).rejects.toThrow("User role 'analyst' is not authorized to approve");

      const unchangedApproval = approvalService.getApproval(approval.id);
      expect(unchangedApproval?.status).toBe('PENDING');
    });

    it('should NOT allow approval without viewer role', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      await expect(
        approvalService.approveAndExecute(
          approval.id,
          'viewer.user',
          'viewer',
          'Trying to approve'
        )
      ).rejects.toThrow("User role 'viewer' is not authorized to approve");

      const unchangedApproval = approvalService.getApproval(approval.id);
      expect(unchangedApproval?.status).toBe('PENDING');
    });

    it('should NOT execute action without approval', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      expect(approval.status).toBe('PENDING');
      expect(approval.snapshotId).toBeUndefined();
    });

    it('should create snapshot before executing action', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {
          pipelineName: 'test_pipeline',
        },
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      const result = await approvalService.approveAndExecute(
        approval.id,
        'jane.approver',
        'approver'
      );

      expect(result.snapshotId).toBeDefined();
      expect(result.snapshotId).toMatch(/^snap-/);

      const updatedApproval = approvalService.getApproval(approval.id);
      expect(updatedApproval?.snapshotId).toBe(result.snapshotId);
    });

    it('should throw error if approval does not exist', async () => {
      await expect(
        approvalService.approveAndExecute(
          'nonexistent-id',
          'jane.approver',
          'approver'
        )
      ).rejects.toThrow('Approval nonexistent-id not found');
    });

    it('should throw error if approval is not pending', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      await approvalService.approveAndExecute(
        approval.id,
        'jane.approver',
        'approver'
      );

      await expect(
        approvalService.approveAndExecute(
          approval.id,
          'jane.approver',
          'approver'
        )
      ).rejects.toThrow(`Approval ${approval.id} is not pending (status: APPROVED)`);
    });

    it('should record multiple audit events (request + approval + execution)', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);
      expect(approval.auditEventIds).toHaveLength(1);

      await approvalService.approveAndExecute(
        approval.id,
        'jane.approver',
        'approver'
      );

      const updatedApproval = approvalService.getApproval(approval.id);
      expect(updatedApproval?.auditEventIds.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('reject', () => {
    it('should reject pending approval with approver role', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      await approvalService.reject(
        approval.id,
        'jane.approver',
        'approver',
        'Insufficient testing'
      );

      const updatedApproval = approvalService.getApproval(approval.id);
      expect(updatedApproval?.status).toBe('REJECTED');
      expect(updatedApproval?.approver).toBe('jane.approver');
      expect(updatedApproval?.approvalComment).toBe('Insufficient testing');
    });

    it('should NOT allow rejection without approver role', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);

      await expect(
        approvalService.reject(
          approval.id,
          'another.analyst',
          'analyst',
          'Trying to reject'
        )
      ).rejects.toThrow("User role 'analyst' is not authorized to reject");

      const unchangedApproval = approvalService.getApproval(approval.id);
      expect(unchangedApproval?.status).toBe('PENDING');
    });

    it('should emit audit event on rejection', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);
      const initialAuditCount = approval.auditEventIds.length;

      await approvalService.reject(
        approval.id,
        'jane.approver',
        'approver',
        'Not ready'
      );

      const updatedApproval = approvalService.getApproval(approval.id);
      expect(updatedApproval?.auditEventIds.length).toBeGreaterThan(initialAuditCount);
    });
  });

  describe('query methods', () => {
    it('should get approval by id', async () => {
      const input: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy to production',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval = await approvalService.requestApproval(input);
      const retrieved = approvalService.getApproval(approval.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(approval.id);
    });

    it('should return undefined for nonexistent approval', () => {
      const retrieved = approvalService.getApproval('nonexistent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should get all pending approvals', async () => {
      const input1: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy pipeline 1',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const input2: ApprovalRequestInput = {
        actionType: 'policy_change',
        requester: 'admin.user',
        requesterRole: 'admin',
        description: 'Update policy',
        actionPayload: {},
        actionContext: {
          actionType: 'policy_update',
          actor: 'admin.user',
          role: 'admin',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval1 = await approvalService.requestApproval(input1);
      const approval2 = await approvalService.requestApproval(input2);

      await approvalService.approveAndExecute(approval1.id, 'jane.approver', 'approver');

      const pending = approvalService.getPendingApprovals();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(approval2.id);
    });

    it('should get approvals by status', async () => {
      const input1: ApprovalRequestInput = {
        actionType: 'prod_deploy',
        requester: 'john.analyst',
        requesterRole: 'analyst',
        description: 'Deploy pipeline 1',
        actionPayload: {},
        actionContext: {
          actionType: 'pipeline_deploy',
          actor: 'john.analyst',
          role: 'analyst',
          environment: 'prod',
          metadata: {},
        },
      };

      const input2: ApprovalRequestInput = {
        actionType: 'policy_change',
        requester: 'admin.user',
        requesterRole: 'admin',
        description: 'Update policy',
        actionPayload: {},
        actionContext: {
          actionType: 'policy_update',
          actor: 'admin.user',
          role: 'admin',
          environment: 'prod',
          metadata: {},
        },
      };

      const approval1 = await approvalService.requestApproval(input1);
      const approval2 = await approvalService.requestApproval(input2);

      await approvalService.approveAndExecute(approval1.id, 'jane.approver', 'approver');
      await approvalService.reject(approval2.id, 'jane.approver', 'approver');

      const approved = approvalService.getApprovalsByStatus('APPROVED');
      const rejected = approvalService.getApprovalsByStatus('REJECTED');

      expect(approved).toHaveLength(1);
      expect(approved[0].id).toBe(approval1.id);

      expect(rejected).toHaveLength(1);
      expect(rejected[0].id).toBe(approval2.id);
    });
  });
});
