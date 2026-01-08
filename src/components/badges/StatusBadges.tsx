import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Warning, XCircle, Clock, Eye, LockKey, Globe } from '@phosphor-icons/react';
import type { PIILevel, Jurisdiction, PolicyCheck } from '@/lib/types';

export function PIIBadge({ level }: { level: PIILevel }) {
  if (level === 'none') return null;

  return (
    <Badge variant={level === 'high' ? 'destructive' : 'secondary'} className="gap-1.5">
      <Eye weight="fill" className="h-3.5 w-3.5" />
      {level === 'high' ? 'High PII' : 'Low PII'}
    </Badge>
  );
}

export function JurisdictionBadge({ jurisdiction }: { jurisdiction: Jurisdiction }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <Globe weight="fill" className="h-3.5 w-3.5" />
      {jurisdiction === 'multi' ? 'Multi-Jurisdiction' : jurisdiction}
    </Badge>
  );
}

export function FreshnessBadge({ 
  slaHours, 
  lastRefresh 
}: { 
  slaHours: number; 
  lastRefresh: string;
}) {
  const hoursSinceRefresh = (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60);
  const isStale = hoursSinceRefresh > slaHours;
  const withinSLA = hoursSinceRefresh < slaHours * 0.8;

  return (
    <Badge 
      variant={isStale ? 'destructive' : withinSLA ? 'default' : 'secondary'}
      className="gap-1.5"
    >
      <Clock weight="fill" className="h-3.5 w-3.5" />
      {Math.round(hoursSinceRefresh)}h ago
      {isStale && ' (SLA MISS)'}
    </Badge>
  );
}

export function PolicyBadge({ check }: { check: PolicyCheck }) {
  const variants = {
    allow: 'default',
    require_approval: 'secondary',
    block: 'destructive',
  } as const;

  const icons = {
    allow: ShieldCheck,
    require_approval: Warning,
    block: XCircle,
  };

  const Icon = icons[check.result];

  return (
    <Badge variant={variants[check.result]} className="gap-1.5">
      <Icon weight="fill" className="h-3.5 w-3.5" />
      {check.policyName}
    </Badge>
  );
}

export function DomainBadge({ domain }: { domain: string }) {
  const colors: Record<string, string> = {
    credit_risk: 'bg-red-100 text-red-800 border-red-200',
    aml_fcc: 'bg-orange-100 text-orange-800 border-orange-200',
    finance: 'bg-blue-100 text-blue-800 border-blue-200',
    treasury: 'bg-green-100 text-green-800 border-green-200',
    retail: 'bg-purple-100 text-purple-800 border-purple-200',
    ops: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels: Record<string, string> = {
    credit_risk: 'Credit Risk',
    aml_fcc: 'AML/FCC',
    finance: 'Finance',
    treasury: 'Treasury',
    retail: 'Retail',
    ops: 'Operations',
  };

  return (
    <Badge variant="outline" className={colors[domain] || ''}>
      {labels[domain] || domain}
    </Badge>
  );
}

export function ApprovalStatusBadge({ 
  status 
}: { 
  status: 'pending' | 'approved' | 'rejected';
}) {
  const variants = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
  } as const;

  return (
    <Badge variant={variants[status]}>
      {status.toUpperCase()}
    </Badge>
  );
}

export function RiskLevelBadge({ 
  level 
}: { 
  level: 'low' | 'medium' | 'high';
}) {
  const variants = {
    low: 'outline',
    medium: 'secondary',
    high: 'destructive',
  } as const;

  return (
    <Badge variant={variants[level]}>
      {level.toUpperCase()} RISK
    </Badge>
  );
}
