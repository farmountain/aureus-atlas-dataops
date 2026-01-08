import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MagnifyingGlass, Database, ShieldCheck, Clock, Warning, Sparkle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { generateSQLFromQuestion, executeQuery } from '@/lib/llmService';
import { policyEngine } from '@/lib/policyEngine';
import { PolicyBadge } from '../badges/StatusBadges';
import type { Dataset, QueryResult } from '@/lib/types';

interface QueryViewProps {
  datasets: Dataset[];
  queryHistory: QueryResult[];
  setQueryHistory: (setter: (prev: QueryResult[]) => QueryResult[]) => void;
}

export function QueryView({ datasets, queryHistory, setQueryHistory }: QueryViewProps) {
  const [question, setQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setIsGenerating(true);
    setCurrentResult(null);

    try {
      const { sql, datasets: requiredDatasets, intent } = await generateSQLFromQuestion(
        question,
        datasets
      );

      const policyChecks = await policyEngine.evaluatePolicies('query', {
        datasets: requiredDatasets,
        userRole: 'analyst',
      });

      const blocking = policyEngine.getBlockingPolicies(policyChecks);
      if (blocking.length > 0) {
        toast.error('Query blocked by policy', {
          description: blocking[0].reason,
        });
        setIsGenerating(false);
        return;
      }

      const requiresApproval = policyEngine.requiresApproval(policyChecks);
      if (requiresApproval) {
        toast.warning('Query requires approval', {
          description: 'This query has been submitted for approval due to policy requirements.',
        });
        setIsGenerating(false);
        return;
      }

      const result = await executeQuery(question, sql, requiredDatasets, policyChecks);
      
      setCurrentResult(result);
      setQueryHistory((prev) => [result, ...prev].slice(0, 50));
      
      toast.success('Query executed successfully', {
        description: `Returned ${result.results.length} rows in ${Math.round(result.executionTime)}ms`,
      });
    } catch (error) {
      toast.error('Failed to execute query', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
              Executed in {Math.round(currentResult.executionTime)}ms at {new Date(currentResult.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Accordion type="single" collapsible defaultValue="results">
              <AccordionItem value="results">
                <AccordionTrigger className="text-sm font-semibold">
                  Results ({currentResult.results.length} rows)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(currentResult.results[0] || {}).map((key) => (
                            <TableHead key={key} className="font-semibold">
                              {key.replace(/_/g, ' ').toUpperCase()}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentResult.results.map((row, idx) => (
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
                  Dataset Lineage
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {currentResult.datasets.map((ds) => (
                      <div key={ds.id} className="flex items-center gap-3 p-3 bg-muted rounded-md">
                        <Database weight="fill" className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <div className="font-semibold text-sm">{ds.name}</div>
                          <div className="text-xs text-muted-foreground">{ds.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  key={result.id}
                  className="flex items-start justify-between gap-4 p-4 bg-muted rounded-md cursor-pointer hover:bg-muted/70 transition-colors"
                  onClick={() => setCurrentResult(result)}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm mb-1">{result.question}</div>
                    <div className="text-xs text-muted-foreground">
                      {result.datasets.map(ds => ds.name).join(', ')} • {result.results.length} rows
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
