import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitBranch, Plus } from '@phosphor-icons/react';
import type { Dataset, PipelineSpec } from '@/lib/types';

interface PipelinesViewProps {
  datasets: Dataset[];
  pipelines: PipelineSpec[];
  setPipelines: (setter: (prev: PipelineSpec[]) => PipelineSpec[]) => void;
}

export function PipelinesView({ datasets, pipelines, setPipelines }: PipelinesViewProps) {
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
            <Button className="gap-2">
              <Plus weight="bold" className="h-5 w-5" />
              Create Pipeline
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pipelines.length === 0 ? (
            <div className="py-12 text-center">
              <GitBranch weight="fill" className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No pipelines yet. Create your first pipeline to transform and enrich data.
              </p>
              <Button variant="outline">
                <Plus weight="bold" className="h-5 w-5 mr-2" />
                Create Your First Pipeline
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pipelines.map((pipeline, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="font-semibold">{pipeline.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{pipeline.description}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
