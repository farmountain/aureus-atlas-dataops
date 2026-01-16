import type { Domain, Jurisdiction, PIILevel } from './types';
import type { ConfigDescribeRequest } from './config-copilot';

export interface DatasetOnboardingDetails {
  name: string;
  domain: Domain;
  owner: string;
  description?: string;
  piiLevel?: PIILevel;
  jurisdiction?: Jurisdiction;
  freshnessSLA?: number;
  tags?: string[];
}

export interface ConfigCopilotPrefill {
  id: string;
  nlInput: string;
  commitMessage: string;
  context?: ConfigDescribeRequest['context'];
  datasetDetails: DatasetOnboardingDetails;
  autoDescribe?: boolean;
}

export const DEFAULT_ONBOARDING_DETAILS: DatasetOnboardingDetails = {
  name: '',
  domain: 'retail',
  owner: '',
  description: '',
  piiLevel: 'low',
  jurisdiction: 'US',
  freshnessSLA: 24,
  tags: [],
};

export function buildDatasetOnboardingPrompt(details: DatasetOnboardingDetails) {
  const tagList = details.tags && details.tags.length > 0 ? details.tags.join(', ') : 'none specified';
  const description = details.description?.trim() || 'TBD';
  const piiLevel = details.piiLevel || 'low';
  const jurisdiction = details.jurisdiction || 'US';
  const freshness = details.freshnessSLA ?? 24;

  return `Onboard a new dataset with the following template:

- Dataset name (snake_case): ${details.name}
- Domain: ${details.domain}
- Owner email: ${details.owner}
- Description: ${description}
- PII level: ${piiLevel}
- Jurisdiction: ${jurisdiction}
- Freshness SLA (hours): ${freshness}
- Tags: ${tagList}

Please generate a full dataset contract, data quality rules, governance policies, and SLAs.`;
}

export function buildDatasetCommitMessage(datasetName: string) {
  return `Onboard ${datasetName} dataset`;
}
