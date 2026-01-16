import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from '@phosphor-icons/react';
import type { Dataset } from '@/lib/types';
import { PIIBadge, JurisdictionBadge, FreshnessBadge, DomainBadge, EvidencePackBadge } from '../badges/StatusBadges';

interface DatasetCardProps {
  dataset: Dataset;
  onClick?: () => void;
}

export function DatasetCard({ dataset, onClick }: DatasetCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-md hover:border-accent" 
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Database weight="fill" className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{dataset.name}</CardTitle>
              <CardDescription className="mt-1 text-sm line-clamp-2">
                {dataset.description}
              </CardDescription>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <DomainBadge domain={dataset.domain} />
          <PIIBadge level={dataset.piiLevel} />
          <JurisdictionBadge jurisdiction={dataset.jurisdiction} />
          <FreshnessBadge slaHours={dataset.freshnessSLA} lastRefresh={dataset.lastRefresh} />
          <EvidencePackBadge evidencePackId={dataset.evidencePackId} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Owner: <span className="font-medium text-foreground">{dataset.owner}</span></span>
          {dataset.recordCount && (
            <span>{dataset.recordCount.toLocaleString()} records</span>
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{dataset.schema.length}</span> columns
          {dataset.schema.some(col => col.pii) && (
            <span className="ml-3">
              <span className="font-medium text-foreground">
                {dataset.schema.filter(col => col.pii).length}
              </span> PII fields
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
