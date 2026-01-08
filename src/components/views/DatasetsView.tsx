import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatasetCard } from '../dataset/DatasetCard';
import { Database, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import type { Dataset } from '@/lib/types';

interface DatasetsViewProps {
  datasets: Dataset[];
}

export function DatasetsView({ datasets }: DatasetsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  const filteredDatasets = datasets.filter(ds =>
    ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database weight="fill" className="h-5 w-5" />
                Dataset Catalog
              </CardTitle>
              <CardDescription>
                Browse and manage governed datasets across all banking domains
              </CardDescription>
            </div>
            <Button className="gap-2">
              <Plus weight="bold" className="h-5 w-5" />
              Onboard Dataset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              id="dataset-search"
              placeholder="Search datasets by name, description, or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDatasets.map((dataset) => (
          <DatasetCard
            key={dataset.id}
            dataset={dataset}
            onClick={() => setSelectedDataset(dataset)}
          />
        ))}
      </div>

      {filteredDatasets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No datasets found matching &quot;{searchTerm}&quot;
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedDataset} onOpenChange={(open) => !open && setSelectedDataset(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedDataset && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedDataset.name}</DialogTitle>
                <DialogDescription>{selectedDataset.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground mb-1">Owner</div>
                    <div className="font-semibold">{selectedDataset.owner}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Domain</div>
                    <div className="font-semibold">{selectedDataset.domain.replace('_', ' ').toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">PII Level</div>
                    <div className="font-semibold">{selectedDataset.piiLevel.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Jurisdiction</div>
                    <div className="font-semibold">{selectedDataset.jurisdiction}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Freshness SLA</div>
                    <div className="font-semibold">{selectedDataset.freshnessSLA}h</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Last Refresh</div>
                    <div className="font-semibold">{new Date(selectedDataset.lastRefresh).toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-3">Schema ({selectedDataset.schema.length} columns)</div>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-semibold">Column Name</th>
                          <th className="text-left p-3 font-semibold">Type</th>
                          <th className="text-left p-3 font-semibold">Nullable</th>
                          <th className="text-left p-3 font-semibold">PII</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDataset.schema.map((col, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3 font-mono">{col.name}</td>
                            <td className="p-3 font-mono text-muted-foreground">{col.type}</td>
                            <td className="p-3">{col.nullable ? 'Yes' : 'No'}</td>
                            <td className="p-3">{col.pii ? '⚠️ Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedDataset.tags && selectedDataset.tags.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedDataset.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-muted rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
