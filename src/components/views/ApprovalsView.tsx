import { useState, useEffect, useMemo } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Warning, ShieldCheck, DownloadSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ApprovalService, type ApprovalObject, useApprovalQueueStore } from '@/lib/approval-service';
import { AureusGuard } from '@/lib/aureus-guard';
import { PolicyEvaluator } from '@/lib/policy-evaluator';
import { EvidenceKeys, downloadEvidenceBundle, getEvidenceBundle, verifyEvidenceBundle } from '@/lib/evidence-store';
import type { UserRole } from '@/lib/types';
import { RiskLevelBadge, ApprovalStatusBadge } from '../badges/StatusBadges';

type OriginatingAction = {
  type: 'query' | 'pipeline' | 'config';
  id: string;
  label?: string;
  stage?: string;
};

interface ApprovalsViewProps {
  onNavigateToAction?: (action: OriginatingAction) => void;
}

export function ApprovalsView({ onNavigateToAction }: ApprovalsViewProps) {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalObject | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useKV<UserRole>('user_role', 'analyst');
  const [approvalQueue, setApprovalQueue] = useApprovalQueueStore();
  const [evidenceVerification, setEvidenceVerification] = useState<null | {
    status: 'verified' | 'invalid';
    detail: string;
  }>(null);

  const approvalService = useMemo(() => {
    const guard = new AureusGuard(
      {
        environment: 'prod',
        budgetLimits: { tokenBudget: 100000, queryCostBudget: 1000 },
        enableAudit: true,
        enableSnapshots: true,
      },
      new PolicyEvaluator()
    );
    return new ApprovalService(guard);
  }, []);

  useEffect(() => {
    approvalService.syncApprovals(approvalQueue || []);
  }, [approvalQueue, approvalService]);

  useEffect(() => {
    setEvidenceVerification(null);
  }, [selectedApproval]);

  const handleDownloadEvidence = async (approval: ApprovalObject) => {
    const stage =
      approval.status === 'PENDING'
        ? 'request'
        : approval.status === 'APPROVED'
          ? 'approved_and_executed'
          : 'rejected';

    try {
      const evidenceKey = EvidenceKeys.approvalPack(approval.evidencePackId, stage);
      const bundle = await getEvidenceBundle(evidenceKey);

      if (!bundle) {
        toast.error('Evidence bundle not found in storage');
        return;
      }

      const verification = await verifyEvidenceBundle(bundle);
      const verified = verification.hashMatches && verification.signatureMatches;
      setEvidenceVerification({
        status: verified ? 'verified' : 'invalid',
        detail: verified ? 'Signature verified' : 'Signature mismatch detected',
      });

      if (!verified) {
        toast.error('Evidence verification failed. Downloading anyway.');
      }

      downloadEvidenceBundle(bundle, `approval-evidence-${approval.evidencePackId}-${stage}.json`);
      toast.success('Evidence bundle downloaded');
    } catch (error) {
      console.error('Failed to download evidence bundle', error);
      toast.error('Failed to download evidence bundle');
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;

    if (currentUserRole !== 'approver' && currentUserRole !== 'admin') {
      toast.error('Unauthorized', {
        description: `Your role '${currentUserRole}' cannot approve. Must be 'approver' or 'admin'.`,
      });
      return;
    }

    setIsProcessing(true);
    try {
      const approvalObj = approvalService.getApproval(selectedApproval.id);
      
      if (!approvalObj) {
        toast.error('Approval not found in service');
        setIsProcessing(false);
        return;
      }

      const result = await approvalService.approveAndExecute(
        selectedApproval.id,
        'current.user',
        currentUserRole,
        approvalComment || undefined
      );

      toast.success('Approval granted and action executed', {
        description: `Snapshot created: ${result.snapshotId}`,
        action: {
          label: 'View Evidence',
          onClick: () => console.log('Evidence pack:', result),
        },
      });

      setSelectedApproval(null);
      setApprovalComment('');
      
      const allApprovals = approvalService.getAllApprovals();
      setApprovalQueue(allApprovals);
    } catch (error) {
      toast.error('Approval failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;

    if (currentUserRole !== 'approver' && currentUserRole !== 'admin') {
      toast.error('Unauthorized', {
        description: `Your role '${currentUserRole}' cannot reject. Must be 'approver' or 'admin'.`,
      });
      return;
    }

    setIsProcessing(true);
    try {
      const approvalObj = approvalService.getApproval(selectedApproval.id);
      
      if (!approvalObj) {
        toast.error('Approval not found in service');
        setIsProcessing(false);
        return;
      }

      await approvalService.reject(
        selectedApproval.id,
        'current.user',
        currentUserRole,
        approvalComment || undefined
      );

      toast.error('Approval rejected', {
        description: 'The requested action has been rejected and will not be executed.',
      });

      setSelectedApproval(null);
      setApprovalComment('');
      
      const allApprovals = approvalService.getAllApprovals();
      setApprovalQueue(allApprovals);
    } catch (error) {
      toast.error('Rejection failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const approvals = approvalQueue || [];
  const pendingApprovals = approvals.filter((approval) => approval.status === 'PENDING');
  const completedApprovals = approvals.filter((approval) => approval.status !== 'PENDING');

  const getOriginatingAction = (approval: ApprovalObject): OriginatingAction | null => {
    const action = approval.actionContext?.metadata?.originatingAction;
    if (!action || typeof action !== 'object') {
      return null;
    }

    const { type, id, label, stage } = action as OriginatingAction;
    if (!type || !id) {
      return null;
    }

    return { type, id, label, stage };
  };

  const formatApprovalStatus = (status: ApprovalObject['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'approved' as const;
      case 'REJECTED':
        return 'rejected' as const;
      default:
        return 'pending' as const;
    }
  };

  const buildDetailEntries = (approval: ApprovalObject) => {
    const metadata = approval.actionContext?.metadata ?? {};
    return {
      approval_id: approval.id,
      action_type: approval.actionType,
      environment: approval.actionContext.environment,
      requester_role: approval.requesterRole,
      ...metadata,
      ...approval.actionPayload,
    } as Record<string, unknown>;
  };

  return (
    <div className="space-y-6">
      <Card className="border-accent/50 bg-accent/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck weight="fill" className="h-5 w-5 text-accent" />
              <div>
                <div className="font-semibold">Your Role: <span className="text-accent">{currentUserRole}</span></div>
                <div className="text-sm text-muted-foreground">
                  {currentUserRole === 'approver' || currentUserRole === 'admin' 
                    ? 'You can approve or reject pending requests'
                    : 'Only approver or admin roles can approve/reject requests'}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const roles: UserRole[] = ['analyst', 'approver', 'admin', 'viewer'];
                const currentIndex = roles.indexOf(currentUserRole || 'analyst');
                const nextRole = roles[(currentIndex + 1) % roles.length];
                setCurrentUserRole(nextRole);
                toast.info(`Role changed to: ${nextRole}`);
              }}
            >
              Switch Role (Demo)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle weight="fill" className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            Review and approve high-risk actions requiring governance oversight
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApprovals.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle weight="fill" className="h-12 w-12 mx-auto text-success mb-4" />
              <p className="text-muted-foreground">
                No pending approvals. All requests have been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="p-6 border rounded-lg hover:border-accent transition-colors cursor-pointer"
                  onClick={() => setSelectedApproval(approval)}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-lg mb-1">{approval.description}</div>
                      <div className="text-sm text-muted-foreground">
                        Requested by <span className="font-medium text-foreground">{approval.requester}</span>
                        {' • '}
                        {new Date(approval.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <RiskLevelBadge level={approval.riskLevel} />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Badge variant="outline">{approval.actionType.replace('_', ' ').toUpperCase()}</Badge>
                    <ApprovalStatusBadge status={formatApprovalStatus(approval.status)} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-accent"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDownloadEvidence(approval);
                      }}
                    >
                      Evidence pack
                    </Button>
                    {getOriginatingAction(approval) && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-accent"
                        onClick={(event) => {
                          event.stopPropagation();
                          onNavigateToAction?.(getOriginatingAction(approval)!);
                        }}
                      >
                        View originating action
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {completedApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Decisions</CardTitle>
            <CardDescription>
              Completed approval requests with audit trail
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-start justify-between gap-4 p-4 bg-muted rounded-md"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">{approval.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {approval.approver && `Decided by ${approval.approver} • `}
                      {approval.approvalTimestamp && new Date(approval.approvalTimestamp).toLocaleString()}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-accent"
                        onClick={() => void handleDownloadEvidence(approval)}
                      >
                        Evidence pack
                      </Button>
                      {getOriginatingAction(approval) && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-accent"
                          onClick={() => onNavigateToAction?.(getOriginatingAction(approval)!)}
                        >
                          View originating action
                        </Button>
                      )}
                    </div>
                  </div>
                  <ApprovalStatusBadge status={formatApprovalStatus(approval.status)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedApproval} onOpenChange={(open) => !open && setSelectedApproval(null)}>
        <DialogContent className="max-w-3xl">
          {selectedApproval && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3">
                  {selectedApproval.description}
                  <RiskLevelBadge level={selectedApproval.riskLevel} />
                </DialogTitle>
                <DialogDescription>
                  Requested by {selectedApproval.requester} on {new Date(selectedApproval.timestamp).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <Alert>
                  <Warning weight="fill" className="h-4 w-4" />
                  <AlertDescription>
                    This is a <strong>{selectedApproval.riskLevel}-risk</strong> action requiring approval.
                    Review all evidence before making a decision.
                  </AlertDescription>
                </Alert>

                <div>
                  <div className="text-sm font-semibold mb-3">Request Details</div>
                  <div className="space-y-2 text-sm">
                    {Object.entries(buildDetailEntries(selectedApproval)).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground min-w-[150px]">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </span>
                        <span className="font-medium">
                          {typeof value === 'boolean'
                            ? (value ? 'Yes' : 'No')
                            : typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-3">Evidence Pack</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => void handleDownloadEvidence(selectedApproval)}
                    >
                      <DownloadSimple weight="fill" className="h-4 w-4" />
                      Download Evidence Bundle
                    </Button>
                    {evidenceVerification && (
                      <Badge variant={evidenceVerification.status === 'verified' ? 'default' : 'destructive'}>
                        {evidenceVerification.detail}
                      </Badge>
                    )}
                  </div>
                </div>

                {getOriginatingAction(selectedApproval) && (
                  <div>
                    <div className="text-sm font-semibold mb-3">Originating Action</div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-accent"
                        onClick={() => onNavigateToAction?.(getOriginatingAction(selectedApproval)!)}
                      >
                        {getOriginatingAction(selectedApproval)?.label ||
                          `${getOriginatingAction(selectedApproval)?.type.toUpperCase()} ${getOriginatingAction(selectedApproval)?.id}`}
                      </Button>
                      {getOriginatingAction(selectedApproval)?.stage && (
                        <Badge variant="outline">
                          {getOriginatingAction(selectedApproval)?.stage}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="approval-comment" className="text-sm font-semibold block mb-2">
                    Approval Comment
                  </label>
                  <Textarea
                    id="approval-comment"
                    placeholder="Add a comment explaining your decision..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedApproval(null)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleReject} 
                  className="gap-2"
                  disabled={isProcessing || (currentUserRole !== 'approver' && currentUserRole !== 'admin')}
                >
                  <XCircle weight="fill" className="h-5 w-5" />
                  Reject
                </Button>
                <Button 
                  onClick={handleApprove} 
                  className="gap-2"
                  disabled={isProcessing || (currentUserRole !== 'approver' && currentUserRole !== 'admin')}
                >
                  <CheckCircle weight="fill" className="h-5 w-5" />
                  {isProcessing ? 'Processing...' : 'Approve'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
