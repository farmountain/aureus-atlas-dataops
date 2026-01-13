import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { DatasetCard } from '../dataset/DatasetCard';
import { Database, Plus, MagnifyingGlass, Sparkle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import type { Dataset, Domain, Jurisdiction, PIILevel } from '@/lib/types';
import { DOMAINS } from '@/lib/mockData';
import {
  buildDatasetCommitMessage,
  buildDatasetOnboardingPrompt,
  DEFAULT_ONBOARDING_DETAILS,
  type ConfigCopilotPrefill,
  type DatasetOnboardingDetails
} from '@/lib/config-copilot-onboarding';

interface DatasetsViewProps {
  datasets: Dataset[];
  onStartOnboarding?: (prefill: ConfigCopilotPrefill) => void;
}

const PII_LEVELS: Array<{ value: PIILevel; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' }
];

const JURISDICTIONS: Array<{ value: Jurisdiction; label: string }> = [
  { value: 'US', label: 'US' },
  { value: 'EU', label: 'EU' },
  { value: 'UK', label: 'UK' },
  { value: 'APAC', label: 'APAC' },
  { value: 'multi', label: 'Multi' }
];

export function DatasetsView({ datasets, onStartOnboarding }: DatasetsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingDetails, setOnboardingDetails] = useState<DatasetOnboardingDetails>(DEFAULT_ONBOARDING_DETAILS);
  const [tagsInput, setTagsInput] = useState('');

  const filteredDatasets = datasets.filter(ds =>
    ds.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ds.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOnboardSubmit = () => {
    if (!onStartOnboarding) {
      return;
    }

    const name = onboardingDetails.name.trim();
    const owner = onboardingDetails.owner.trim();

    if (!name) {
      toast.error('Dataset name is required');
      return;
    }

    if (!owner || !owner.includes('@')) {
      toast.error('Owner email is required');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    const details: DatasetOnboardingDetails = {
      ...onboardingDetails,
      name,
      owner,
      description: onboardingDetails.description?.trim() || undefined,
      tags
    };

    const prefill: ConfigCopilotPrefill = {
      id: uuidv4(),
      nlInput: buildDatasetOnboardingPrompt(details),
      commitMessage: buildDatasetCommitMessage(details.name),
      context: {
        domain: details.domain,
        existingDatasets: datasets.map(dataset => dataset.name),
      },
      datasetDetails: details
    };

    onStartOnboarding(prefill);
    setOnboardingOpen(false);
    setOnboardingDetails(DEFAULT_ONBOARDING_DETAILS);
    setTagsInput('');
  };

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
            <Button className="gap-2" onClick={() => setOnboardingOpen(true)}>
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

      <Dialog open={onboardingOpen} onOpenChange={setOnboardingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Onboard Dataset via Config Copilot</DialogTitle>
            <DialogDescription>
              Provide the dataset specifics to prefill Config Copilot with a tailored template.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dataset Name</label>
              <Input
                placeholder="customer_transactions"
                value={onboardingDetails.name}
                onChange={(e) => setOnboardingDetails((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Owner Email</label>
              <Input
                placeholder="owner@bank.com"
                value={onboardingDetails.owner}
                onChange={(e) => setOnboardingDetails((prev) => ({ ...prev, owner: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain</label>
              <Select
                value={onboardingDetails.domain}
                onValueChange={(value: Domain) => setOnboardingDetails((prev) => ({ ...prev, domain: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {DOMAINS.map((domain) => (
                    <SelectItem key={domain.value} value={domain.value}>
                      {domain.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">PII Level</label>
              <Select
                value={onboardingDetails.piiLevel}
                onValueChange={(value: PIILevel) => setOnboardingDetails((prev) => ({ ...prev, piiLevel: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select PII level" />
                </SelectTrigger>
                <SelectContent>
                  {PII_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jurisdiction</label>
              <Select
                value={onboardingDetails.jurisdiction}
                onValueChange={(value: Jurisdiction) => setOnboardingDetails((prev) => ({ ...prev, jurisdiction: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  {JURISDICTIONS.map((jurisdiction) => (
                    <SelectItem key={jurisdiction.value} value={jurisdiction.value}>
                      {jurisdiction.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Freshness SLA (hours)</label>
              <Input
                type="number"
                min={1}
                value={onboardingDetails.freshnessSLA ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setOnboardingDetails((prev) => ({
                    ...prev,
                    freshnessSLA: value ? Number(value) : undefined
                  }));
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe the dataset purpose and contents..."
              value={onboardingDetails.description ?? ''}
              onChange={(e) => setOnboardingDetails((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <Input
              placeholder="risk, regulatory, transactions"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOnboardingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOnboardSubmit} className="gap-2">
              <Sparkle weight="fill" className="h-4 w-4" />
              Open Config Copilot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
