import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GitBranch, Plus, CheckCircle, Warning, Code, TestTube, ArrowRight, DownloadSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { Dataset, PipelineSpec, UserRole } from '@/lib/types';
import { PipelineService } from '@/lib/pipeline-service';
import { AureusGuard } from '@/lib/aureus-guard';
import { PolicyEvaluator } from '@/lib/policy-evaluator';
import type { GuardConfig } from '@/lib/aureus-types';
import { EvidenceKeys, downloadEvidenceBundle, getEvidenceBundle, verifyEvidenceBundle } from '@/lib/evidence-store';

interface PipelinesViewProps {
  datasets: Dataset[];
  pipelines: PipelineSpec[];
  setPipelines: (setter: (prev: PipelineSpec[]) => PipelineSpec[]) => void;
}

type DeploymentStage = 'dev' | 'uat' | 'prod';

export function PipelinesView({ datasets, pipelines, setPipelines }: PipelinesViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceDatasetIds, setSourceDatasetIds] = useState<string[]>([]);
  const [targetDatasetName, setTargetDatasetName] = useState('');
  const [transformRules, setTransformRules] = useState('');
  const [domain, setDomain] = useState('credit_risk');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPipeline, setGeneratedPipeline] = useState<any>(null);
  const [deployStage, setDeployStage] = useState<DeploymentStage>('dev');
  const [isDeploying, setIsDeploying] = useState(false);
  const [evidenceVerification, setEvidenceVerification] = useState<Record<string, {
    status: 'verified' | 'invalid';
    detail: string;
  }>>({});

  const handleGeneratePipeline = async () => {
    if (!name || !description || sourceDatasetIds.length === 0 || !targetDatasetName || !transformRules) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);

    try {
      const guardConfig: GuardConfig = {
        environment: 'dev',
        budgetLimits: {
          tokenBudget: 10000,
          queryCostBudget: 5000,
        },
        enableAudit: true,
        enableSnapshots: true,
      };

      const guard = new AureusGuard(guardConfig, new PolicyEvaluator());
      const pipelineService = new PipelineService(guard, datasets);

      const result = await pipelineService.generatePipeline({
        name,
        description,
        sourceDatasetIds,
        targetDatasetName,
        transformRules,
        domain,
        actor: 'analyst@bank.com',
        role: 'analyst' as UserRole,
      });

      setGeneratedPipeline(result);
      toast.success('Pipeline generated successfully!');
    } catch (error) {
      toast.error('Failed to generate pipeline: ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeployPipeline = async () => {
    if (!generatedPipeline) return;

    setIsDeploying(true);

    try {
      const guardConfig: GuardConfig = {
        environment: deployStage,
        budgetLimits: {
          tokenBudget: 10000,
          queryCostBudget: 5000,
        },
        enableAudit: true,
        enableSnapshots: true,
      };

      const guard = new AureusGuard(guardConfig, new PolicyEvaluator());
      const pipelineService = new PipelineService(guard, datasets);

      const result = await pipelineService.deployPipeline(
        {
          pipelineId: `pipeline-${Date.now()}`,
          stage: deployStage,
          actor: 'analyst@bank.com',
          role: 'analyst' as UserRole,
        },
        generatedPipeline
      );

      if (result.requiresApproval) {
        toast.warning('Deployment to prod requires approval', {
          description: result.error,
        });
      } else if (result.success) {
        const deployedAt = new Date().toISOString();
        setPipelines((prev) => [
          ...prev,
          {
            ...generatedPipeline.spec,
            evidencePackId: result.evidencePackId,
            deployedAt,
            deployedStage: deployStage,
          },
        ]);
        toast.success(`Pipeline deployed to ${deployStage}!`, {
          description: `Snapshot ID: ${result.snapshotId?.substring(0, 16)}...`,
        });
        setDialogOpen(false);
        resetForm();
      } else {
        toast.error('Deployment failed: ' + result.error);
      }
    } catch (error) {
      toast.error('Deployment error: ' + (error as Error).message);
    } finally {
      setIsDeploying(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSourceDatasetIds([]);
    setTargetDatasetName('');
    setTransformRules('');
    setDomain('credit_risk');
    setGeneratedPipeline(null);
    setDeployStage('dev');
  };

  const toggleSourceDataset = (datasetId: string) => {
    setSourceDatasetIds((prev) =>
      prev.includes(datasetId)
        ? prev.filter((id) => id !== datasetId)
        : [...prev, datasetId]
    );
  };

  const handleDownloadEvidence = async (evidencePackId?: string) => {
    if (!evidencePackId) {
      toast.error('No evidence pack available for this pipeline');
      return;
    }

    try {
      const evidenceKey = EvidenceKeys.pipelinePack(evidencePackId);
      const bundle = await getEvidenceBundle(evidenceKey);

      if (!bundle) {
        toast.error('Evidence bundle not found in storage');
        return;
      }

      const verification = await verifyEvidenceBundle(bundle);
      const verified = verification.hashMatches && verification.signatureMatches;

      setEvidenceVerification((prev) => ({
        ...prev,
        [evidencePackId]: {
          status: verified ? 'verified' : 'invalid',
          detail: verified ? 'Signature verified' : 'Signature mismatch detected',
        },
      }));

      if (!verified) {
        toast.error('Evidence verification failed. Downloading anyway.');
      }

      downloadEvidenceBundle(bundle, `pipeline-evidence-${evidencePackId}.json`);
      toast.success('Evidence bundle downloaded');
    } catch (error) {
      console.error('Failed to download evidence bundle', error);
      toast.error('Failed to download evidence bundle');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch weight="fill" className="h-5 w-5" />
                Data Pipelines
              </CardTitle>
              <CardDescription>
                Generate and manage governed data transformation pipelines
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus weight="bold" className="h-5 w-5" />
                  Create Pipeline
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Data Pipeline</DialogTitle>
                  <DialogDescription>
                    Generate governed SQL transformations with auto-generated tests and DQ checks
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="pipeline-name">Pipeline Name *</Label>
                    <Input
                      id="pipeline-name"
                      placeholder="e.g., customer_transaction_summary"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pipeline-description">Description *</Label>
                    <Textarea
                      id="pipeline-description"
                      placeholder="Describe what this pipeline does..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Source Datasets *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {datasets.map((dataset) => (
                        <div
                          key={dataset.id}
                          onClick={() => toggleSourceDataset(dataset.id)}
                          className={`p-3 border rounded-md cursor-pointer transition-colors ${
                            sourceDatasetIds.includes(dataset.id)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {sourceDatasetIds.includes(dataset.id) && (
                              <CheckCircle weight="fill" className="h-4 w-4 text-primary" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{dataset.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {dataset.domain}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-dataset">Target Dataset Name *</Label>
                    <Input
                      id="target-dataset"
                      placeholder="e.g., customer_daily_summary"
                      value={targetDatasetName}
                      onChange={(e) => setTargetDatasetName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transform-rules">Transform Rules *</Label>
                    <Textarea
                      id="transform-rules"
                      placeholder="Describe the transformation logic (e.g., Group by customer and date, sum amounts, filter valid transactions)"
                      value={transformRules}
                      onChange={(e) => setTransformRules(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain</Label>
                    <Select value={domain} onValueChange={setDomain}>
                      <SelectTrigger id="domain">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_risk">Credit Risk</SelectItem>
                        <SelectItem value="aml_fcc">AML/FCC</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="treasury">Treasury</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="ops">Operations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleGeneratePipeline}
                      disabled={isGenerating}
                      className="flex-1"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Pipeline'}
                    </Button>
                  </div>

                  {generatedPipeline && (
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle weight="fill" className="h-5 w-5" />
                        <span className="font-semibold">Pipeline Generated Successfully</span>
                      </div>

                      <div className="grid gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Code className="h-4 w-4" />
                          <span>SQL Model: {generatedPipeline.sqlModel.split('\n').length} lines</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <TestTube className="h-4 w-4" />
                          <span>Schema Test: Generated</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <TestTube className="h-4 w-4" />
                          <span>DQ Tests: {generatedPipeline.dqTests.length} checks</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <TestTube className="h-4 w-4" />
                          <span>Reconciliation Test: Generated</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deploy-stage">Deployment Stage</Label>
                        <Select value={deployStage} onValueChange={(v) => setDeployStage(v as DeploymentStage)}>
                          <SelectTrigger id="deploy-stage">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dev">Development</SelectItem>
                            <SelectItem value="uat">UAT</SelectItem>
                            <SelectItem value="prod">
                              <div className="flex items-center gap-2">
                                Production
                                <Warning weight="fill" className="h-3 w-3 text-warning" />
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={handleDeployPipeline}
                        disabled={isDeploying}
                        className="w-full gap-2"
                        variant="default"
                      >
                        {isDeploying ? 'Deploying...' : (
                          <>
                            Deploy to {deployStage.toUpperCase()}
                            <ArrowRight weight="bold" className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {pipelines.length === 0 ? (
            <div className="py-12 text-center">
              <GitBranch weight="fill" className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No pipelines yet. Create your first pipeline to transform and enrich data.
              </p>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus weight="bold" className="h-5 w-5 mr-2" />
                Create Your First Pipeline
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pipelines.map((pipeline, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">{pipeline.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">{pipeline.description}</div>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="secondary">{pipeline.domain}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {pipeline.sourceDatasets.length} source{pipeline.sourceDatasets.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {pipeline.dqChecks.length} DQ checks
                        </span>
                        {pipeline.deployedStage && (
                          <Badge variant="outline">
                            {pipeline.deployedStage.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      {pipeline.deployedAt && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Deployed {new Date(pipeline.deployedAt).toLocaleString()}
                        </div>
                      )}
                      {pipeline.evidencePackId && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleDownloadEvidence(pipeline.evidencePackId)}
                          >
                            <DownloadSimple weight="fill" className="h-4 w-4" />
                            Download Evidence Bundle
                          </Button>
                          {evidenceVerification[pipeline.evidencePackId] && (
                            <Badge
                              variant={
                                evidenceVerification[pipeline.evidencePackId]?.status === 'verified'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {evidenceVerification[pipeline.evidencePackId]?.detail}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
