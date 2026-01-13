import { useState, useEffect, useMemo, useRef } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Warning, ShieldCheck, DownloadSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ApprovalService, type ApprovalObject, useApprovalQueue } from '@/lib/approval-service';
import { AureusGuard } from '@/lib/aureus-guard';
import { PolicyEvaluator } from '@/lib/policy-evaluator';
import { EvidenceKeys, downloadEvidenceBundle, getEvidenceBundle, verifyEvidenceBundle } from '@/lib/evidence-store';
import type { UserRole } from '@/lib/types';
import { RiskLevelBadge, ApprovalStatusBadge } from '../badges/StatusBadges';

export function ApprovalsView() {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalObject | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useKV<UserRole>('user_role', 'analyst');
  const [approvalQueue, setApprovalQueue] = useApprovalQueue();
  const [evidenceVerification, setEvidenceVerification] = useState<null | {
    status: 'verified' | 'invalid';
    detail: string;
  }>(null);
  const payloadRef = useRef<HTMLDivElement | null>(null);
  const evidenceRef = useRef<HTMLDivElement | null>(null);
  const [scrollTarget, setScrollTarget] = useState<'payload' | 'evidence' | null>(null);

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
    approvalService.loadApprovals(approvalQueue || []);
  }, [approvalQueue, approvalService]);

  useEffect(() => {
    setEvidenceVerification(null);
  }, [selectedApproval]);

  useEffect(() => {
    if (!selectedApproval || !scrollTarget) return;
    const target = scrollTarget === 'payload' ? payloadRef.current : evidenceRef.current;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setScrollTarget(null);
  }, [selectedApproval, scrollTarget]);

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
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');
  const completedApprovals = approvals.filter(a => a.status !== 'PENDING');
  const approvalStatus = (status: ApprovalObject['status']) =>
    status === 'PENDING' ? 'pending' : status === 'APPROVED' ? 'approved' : 'rejected';

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
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedApproval(approval);
                            setScrollTarget('payload');
                          }}
                        >
                          View Action Payload
                        </Button>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDownloadEvidence(approval);
                          }}
                        >
                          Download Evidence Pack
                        </Button>
                      </div>
                    </div>
                    <RiskLevelBadge level={approval.riskLevel} />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Badge variant="outline">{approval.actionType.replace('_', ' ').toUpperCase()}</Badge>
                    <ApprovalStatusBadge status={approvalStatus(approval.status)} />
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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setSelectedApproval(approval);
                          setScrollTarget('payload');
                        }}
                      >
                        View Action Payload
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleDownloadEvidence(approval)}
                      >
                        Download Evidence Pack
                      </Button>
                    </div>
                  </div>
                  <ApprovalStatusBadge status={approvalStatus(approval.status)} />
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
                    {Object.entries(selectedApproval.actionContext.metadata || {}).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground min-w-[150px]">
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </span>
                        <span className="font-medium">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div ref={evidenceRef}>
                  <div className="text-sm font-semibold mb-3">Evidence Pack</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleDownloadEvidence(selectedApproval)}>
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

                <div ref={payloadRef}>
                  <div className="text-sm font-semibold mb-3">Action Payload</div>
                  <div className="rounded-md border bg-muted/30 p-4 text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedApproval.actionPayload, null, 2)}
                  </div>
                </div>

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
