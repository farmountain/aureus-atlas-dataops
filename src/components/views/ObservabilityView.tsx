import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChartLineUp, 
  CurrencyDollar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ShieldSlash,
  ArrowClockwise,
  Gear 
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { 
  observabilityService, 
  useObservabilityMetrics, 
  useObservabilityBudget,
  type MetricRecord,
  type MetricsSummary,
  type BudgetConfig
} from '@/lib/observability';

export function ObservabilityView() {
  const metrics = useObservabilityMetrics();
  const [budget, setBudget] = useObservabilityBudget();
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editedBudget, setEditedBudget] = useState<BudgetConfig>(budget);

  useEffect(() => {
    loadSummary();
    loadAuditLogs();
  }, [metrics]);

  const loadSummary = async () => {
    const s = await observabilityService.getMetricsSummary();
    setSummary(s);
  };

  const loadAuditLogs = async () => {
    const logs = await observabilityService.getAuditLogs(50);
    setAuditLogs(logs);
  };

  const handleSaveBudget = async () => {
    setIsLoading(true);
    try {
      await observabilityService.setBudget(editedBudget);
      setBudget((prev) => ({ ...prev, ...editedBudget }));
      toast.success('Budget settings saved', {
        description: 'Budget limits have been updated and audit logged.',
      });
    } catch (error) {
      toast.error('Failed to save budget', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetMetrics = async () => {
    if (!confirm('Are you sure you want to reset all metrics? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await observabilityService.resetMetrics();
      toast.success('Metrics reset', {
        description: 'All metrics have been cleared and audit logged.',
      });
      loadSummary();
    } catch (error) {
      toast.error('Failed to reset metrics', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const getStatusBadge = (status: MetricRecord['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success text-success-foreground">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'blocked':
        return <Badge className="bg-warning text-warning-foreground">Blocked</Badge>;
    }
  };

  const getOperationBadge = (op: MetricRecord['operation']) => {
    const labels = {
      query: 'Query',
      config_copilot: 'Config',
      pipeline: 'Pipeline',
      approval: 'Approval',
    };
    return <Badge variant="outline">{labels[op]}</Badge>;
  };

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading observability data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Observability & Cost Controls</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track token usage, cost estimates, latency, errors, and budget enforcement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ChartLineUp weight="fill" className="h-4 w-4 text-accent" />
              Total Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.totalTokensUsed.toLocaleString()}</div>
            <Progress 
              value={summary.budgetUtilization.tokenPercent} 
              className="mt-2 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {summary.budgetUtilization.tokenPercent.toFixed(1)}% of {budget.tokenBudget.toLocaleString()} limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CurrencyDollar weight="fill" className="h-4 w-4 text-success" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatCost(summary.totalCostEstimate)}</div>
            <Progress 
              value={summary.budgetUtilization.costPercent} 
              className="mt-2 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {summary.budgetUtilization.costPercent.toFixed(1)}% of ${budget.costBudget} limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock weight="fill" className="h-4 w-4 text-info" />
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{Math.round(summary.avgLatencyMs)}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {summary.totalRequests} requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle weight="fill" className="h-4 w-4 text-success" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{(summary.successRate * 100).toFixed(1)}%</div>
            <div className="flex gap-2 mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3 w-3" /> {summary.errorCount} errors
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldSlash className="h-3 w-3" /> {summary.blockedCount} blocked
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {(summary.budgetUtilization.tokenPercent > 80 || summary.budgetUtilization.costPercent > 80) && (
        <Alert className="border-warning bg-warning/10">
          <AlertDescription className="flex items-center gap-2">
            <ShieldSlash className="h-4 w-4 text-warning" />
            <span>
              Warning: Budget utilization is high. 
              {summary.budgetUtilization.tokenPercent >= 100 || summary.budgetUtilization.costPercent >= 100
                ? ' Budget exceeded - new operations will be blocked.'
                : ' Consider adjusting budget limits or reducing usage.'}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">Recent Metrics</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="settings">Budget Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
              <CardDescription>Last {Math.min(metrics.length, 50)} operations with token usage and latency</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No metrics recorded yet. Metrics will appear here as you use the platform.
                </p>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Latency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.slice(0, 50).map((metric) => (
                        <TableRow key={metric.id}>
                          <TableCell className="font-mono text-xs">
                            {formatTimestamp(metric.timestamp)}
                          </TableCell>
                          <TableCell>{getOperationBadge(metric.operation)}</TableCell>
                          <TableCell>{getStatusBadge(metric.status)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {metric.tokenUsageEstimated.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCost(metric.queryCostEstimate)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {Math.round(metric.latencyMs)}ms
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>All observability events and budget changes</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No audit logs yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs.map((log, idx) => (
                    <div key={idx} className="border rounded-md p-3 bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="font-mono text-xs text-muted-foreground">
                          {formatTimestamp((log.timestamp as number) || 0)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {(log.event as string) || 'unknown'}
                        </Badge>
                      </div>
                      <pre className="mt-2 text-xs bg-background p-2 rounded overflow-x-auto">
                        {JSON.stringify(log, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gear weight="fill" className="h-5 w-5" />
                Budget Configuration
              </CardTitle>
              <CardDescription>
                Set token and cost budgets. Operations will be blocked when limits are exceeded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token-budget">Token Budget</Label>
                  <Input
                    id="token-budget"
                    type="number"
                    value={editedBudget.tokenBudget}
                    onChange={(e) => setEditedBudget({ ...editedBudget, tokenBudget: parseInt(e.target.value) || 0 })}
                    placeholder="1000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum tokens allowed per budget period
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost-budget">Cost Budget (USD)</Label>
                  <Input
                    id="cost-budget"
                    type="number"
                    step="0.01"
                    value={editedBudget.costBudget}
                    onChange={(e) => setEditedBudget({ ...editedBudget, costBudget: parseFloat(e.target.value) || 0 })}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum cost allowed per budget period
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period-hours">Budget Period (hours)</Label>
                  <Input
                    id="period-hours"
                    type="number"
                    value={editedBudget.periodMs / (60 * 60 * 1000)}
                    onChange={(e) => setEditedBudget({ 
                      ...editedBudget, 
                      periodMs: (parseInt(e.target.value) || 24) * 60 * 60 * 1000 
                    })}
                    placeholder="24"
                  />
                  <p className="text-xs text-muted-foreground">
                    Budget resets after this time period (24 hours = daily budget)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSaveBudget} 
                  disabled={isLoading}
                  className="gap-2"
                >
                  <CheckCircle weight="fill" className="h-4 w-4" />
                  Save Budget Settings
                </Button>
                <Button 
                  onClick={handleResetMetrics} 
                  variant="destructive"
                  disabled={isLoading}
                  className="gap-2"
                >
                  <ArrowClockwise weight="fill" className="h-4 w-4" />
                  Reset All Metrics
                </Button>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> Budget changes are audit logged. When budgets are exceeded, 
                  all operations will be blocked and an audit event will be emitted. Metrics track 
                  token usage estimates based on character count (1 token ≈ 4 characters) and use 
                  a simple cost heuristic ($0.00001 per token).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
