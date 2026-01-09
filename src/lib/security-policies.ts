import type { ActionContext, PolicyDecision } from './aureus-types';

export type PIIMaskingLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Jurisdiction = 'US' | 'EU' | 'UK' | 'APAC' | 'MULTI' | 'GLOBAL';
export type PurposeTag = 
  | 'CREDIT_RISK_ANALYSIS' 
  | 'AML_INVESTIGATION' 
  | 'REGULATORY_REPORTING' 
  | 'FRAUD_DETECTION' 
  | 'CUSTOMER_SERVICE' 
  | 'MARKETING_ANALYTICS'
  | 'PRODUCT_DEVELOPMENT'
  | 'OPERATIONS';

export interface EnhancedPolicyContext extends ActionContext {
  purposeTag?: PurposeTag;
  requestedJurisdictions?: Jurisdiction[];
  dataMaskingLevel?: PIIMaskingLevel;
}

export interface PIIMaskingPolicy {
  level: PIIMaskingLevel;
  maskingRules: {
    fieldPatterns: string[];
    maskingStrategy: 'FULL' | 'PARTIAL' | 'HASH' | 'REDACT';
  }[];
  allowedRoles: string[];
  requiresJustification: boolean;
}

export interface CrossBorderPolicy {
  sourceJurisdiction: Jurisdiction;
  targetJurisdiction: Jurisdiction;
  allowed: boolean;
  requiresApproval: boolean;
  legalBasis?: string;
  restrictions?: string[];
}

export interface PurposeLimitationPolicy {
  purposeTag: PurposeTag;
  allowedDataDomains: string[];
  prohibitedDataDomains: string[];
  maxDataRetentionDays: number;
  requiresConsent: boolean;
}

export const PII_MASKING_POLICIES: Record<PIIMaskingLevel, PIIMaskingPolicy> = {
  LOW: {
    level: 'LOW',
    maskingRules: [],
    allowedRoles: ['viewer', 'analyst', 'approver', 'admin'],
    requiresJustification: false,
  },
  MEDIUM: {
    level: 'MEDIUM',
    maskingRules: [
      {
        fieldPatterns: ['email', 'phone', 'address', 'postal_code', 'zip_code'],
        maskingStrategy: 'PARTIAL',
      },
      {
        fieldPatterns: ['ssn', 'tax_id', 'national_id'],
        maskingStrategy: 'HASH',
      },
    ],
    allowedRoles: ['analyst', 'approver', 'admin'],
    requiresJustification: true,
  },
  HIGH: {
    level: 'HIGH',
    maskingRules: [
      {
        fieldPatterns: ['ssn', 'tax_id', 'national_id', 'passport', 'drivers_license'],
        maskingStrategy: 'REDACT',
      },
      {
        fieldPatterns: ['email', 'phone', 'address', 'full_name', 'dob', 'date_of_birth'],
        maskingStrategy: 'HASH',
      },
      {
        fieldPatterns: ['account_number', 'routing_number', 'card_number', 'cvv'],
        maskingStrategy: 'REDACT',
      },
    ],
    allowedRoles: ['approver', 'admin'],
    requiresJustification: true,
  },
};

export const CROSS_BORDER_POLICIES: CrossBorderPolicy[] = [
  {
    sourceJurisdiction: 'EU',
    targetJurisdiction: 'US',
    allowed: true,
    requiresApproval: true,
    legalBasis: 'Standard Contractual Clauses (SCCs)',
    restrictions: ['PII must be minimized', 'Data subject rights must be preserved'],
  },
  {
    sourceJurisdiction: 'EU',
    targetJurisdiction: 'APAC',
    allowed: false,
    requiresApproval: true,
    legalBasis: 'GDPR Article 46',
    restrictions: ['Prohibited without explicit legal mechanism'],
  },
  {
    sourceJurisdiction: 'US',
    targetJurisdiction: 'EU',
    allowed: true,
    requiresApproval: true,
    legalBasis: 'EU-US Data Privacy Framework',
    restrictions: ['Must comply with GDPR requirements'],
  },
  {
    sourceJurisdiction: 'UK',
    targetJurisdiction: 'US',
    allowed: true,
    requiresApproval: true,
    legalBasis: 'UK-US Data Bridge',
    restrictions: ['UK GDPR compliance required'],
  },
  {
    sourceJurisdiction: 'APAC',
    targetJurisdiction: 'EU',
    allowed: true,
    requiresApproval: true,
    legalBasis: 'Adequacy decision or SCCs',
    restrictions: ['Jurisdiction-specific requirements apply'],
  },
];

export const PURPOSE_LIMITATION_POLICIES: PurposeLimitationPolicy[] = [
  {
    purposeTag: 'CREDIT_RISK_ANALYSIS',
    allowedDataDomains: ['credit_risk', 'finance_reporting', 'treasury_markets'],
    prohibitedDataDomains: ['aml_fcc', 'customer_service'],
    maxDataRetentionDays: 2555,
    requiresConsent: false,
  },
  {
    purposeTag: 'AML_INVESTIGATION',
    allowedDataDomains: ['aml_fcc', 'credit_risk', 'retail_channels'],
    prohibitedDataDomains: ['marketing_analytics'],
    maxDataRetentionDays: 3650,
    requiresConsent: false,
  },
  {
    purposeTag: 'REGULATORY_REPORTING',
    allowedDataDomains: ['finance_reporting', 'credit_risk', 'aml_fcc', 'treasury_markets'],
    prohibitedDataDomains: [],
    maxDataRetentionDays: 2555,
    requiresConsent: false,
  },
  {
    purposeTag: 'FRAUD_DETECTION',
    allowedDataDomains: ['aml_fcc', 'retail_channels', 'operations'],
    prohibitedDataDomains: ['marketing_analytics'],
    maxDataRetentionDays: 2190,
    requiresConsent: false,
  },
  {
    purposeTag: 'CUSTOMER_SERVICE',
    allowedDataDomains: ['retail_channels', 'operations'],
    prohibitedDataDomains: ['credit_risk', 'aml_fcc', 'finance_reporting'],
    maxDataRetentionDays: 365,
    requiresConsent: true,
  },
  {
    purposeTag: 'MARKETING_ANALYTICS',
    allowedDataDomains: ['retail_channels'],
    prohibitedDataDomains: ['credit_risk', 'aml_fcc', 'finance_reporting', 'treasury_markets'],
    maxDataRetentionDays: 730,
    requiresConsent: true,
  },
  {
    purposeTag: 'PRODUCT_DEVELOPMENT',
    allowedDataDomains: ['retail_channels', 'operations'],
    prohibitedDataDomains: ['aml_fcc', 'credit_risk'],
    maxDataRetentionDays: 1095,
    requiresConsent: true,
  },
  {
    purposeTag: 'OPERATIONS',
    allowedDataDomains: ['operations', 'retail_channels'],
    prohibitedDataDomains: ['aml_fcc', 'credit_risk', 'finance_reporting'],
    maxDataRetentionDays: 730,
    requiresConsent: false,
  },
];

export function evaluatePIIMaskingPolicy(
  piiLevel: string,
  userRole: string,
  hasJustification: boolean
): PolicyDecision {
  const level = piiLevel.toUpperCase() as PIIMaskingLevel;
  const policy = PII_MASKING_POLICIES[level];

  if (!policy) {
    return {
      allow: true,
      requiresApproval: false,
      reason: 'Unknown PII level, defaulting to allow',
      policyId: 'pii-masking-unknown',
      policyName: 'PII Masking - Unknown Level',
    };
  }

  if (!policy.allowedRoles.includes(userRole)) {
    return {
      allow: false,
      requiresApproval: true,
      reason: `User role '${userRole}' not permitted for ${level} PII data. Allowed roles: ${policy.allowedRoles.join(', ')}`,
      policyId: `pii-masking-${level.toLowerCase()}`,
      policyName: `PII Masking - ${level}`,
    };
  }

  if (policy.requiresJustification && !hasJustification) {
    return {
      allow: false,
      requiresApproval: false,
      reason: `Access to ${level} PII data requires business justification`,
      policyId: `pii-masking-${level.toLowerCase()}`,
      policyName: `PII Masking - ${level}`,
    };
  }

  return {
    allow: true,
    requiresApproval: false,
    reason: `Access granted with ${level} PII masking applied`,
    policyId: `pii-masking-${level.toLowerCase()}`,
    policyName: `PII Masking - ${level}`,
    metadata: {
      maskingRules: policy.maskingRules,
    },
  };
}

export function evaluateCrossBorderPolicy(
  sourceJurisdiction: Jurisdiction,
  targetJurisdiction: Jurisdiction,
  userRole: string
): PolicyDecision {
  if (sourceJurisdiction === targetJurisdiction) {
    return {
      allow: true,
      requiresApproval: false,
      reason: 'Same jurisdiction data access',
      policyId: 'cross-border-same-jurisdiction',
      policyName: 'Cross-Border - Same Jurisdiction',
    };
  }

  const policy = CROSS_BORDER_POLICIES.find(
    p => p.sourceJurisdiction === sourceJurisdiction && p.targetJurisdiction === targetJurisdiction
  );

  if (!policy) {
    return {
      allow: false,
      requiresApproval: true,
      reason: `No cross-border policy defined for ${sourceJurisdiction} -> ${targetJurisdiction}. Default deny with approval required.`,
      policyId: 'cross-border-undefined',
      policyName: 'Cross-Border - Undefined Route',
    };
  }

  if (!policy.allowed) {
    return {
      allow: false,
      requiresApproval: policy.requiresApproval && userRole === 'admin',
      reason: `Cross-border data transfer from ${sourceJurisdiction} to ${targetJurisdiction} is prohibited. ${policy.restrictions?.join('; ')}`,
      policyId: `cross-border-${sourceJurisdiction}-${targetJurisdiction}`,
      policyName: `Cross-Border - ${sourceJurisdiction} to ${targetJurisdiction}`,
    };
  }

  if (policy.requiresApproval && userRole !== 'admin') {
    return {
      allow: false,
      requiresApproval: true,
      reason: `Cross-border transfer requires approval. Legal basis: ${policy.legalBasis}. Restrictions: ${policy.restrictions?.join('; ')}`,
      policyId: `cross-border-${sourceJurisdiction}-${targetJurisdiction}`,
      policyName: `Cross-Border - ${sourceJurisdiction} to ${targetJurisdiction}`,
    };
  }

  return {
    allow: true,
    requiresApproval: false,
    reason: `Cross-border transfer permitted under ${policy.legalBasis}`,
    policyId: `cross-border-${sourceJurisdiction}-${targetJurisdiction}`,
    policyName: `Cross-Border - ${sourceJurisdiction} to ${targetJurisdiction}`,
    metadata: {
      legalBasis: policy.legalBasis,
      restrictions: policy.restrictions,
    },
  };
}

export function evaluatePurposeLimitationPolicy(
  purposeTag: PurposeTag | undefined,
  dataDomain: string,
  userRole: string
): PolicyDecision {
  if (!purposeTag) {
    return {
      allow: false,
      requiresApproval: false,
      reason: 'Purpose tag is required for all data access requests',
      policyId: 'purpose-limitation-missing',
      policyName: 'Purpose Limitation - Missing Tag',
    };
  }

  const policy = PURPOSE_LIMITATION_POLICIES.find(p => p.purposeTag === purposeTag);

  if (!policy) {
    return {
      allow: false,
      requiresApproval: true,
      reason: `Unknown purpose tag: ${purposeTag}. Approval required.`,
      policyId: 'purpose-limitation-unknown',
      policyName: 'Purpose Limitation - Unknown Purpose',
    };
  }

  if (policy.prohibitedDataDomains.includes(dataDomain)) {
    return {
      allow: false,
      requiresApproval: false,
      reason: `Data domain '${dataDomain}' is prohibited for purpose '${purposeTag}'`,
      policyId: `purpose-limitation-${purposeTag}`,
      policyName: `Purpose Limitation - ${purposeTag}`,
    };
  }

  if (!policy.allowedDataDomains.includes(dataDomain)) {
    return {
      allow: false,
      requiresApproval: true,
      reason: `Data domain '${dataDomain}' not explicitly allowed for purpose '${purposeTag}'. Approval required.`,
      policyId: `purpose-limitation-${purposeTag}`,
      policyName: `Purpose Limitation - ${purposeTag}`,
    };
  }

  if (policy.requiresConsent) {
    return {
      allow: true,
      requiresApproval: false,
      reason: `Access permitted for ${purposeTag}. User consent verification required.`,
      policyId: `purpose-limitation-${purposeTag}`,
      policyName: `Purpose Limitation - ${purposeTag}`,
      metadata: {
        requiresConsent: true,
        maxRetentionDays: policy.maxDataRetentionDays,
      },
    };
  }

  return {
    allow: true,
    requiresApproval: false,
    reason: `Access permitted for legitimate purpose: ${purposeTag}`,
    policyId: `purpose-limitation-${purposeTag}`,
    policyName: `Purpose Limitation - ${purposeTag}`,
    metadata: {
      maxRetentionDays: policy.maxDataRetentionDays,
    },
  };
}
