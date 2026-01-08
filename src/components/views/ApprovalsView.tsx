import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, FileText, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { ApprovalRequest } from '@/lib/types';
import { RiskLevelBadge, ApprovalStatusBadge } from '../badges/StatusBadges';

interface ApprovalsViewProps {
  approvals: ApprovalRequest[];
}

export function ApprovalsView({ approvals }: ApprovalsViewProps) {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  const handleApprove = () => {
    toast.success('Approval granted', {
      description: 'The requested action has been approved and will be executed.',
    });
    setSelectedApproval(null);
    setApprovalComment('');
  };

  const handleReject = () => {
    toast.error('Approval rejected', {
      description: 'The requested action has been rejected.',
    });
    setSelectedApproval(null);
    setApprovalComment('');
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const completedApprovals = approvals.filter(a => a.status !== 'pending');

  return (
    <div className="space-y-6">
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
                    <Badge variant="outline">{approval.type.replace('_', ' ').toUpperCase()}</Badge>
                    <ApprovalStatusBadge status={approval.status} />
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
                  </div>
                  <ApprovalStatusBadge status={approval.status} />
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
                    {Object.entries(selectedApproval.details).map(([key, value]) => (
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

                <div>
                  <div className="text-sm font-semibold mb-3">Evidence Pack</div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText weight="fill" className="h-4 w-4" />
                    View Complete Evidence Pack
                  </Button>
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
                <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleReject} className="gap-2">
                  <XCircle weight="fill" className="h-5 w-5" />
                  Reject
                </Button>
                <Button onClick={handleApprove} className="gap-2">
                  <CheckCircle weight="fill" className="h-5 w-5" />
                  Approve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
