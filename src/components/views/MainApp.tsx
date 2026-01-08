import { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MagnifyingGlass, Database, GitBranch, CheckCircle } from '@phosphor-icons/react';
import { QueryView } from './QueryView';
import { DatasetsView } from './DatasetsView';
import { PipelinesView } from './PipelinesView';
import { ApprovalsView } from './ApprovalsView';
import type { Dataset, ApprovalRequest, QueryResult, PipelineSpec } from '@/lib/types';
import { SAMPLE_DATASETS, SAMPLE_APPROVALS } from '@/lib/mockData';

export default function App() {
  const [datasets] = useKV<Dataset[]>('datasets', SAMPLE_DATASETS);
  const [approvals] = useKV<ApprovalRequest[]>('approvals', SAMPLE_APPROVALS);
  const [queryHistory, setQueryHistory] = useKV<QueryResult[]>('query_history', []);
  const [pipelines, setPipelines] = useKV<PipelineSpec[]>('pipelines', []);
  const [activeTab, setActiveTab] = useState('query');

  const pendingApprovals = (approvals || []).filter(a => a.status === 'pending');

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
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8">
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
            <TabsTrigger value="approvals" className="gap-2 relative">
              <CheckCircle weight="fill" className="h-4 w-4" />
              Approvals
              {pendingApprovals.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center font-semibold">
                  {pendingApprovals.length}
                </span>
              )}
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

          <TabsContent value="approvals" className="mt-0">
            <ApprovalsView approvals={approvals || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
