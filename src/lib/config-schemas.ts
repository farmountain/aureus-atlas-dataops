import type { Domain, PIILevel, Jurisdiction, Column } from './types';

export interface DatasetContractSpec {
  name: string;
  domain: Domain;
  owner: string;
  description: string;
  schema: Column[];
  piiLevel: PIILevel;
  jurisdiction: Jurisdiction;
  freshnessSLA: number;
  tags: string[];
  ingestionSchedule?: string;
  sourceSystem?: string;
  retention?: {
    period: number;
    unit: 'days' | 'months' | 'years';
  };
}

export interface DQRuleSpec {
  ruleName: string;
  ruleType: 'completeness' | 'uniqueness' | 'validity' | 'consistency' | 'timeliness';
  description: string;
  column?: string;
  condition: string;
  threshold: number;
  severity: 'error' | 'warning';
  enabled: boolean;
}

export interface PolicySpec {
  policyId: string;
  policyName: string;
  policyType: 'access' | 'quality' | 'retention' | 'approval' | 'masking';
  description: string;
  scope: {
    domains?: Domain[];
    datasets?: string[];
    piiLevels?: PIILevel[];
    jurisdictions?: Jurisdiction[];
    roles?: string[];
  };
  condition: string;
  action: 'allow' | 'block' | 'require_approval' | 'mask';
  approvers?: string[];
  effectiveDate: string;
  expiryDate?: string;
  priority: number;
}

export interface SLASpec {
  slaName: string;
  datasetName: string;
  metrics: {
    freshness?: {
      target: number;
      unit: 'minutes' | 'hours' | 'days';
      measurement: 'last_update_age';
    };
    availability?: {
      target: number;
      unit: 'percentage';
      measurement: 'uptime';
    };
    quality?: {
      target: number;
      unit: 'percentage';
      measurement: 'dq_pass_rate';
    };
    latency?: {
      target: number;
      unit: 'milliseconds' | 'seconds';
      measurement: 'query_p95';
    };
  };
  alerting: {
    channels: ('email' | 'slack' | 'pagerduty')[];
    recipients: string[];
    threshold: number;
  };
  owner: string;
  reviewCadence: 'weekly' | 'monthly' | 'quarterly';
}

export interface ConfigDrafts {
  datasetContract?: DatasetContractSpec;
  dqRules?: DQRuleSpec[];
  policies?: PolicySpec[];
  slas?: SLASpec[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateDatasetContract(spec: DatasetContractSpec): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!spec.name || spec.name.length < 3) {
    errors.push({ field: 'name', message: 'Dataset name must be at least 3 characters', severity: 'error' });
  }

  if (!spec.domain) {
    errors.push({ field: 'domain', message: 'Domain is required', severity: 'error' });
  }

  if (!spec.owner || !spec.owner.includes('@')) {
    errors.push({ field: 'owner', message: 'Owner must be a valid email', severity: 'error' });
  }

  if (!spec.schema || spec.schema.length === 0) {
    errors.push({ field: 'schema', message: 'Schema must have at least one column', severity: 'error' });
  }

  if (spec.piiLevel === 'high' && spec.schema) {
    const hasPIIColumns = spec.schema.some(col => col.pii);
    if (!hasPIIColumns) {
      warnings.push({ field: 'piiLevel', message: 'PIILevel is high but no columns marked as PII', severity: 'warning' });
    }
  }

  if (spec.freshnessSLA && spec.freshnessSLA < 0) {
    errors.push({ field: 'freshnessSLA', message: 'Freshness SLA must be non-negative', severity: 'error' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateDQRules(rules: DQRuleSpec[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!rules || rules.length === 0) {
    warnings.push({ field: 'rules', message: 'No DQ rules defined', severity: 'warning' });
    return { valid: true, errors, warnings };
  }

  rules.forEach((rule, idx) => {
    if (!rule.ruleName) {
      errors.push({ field: `rules[${idx}].ruleName`, message: 'Rule name is required', severity: 'error' });
    }

    if (!rule.condition) {
      errors.push({ field: `rules[${idx}].condition`, message: 'Condition is required', severity: 'error' });
    }

    if (rule.threshold < 0 || rule.threshold > 100) {
      errors.push({ field: `rules[${idx}].threshold`, message: 'Threshold must be between 0 and 100', severity: 'error' });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validatePolicies(policies: PolicySpec[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!policies || policies.length === 0) {
    warnings.push({ field: 'policies', message: 'No policies defined', severity: 'warning' });
    return { valid: true, errors, warnings };
  }

  policies.forEach((policy, idx) => {
    if (!policy.policyId) {
      errors.push({ field: `policies[${idx}].policyId`, message: 'Policy ID is required', severity: 'error' });
    }

    if (!policy.policyName) {
      errors.push({ field: `policies[${idx}].policyName`, message: 'Policy name is required', severity: 'error' });
    }

    if (!policy.condition) {
      errors.push({ field: `policies[${idx}].condition`, message: 'Condition is required', severity: 'error' });
    }

    if (policy.action === 'require_approval' && (!policy.approvers || policy.approvers.length === 0)) {
      errors.push({ field: `policies[${idx}].approvers`, message: 'Approvers required for require_approval action', severity: 'error' });
    }

    if (policy.priority < 0) {
      errors.push({ field: `policies[${idx}].priority`, message: 'Priority must be non-negative', severity: 'error' });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateSLAs(slas: SLASpec[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!slas || slas.length === 0) {
    warnings.push({ field: 'slas', message: 'No SLAs defined', severity: 'warning' });
    return { valid: true, errors, warnings };
  }

  slas.forEach((sla, idx) => {
    if (!sla.slaName) {
      errors.push({ field: `slas[${idx}].slaName`, message: 'SLA name is required', severity: 'error' });
    }

    if (!sla.datasetName) {
      errors.push({ field: `slas[${idx}].datasetName`, message: 'Dataset name is required', severity: 'error' });
    }

    if (!sla.owner) {
      errors.push({ field: `slas[${idx}].owner`, message: 'Owner is required', severity: 'error' });
    }

    const hasMetrics = Object.keys(sla.metrics).length > 0;
    if (!hasMetrics) {
      errors.push({ field: `slas[${idx}].metrics`, message: 'At least one metric must be defined', severity: 'error' });
    }

    if (sla.alerting && (!sla.alerting.channels || sla.alerting.channels.length === 0)) {
      warnings.push({ field: `slas[${idx}].alerting`, message: 'No alerting channels configured', severity: 'warning' });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateAllSpecs(drafts: ConfigDrafts): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  if (drafts.datasetContract) {
    const result = validateDatasetContract(drafts.datasetContract);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  if (drafts.dqRules) {
    const result = validateDQRules(drafts.dqRules);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  if (drafts.policies) {
    const result = validatePolicies(drafts.policies);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  if (drafts.slas) {
    const result = validateSLAs(drafts.slas);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}
