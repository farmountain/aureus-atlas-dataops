import { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MagnifyingGlass, Database, GitBranch, CheckCircle, Shield, Sparkle, ChartLineUp } from '@phosphor-icons/react';
import { QueryView } from './QueryView';
import { DatasetsView } from './DatasetsView';
import { PipelinesView } from './PipelinesView';
import { ApprovalsView } from './ApprovalsView';
import { GuardDemo } from './GuardDemo';
import { ConfigCopilotView } from './ConfigCopilotView';
import { ObservabilityView } from './ObservabilityView';
import type { Dataset, PipelineSpec } from '@/lib/types';
import type { QueryAskResponse } from '@/lib/query-service';
import { SAMPLE_DATASETS } from '@/lib/mockData';
import { useApprovalQueue } from '@/lib/approval-service';

export default function App() {
  const [datasets] = useKV<Dataset[]>('datasets', SAMPLE_DATASETS);
  const [approvals] = useApprovalQueue();
  const [queryHistory, setQueryHistory] = useKV<QueryAskResponse[]>('query_history', []);
  const [pipelines, setPipelines] = useKV<PipelineSpec[]>('pipelines', []);
  const [activeTab, setActiveTab] = useState('query');

  const pendingApprovals = (approvals || []).filter(a => a.status === 'PENDING');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                AUREUS Platform
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Governed Agentic Data Platform
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Datasets:</span>
              <span className="font-semibold text-foreground">{(datasets || []).length}</span>
              <span className="text-muted-foreground ml-4">Pending Approvals:</span>
              <span className="font-semibold text-warning">{pendingApprovals.length}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-5xl grid-cols-7 mb-8">
            <TabsTrigger value="query" className="gap-2">
              <MagnifyingGlass weight="fill" className="h-4 w-4" />
              Ask
            </TabsTrigger>
            <TabsTrigger value="datasets" className="gap-2">
              <Database weight="fill" className="h-4 w-4" />
              Datasets
            </TabsTrigger>
            <TabsTrigger value="pipelines" className="gap-2">
              <GitBranch weight="fill" className="h-4 w-4" />
              Pipelines
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Sparkle weight="fill" className="h-4 w-4" />
              Config
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2 relative">
              <CheckCircle weight="fill" className="h-4 w-4" />
              Approvals
              {pendingApprovals.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center font-semibold">
                  {pendingApprovals.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="guard" className="gap-2">
              <Shield weight="fill" className="h-4 w-4" />
              Guard
            </TabsTrigger>
            <TabsTrigger value="observability" className="gap-2">
              <ChartLineUp weight="fill" className="h-4 w-4" />
              Metrics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="mt-0">
            <QueryView 
              datasets={datasets || []}
              queryHistory={queryHistory || []}
              setQueryHistory={setQueryHistory}
            />
          </TabsContent>

          <TabsContent value="datasets" className="mt-0">
            <DatasetsView datasets={datasets || []} />
          </TabsContent>

          <TabsContent value="pipelines" className="mt-0">
            <PipelinesView 
              datasets={datasets || []}
              pipelines={pipelines || []}
              setPipelines={setPipelines}
            />
          </TabsContent>

          <TabsContent value="config" className="mt-0">
            <ConfigCopilotView />
          </TabsContent>

          <TabsContent value="approvals" className="mt-0">
            <ApprovalsView />
          </TabsContent>

          <TabsContent value="guard" className="mt-0">
            <GuardDemo />
          </TabsContent>

          <TabsContent value="observability" className="mt-0">
            <ObservabilityView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
