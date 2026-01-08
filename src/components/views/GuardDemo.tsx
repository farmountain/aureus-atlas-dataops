import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AureusGuard } from '@/lib/aureus-guard';
import { Shield, Play, ArrowCounterClockwise, CheckCircle, XCircle, Warning } from '@phosphor-icons/react';
import type { ActionContext, GuardConfig, AuditEvent, Snapshot } from '@/lib/aureus-types';
import type { UserRole } from '@/lib/types';

const GUARD_CONFIG: GuardConfig = {
  environment: 'dev',
  budgetLimits: {
    tokenBudget: 10000,
    queryCostBudget: 100,
  },
  enableAudit: true,
  enableSnapshots: true,
};

export function GuardDemo() {
  const [guard] = useState(() => new AureusGuard(GUARD_CONFIG));
  const [selectedAction, setSelectedAction] = useState<ActionContext['actionType']>('query_execute');
  const [selectedRole, setSelectedRole] = useState<UserRole>('analyst');
  const [selectedEnv, setSelectedEnv] = useState<'dev' | 'uat' | 'prod'>('dev');
  const [piiLevel, setPiiLevel] = useState<'none' | 'low' | 'high'>('none');
  const [jurisdiction, setJurisdiction] = useState<'US' | 'EU' | 'multi'>('US');
  const [lastResult, setLastResult] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const handleExecute = async () => {
    const context: ActionContext = {
      actionType: selectedAction,
      actor: `test-${selectedRole}`,
      role: selectedRole,
      environment: selectedEnv,
      metadata: {
        piiLevel,
        jurisdiction,
        tokenCostEstimate: 500,
        queryCostEstimate: 5,
      },
    };

    const result = await guard.execute({
      context,
      payload: {
        action: selectedAction,
        timestamp: new Date().toISOString(),
      },
    });

    setLastResult(result);
    setAuditLog(guard.getAuditLog());
    setSnapshots(guard.getSnapshots());

    if (result.success) {
      const evidenceDir = '/evidence/guard_smoke_run';
      const evidence = guard.exportEvidence(evidenceDir);
      console.log('[GuardDemo] Evidence exported:', evidence);
      
      evidence.forEach(e => {
        console.log(`[Evidence] ${e.path}:`, JSON.stringify(e.data, null, 2));
      });
    }
  };

  const handleRollback = async () => {
    if (snapshots.length === 0) return;

    const latestSnapshot = snapshots[snapshots.length - 1];
    const result = await guard.rollback(latestSnapshot.id);
    
    setLastResult({ ...result, type: 'rollback' });
    console.log('[GuardDemo] Rollback result:', result);
  };

  const budgetUsage = guard.getBudgetUsage();
  const budgetUtilization = {
    tokens: ((budgetUsage.tokensUsed / GUARD_CONFIG.budgetLimits.tokenBudget) * 100).toFixed(1),
    queryCost: ((budgetUsage.queryCostUsed / GUARD_CONFIG.budgetLimits.queryCostBudget) * 100).toFixed(1),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-foreground tracking-tight">
          AUREUS Guard Runtime
        </h2>
        <p className="text-muted-foreground mt-2">
          Test the Goal-Guard FSM, policy evaluation, audit logging, and snapshot/rollback system
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Action Configuration
            </CardTitle>
            <CardDescription>
              Configure an action to test against the guard policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Type</label>
                <Select value={selectedAction} onValueChange={(v: any) => setSelectedAction(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="query_execute">Query Execute</SelectItem>
                    <SelectItem value="dataset_create">Dataset Create</SelectItem>
                    <SelectItem value="dataset_update">Dataset Update</SelectItem>
                    <SelectItem value="dataset_delete">Dataset Delete</SelectItem>
                    <SelectItem value="pipeline_deploy">Pipeline Deploy</SelectItem>
                    <SelectItem value="policy_update">Policy Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">User Role</label>
                <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="approver">Approver</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <Select value={selectedEnv} onValueChange={(v: any) => setSelectedEnv(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="uat">UAT</SelectItem>
                    <SelectItem value="prod">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">PII Level</label>
                <Select value={piiLevel} onValueChange={(v: any) => setPiiLevel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jurisdiction</label>
                <Select value={jurisdiction} onValueChange={(v: any) => setJurisdiction(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="EU">EU</SelectItem>
                    <SelectItem value="multi">Multi-Jurisdiction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex gap-3">
              <Button onClick={handleExecute} className="gap-2">
                <Play weight="fill" className="h-4 w-4" />
                Execute Action
              </Button>
              <Button 
                onClick={handleRollback} 
                variant="outline" 
                disabled={snapshots.length === 0}
                className="gap-2"
              >
                <ArrowCounterClockwise className="h-4 w-4" />
                Rollback to Last Snapshot
              </Button>
            </div>

            {lastResult && (
              <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center gap-2">
                  {lastResult.type === 'rollback' ? (
                    <ArrowCounterClockwise className="h-5 w-5 text-info" />
                  ) : lastResult.success ? (
                    <CheckCircle weight="fill" className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle weight="fill" className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-semibold">
                    {lastResult.type === 'rollback' 
                      ? 'Rollback Result'
                      : lastResult.success 
                        ? 'Action Executed Successfully' 
                        : 'Action Blocked'}
                  </span>
                </div>
                {lastResult.error && (
                  <p className="text-sm text-destructive">{lastResult.error}</p>
                )}
                {lastResult.message && (
                  <p className="text-sm text-muted-foreground">{lastResult.message}</p>
                )}
                <div className="text-xs font-mono text-muted-foreground space-y-1">
                  {lastResult.auditEventId && (
                    <div>Audit Event: {lastResult.auditEventId}</div>
                  )}
                  {lastResult.snapshotId && (
                    <div>Snapshot: {lastResult.snapshotId}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Token Usage</span>
                  <span className="font-semibold">{budgetUtilization.tokens}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all"
                    style={{ width: `${budgetUtilization.tokens}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {budgetUsage.tokensUsed} / {GUARD_CONFIG.budgetLimits.tokenBudget}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Query Cost</span>
                  <span className="font-semibold">{budgetUtilization.queryCost}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all"
                    style={{ width: `${budgetUtilization.queryCost}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {budgetUsage.queryCostUsed} / {GUARD_CONFIG.budgetLimits.queryCostBudget}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>FSM State</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-base px-4 py-2">
                {guard.getState()}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Audit Log ({auditLog.length})</CardTitle>
            <CardDescription>
              All actions are logged with policy decisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit events yet</p>
              ) : (
                auditLog.slice().reverse().map((event) => (
                  <div key={event.id} className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{event.action}</span>
                      <Badge variant={event.decision.allow ? 'default' : 'destructive'}>
                        {event.decision.allow ? 'Allowed' : event.decision.requiresApproval ? 'Approval Required' : 'Blocked'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.actor} • {event.role} • {event.environment}
                    </div>
                    <div className="text-xs">{event.decision.reason}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Snapshots ({snapshots.length})</CardTitle>
            <CardDescription>
              State snapshots for rollback capability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {snapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No snapshots yet</p>
              ) : (
                snapshots.slice().reverse().map((snapshot) => (
                  <div key={snapshot.id} className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{snapshot.action}</span>
                      <Badge variant="outline">{snapshot.environment}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {snapshot.actor} • {new Date(snapshot.timestamp).toLocaleString()}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">
                      ID: {snapshot.id.substring(0, 16)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
