import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkle, CheckCircle, WarningCircle, XCircle, ArrowRight, FloppyDisk, DownloadSimple } from '@phosphor-icons/react';
import {
  ConfigCopilotService,
  type ConfigDescribeResponse,
  type ConfigCommitResponse,
  type ConfigEvidence
} from '@/lib/config-copilot';
import {
  EvidenceKeys,
  downloadEvidenceBundle,
  getEvidenceBundle,
  verifyEvidenceBundle
} from '@/lib/evidence-store';
import { toast } from 'sonner';

export function ConfigCopilotView() {
  const [nlInput, setNlInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [describeResponse, setDescribeResponse] = useState<ConfigDescribeResponse | null>(null);
  const [commitResponse, setCommitResponse] = useState<ConfigCommitResponse | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [evidenceVerification, setEvidenceVerification] = useState<null | {
    status: 'verified' | 'invalid';
    detail: string;
  }>(null);

  const handleDescribe = async () => {
    if (!nlInput.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setIsGenerating(true);
    setDescribeResponse(null);
    setCommitResponse(null);
    setEvidenceVerification(null);

    try {
      const response = await ConfigCopilotService.describe({
        nlInput: nlInput.trim(),
        context: {}
      });

      setDescribeResponse(response);
      
      if (response.confidence > 0.7) {
        toast.success('Specifications generated successfully');
      } else {
        toast.warning('Specifications generated with low confidence');
      }
    } catch (error) {
      console.error('Failed to generate specs:', error);
      toast.error('Failed to generate specifications');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommit = async () => {
    if (!describeResponse) {
      toast.error('No specifications to commit');
      return;
    }

    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message');
      return;
    }

    if (!describeResponse.validationPreview.valid) {
      toast.error('Cannot commit invalid specifications');
      return;
    }

    setIsCommitting(true);
    setEvidenceVerification(null);

    try {
      const user = await spark.user();
      
      const response = await ConfigCopilotService.commit({
        requestId: describeResponse.requestId,
        drafts: describeResponse.drafts,
        commitMessage: commitMessage.trim(),
        actor: user.email || user.login
      });

      setCommitResponse(response);

      if (response.status === 'success') {
        toast.success(`Committed ${response.filesWritten.length} files`);
        
        await ConfigCopilotService.saveEvidence({
          id: response.commitId,
          timestamp: response.timestamp,
          requestId: describeResponse.requestId,
          nlInput: describeResponse.nlInput,
          generatedSpecs: describeResponse.drafts,
          validationResults: response.validationResult,
          commitResult: response,
          auditLogRefs: [response.auditEventId],
          actor: user.email || user.login
        });
      } else {
        toast.error('Commit failed: ' + (response.errors?.join(', ') || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to commit specs:', error);
      toast.error('Failed to commit specifications');
    } finally {
      setIsCommitting(false);
    }
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success';
    if (confidence >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const handleDownloadEvidence = async () => {
    if (!commitResponse) {
      toast.error('No evidence bundle available yet');
      return;
    }

    try {
      const evidenceKey = EvidenceKeys.configCopilotRun(commitResponse.commitId);
      const bundle = await getEvidenceBundle<ConfigEvidence>(evidenceKey);

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

      downloadEvidenceBundle(bundle, `config-copilot-evidence-${commitResponse.commitId}.json`);
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
          <CardTitle className="flex items-center gap-2">
            <Sparkle weight="fill" className="h-5 w-5 text-accent" />
            Config Copilot
          </CardTitle>
          <CardDescription>
            Describe your data requirements in natural language, and Config Copilot will generate validated specifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Natural Language Input</label>
            <Textarea
              placeholder="Example: I need a dataset for credit card transactions with PII masking, daily freshness, and fraud detection quality checks..."
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleDescribe}
              disabled={isGenerating || !nlInput.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkle weight="fill" />
                  Generate Specs
                </>
              )}
            </Button>

            {describeResponse && (
              <Button
                variant="outline"
                onClick={() => {
                  setDescribeResponse(null);
                  setCommitResponse(null);
                  setNlInput('');
                  setCommitMessage('');
                  setEvidenceVerification(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {describeResponse && (
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    Confidence: <span className={`font-semibold ${confidenceColor(describeResponse.confidence)}`}>
                      {(describeResponse.confidence * 100).toFixed(0)}%
                    </span>
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {describeResponse.reasoning}
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {describeResponse && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {describeResponse.validationPreview.valid ? (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle weight="fill" className="h-5 w-5" />
                    <span className="font-medium">All validations passed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle weight="fill" className="h-5 w-5" />
                    <span className="font-medium">{describeResponse.validationPreview.errors.length} validation errors</span>
                  </div>
                )}

                {describeResponse.validationPreview.errors.length > 0 && (
                  <div className="space-y-1">
                    {describeResponse.validationPreview.errors.map((error, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">{error.field}:</span>
                          <span className="ml-2">{error.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {describeResponse.validationPreview.warnings.length > 0 && (
                  <div className="space-y-1">
                    {describeResponse.validationPreview.warnings.map((warning, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <WarningCircle className="h-4 w-4 text-warning mt-0.5" />
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">{warning.field}:</span>
                          <span className="ml-2">{warning.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generated Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="dataset" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="dataset" disabled={!describeResponse.drafts.datasetContract}>
                    Dataset Contract
                    {describeResponse.drafts.datasetContract && (
                      <CheckCircle weight="fill" className="h-3 w-3 ml-1 text-success" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="dq" disabled={!describeResponse.drafts.dqRules}>
                    DQ Rules ({describeResponse.drafts.dqRules?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="policies" disabled={!describeResponse.drafts.policies}>
                    Policies ({describeResponse.drafts.policies?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="slas" disabled={!describeResponse.drafts.slas}>
                    SLAs ({describeResponse.drafts.slas?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dataset" className="mt-4">
                  {describeResponse.drafts.datasetContract && (
                    <ScrollArea className="h-[400px] w-full rounded border">
                      <pre className="p-4 text-xs font-mono">
                        {JSON.stringify(describeResponse.drafts.datasetContract, null, 2)}
                      </pre>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="dq" className="mt-4">
                  {describeResponse.drafts.dqRules && (
                    <ScrollArea className="h-[400px] w-full rounded border">
                      <pre className="p-4 text-xs font-mono">
                        {JSON.stringify(describeResponse.drafts.dqRules, null, 2)}
                      </pre>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="policies" className="mt-4">
                  {describeResponse.drafts.policies && (
                    <ScrollArea className="h-[400px] w-full rounded border">
                      <pre className="p-4 text-xs font-mono">
                        {JSON.stringify(describeResponse.drafts.policies, null, 2)}
                      </pre>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="slas" className="mt-4">
                  {describeResponse.drafts.slas && (
                    <ScrollArea className="h-[400px] w-full rounded border">
                      <pre className="p-4 text-xs font-mono">
                        {JSON.stringify(describeResponse.drafts.slas, null, 2)}
                      </pre>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {describeResponse.validationPreview.valid && !commitResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Commit Specifications</CardTitle>
                <CardDescription>
                  This will write validated specs to /specs/ with versioning, create a snapshot, and generate an audit event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Commit Message</label>
                  <Textarea
                    placeholder="Add credit card transaction dataset with PII masking policies"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleCommit}
                  disabled={isCommitting || !commitMessage.trim()}
                  className="gap-2"
                >
                  {isCommitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Committing...
                    </>
                  ) : (
                    <>
                      <FloppyDisk weight="fill" />
                      Commit Specifications
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {commitResponse && commitResponse.status === 'success' && (
            <Card className="border-success">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-success">
                  <CheckCircle weight="fill" className="h-5 w-5" />
                  Commit Successful
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Commit ID:</span>
                    <p className="font-mono text-xs mt-1">{commitResponse.commitId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timestamp:</span>
                    <p className="text-xs mt-1">{new Date(commitResponse.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Audit Event ID:</span>
                    <p className="font-mono text-xs mt-1">{commitResponse.auditEventId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Snapshot ID:</span>
                    <p className="font-mono text-xs mt-1">{commitResponse.snapshotId}</p>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Files Written:</span>
                  <div className="mt-2 space-y-1">
                    {commitResponse.filesWritten.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs font-mono">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {file}
                      </div>
                    ))}
                  </div>
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    Evidence pack written to: <code className="font-mono">evidence/config_copilot_runs/{commitResponse.commitId}</code>
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadEvidence}>
                    <DownloadSimple weight="fill" className="h-4 w-4" />
                    Download Evidence Bundle
                  </Button>
                  {evidenceVerification && (
                    <Badge variant={evidenceVerification.status === 'verified' ? 'default' : 'destructive'}>
                      {evidenceVerification.detail}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
