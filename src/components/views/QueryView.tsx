import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MagnifyingGlass, Database, ShieldCheck, Clock, Warning, Sparkle, LockKey } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { PolicyBadge } from '../badges/StatusBadges';
import type { Dataset } from '@/lib/types';
import { AureusGuard } from '@/lib/aureus-guard';
import type { GuardConfig } from '@/lib/aureus-types';
import { QueryService, type QueryAskResponse } from '@/lib/query-service';

const GUARD_CONFIG: GuardConfig = {
  environment: 'dev',
  budgetLimits: {
    tokenBudget: 10000,
    queryCostBudget: 100,
  },
  enableAudit: true,
  enableSnapshots: true,
};

interface QueryViewProps {
  datasets: Dataset[];
  queryHistory: QueryAskResponse[];
  setQueryHistory: (setter: (prev: QueryAskResponse[]) => QueryAskResponse[]) => void;
}

export function QueryView({ datasets, queryHistory, setQueryHistory }: QueryViewProps) {
  const [question, setQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<QueryAskResponse | null>(null);
  const datasetMap = useMemo(() => new Map(datasets.map((dataset) => [dataset.id, dataset])), [datasets]);
  const [guard] = useState(() => new AureusGuard(GUARD_CONFIG));
  const queryService = useMemo(() => new QueryService(guard, datasetMap), [guard, datasetMap]);

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setIsGenerating(true);
    setCurrentResult(null);

    try {
      const result = await queryService.ask({
        question,
        actor: 'analyst',
        role: 'analyst',
      });

      setCurrentResult(result);
      setQueryHistory((prev) => [result, ...prev].slice(0, 50));

      toast.success('Query executed successfully', {
        description: `Returned ${result.resultMetadata?.rowCount ?? result.results?.length ?? 0} rows in ${result.resultMetadata?.executionTimeMs ?? 0}ms`,
      });
    } catch (error) {
      toast.error('Failed to execute query', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const currentResults = currentResult?.results ?? [];
  const maskedFields = currentResult?.maskedFields ?? [];
  const maskingPolicy = currentResult?.maskingPolicy;
  const maskedFieldMap = useMemo(
    () => new Map(maskedFields.map((field) => [field.field.toLowerCase(), field])),
    [maskedFields]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlass weight="fill" className="h-5 w-5" />
            Ask a Data Question
          </CardTitle>
          <CardDescription>
            Ask questions in natural language. The system generates SQL, checks policies, and returns results with full lineage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              id="question-input"
              placeholder="e.g., What is the total outstanding balance for high-risk loans?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="text-base"
              disabled={isGenerating}
            />
          </div>
          <Button 
            onClick={handleAskQuestion} 
            disabled={isGenerating || !question.trim()}
            size="lg"
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Sparkle weight="fill" className="h-5 w-5 animate-spin" />
                Generating & Executing...
              </>
            ) : (
              <>
                <MagnifyingGlass weight="fill" className="h-5 w-5" />
                Ask Question
              </>
            )}
          </Button>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Try:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuestion('What is the total outstanding balance for high-risk loans?')}
              disabled={isGenerating}
            >
              High-risk loans balance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuestion('Show me all open AML alerts with risk score above 80')}
              disabled={isGenerating}
            >
              High-risk AML alerts
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuestion('What is the daily transaction volume by channel for the last 7 days?')}
              disabled={isGenerating}
            >
              Transaction volumes
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck weight="fill" className="h-5 w-5 text-success" />
              Query Results
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-xs">
              <Clock weight="fill" className="h-3.5 w-3.5" />
              Executed in {currentResult.resultMetadata?.executionTimeMs ?? 0}ms at {new Date(currentResult.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Accordion type="single" collapsible defaultValue="results">
              <AccordionItem value="results">
                <AccordionTrigger className="text-sm font-semibold">
                  Results ({currentResults.length} rows)
                </AccordionTrigger>
                <AccordionContent>
                  {currentResults.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">
                      No rows returned for this query.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {maskedFields.length > 0 && (
                        <Alert>
                          <LockKey weight="fill" className="h-4 w-4" />
                          <AlertDescription className="space-y-2">
                            <div className="font-semibold text-sm">
                              Masked fields applied {maskingPolicy?.policyName ? `(${maskingPolicy.policyName})` : ''}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {maskingPolicy?.reason ?? maskedFields[0]?.reason}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {maskedFields.map((field) => (
                                <Badge key={field.field} variant="secondary" className="gap-1">
                                  <LockKey weight="fill" className="h-3 w-3" />
                                  {field.field} ({field.strategy})
                                </Badge>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="rounded-md border overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(currentResults[0] || {}).map((key) => {
                                const maskedField = maskedFieldMap.get(key.toLowerCase());
                                return (
                                  <TableHead key={key} className="font-semibold">
                                    <div className="flex items-center gap-2">
                                      <span>{key.replace(/_/g, ' ').toUpperCase()}</span>
                                      {maskedField && (
                                        <Badge variant="outline" className="gap-1 text-[10px]">
                                          <LockKey weight="fill" className="h-3 w-3" />
                                          Masked
                                        </Badge>
                                      )}
                                    </div>
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentResults.map((row, idx) => (
                              <TableRow key={idx}>
                                {Object.values(row).map((value, vidx) => (
                                  <TableCell key={vidx} className="font-mono text-sm">
                                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sql">
                <AccordionTrigger className="text-sm font-semibold">
                  Generated SQL
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="bg-muted p-4 rounded-md text-xs font-mono overflow-x-auto">
                    {currentResult.sql}
                  </pre>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="datasets">
                <AccordionTrigger className="text-sm font-semibold">
                  Citations ({currentResult.citations.length})
                </AccordionTrigger>
                <AccordionContent>
                  {currentResult.citations.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">
                      No dataset citations were captured for this query.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentResult.citations.map((citation) => {
                        const dataset =
                          datasetMap.get(citation.datasetId) ??
                          datasets.find((ds) => ds.name === citation.datasetName);
                        return (
                          <div key={citation.datasetId} className="flex items-center gap-3 p-3 bg-muted rounded-md">
                            <Database weight="fill" className="h-5 w-5 text-primary" />
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{citation.datasetName}</div>
                              {dataset?.description && (
                                <div className="text-xs text-muted-foreground">{dataset.description}</div>
                              )}
                              <div className="text-xs text-muted-foreground">
                                {citation.domain.replace(/_/g, ' ').toUpperCase()} • Columns: {citation.columnsUsed.join(', ') || 'N/A'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="freshness">
                <AccordionTrigger className="text-sm font-semibold">
                  Freshness Checks ({currentResult.freshnessChecks.length})
                </AccordionTrigger>
                <AccordionContent>
                  {currentResult.freshnessChecks.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">
                      No freshness checks were required.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentResult.freshnessChecks.map((check) => (
                        <Alert key={check.datasetId}>
                          <Clock weight="fill" className="h-4 w-4" />
                          <AlertDescription className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-semibold text-sm mb-1">{check.datasetName}</div>
                              <div className="text-xs text-muted-foreground">{check.statusMessage}</div>
                            </div>
                            <Badge variant={check.isStale ? 'destructive' : 'secondary'}>
                              {check.isStale ? 'Stale' : 'Fresh'}
                            </Badge>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="policies">
                <AccordionTrigger className="text-sm font-semibold">
                  Policy Checks ({currentResult.policyChecks.length})
                </AccordionTrigger>
                <AccordionContent>
                  {currentResult.policyChecks.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">
                      No policy restrictions apply to this query.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentResult.policyChecks.map((check, idx) => (
                        <Alert key={idx}>
                          <Warning weight="fill" className="h-4 w-4" />
                          <AlertDescription className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-semibold text-sm mb-1">{check.policyName}</div>
                              <div className="text-xs text-muted-foreground">{check.reason}</div>
                            </div>
                            <PolicyBadge check={check} />
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="lineage">
                <AccordionTrigger className="text-sm font-semibold">
                  Lineage
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">Lineage ID</Badge>
                    <span className="font-mono text-xs">{currentResult.lineageId}</span>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {queryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Query History</CardTitle>
            <CardDescription>
              Recent query executions with evidence packs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {queryHistory.slice(0, 5).map((result) => (
                <div
                  key={result.queryId}
                  className="flex items-start justify-between gap-4 p-4 bg-muted rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => setCurrentResult(result)}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">{result.question}</div>
                    <div className="text-xs text-muted-foreground">
                      {result.citations.map(citation => citation.datasetName).join(', ')} • {result.results?.length ?? 0} rows
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
