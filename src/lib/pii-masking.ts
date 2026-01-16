import type { Dataset } from './types';
import type { PolicyDecision } from './aureus-types';

export type MaskingStrategy = 'FULL' | 'PARTIAL' | 'HASH' | 'REDACT';

export interface MaskedField {
  field: string;
  strategy: MaskingStrategy;
  reason: string;
  policyId: string;
  policyName: string;
}

export interface MaskingPolicySummary {
  policyId: string;
  policyName: string;
  reason: string;
}

interface MaskingRule {
  fieldPatterns: string[];
  maskingStrategy: MaskingStrategy;
}

export interface MaskingResult {
  maskedResults: Array<Record<string, unknown>>;
  maskedFields: MaskedField[];
  policySummary?: MaskingPolicySummary;
}

const DEFAULT_MASKING_BY_LEVEL: Record<string, MaskingStrategy | undefined> = {
  HIGH: 'REDACT',
  MEDIUM: 'PARTIAL',
  LOW: 'PARTIAL',
};

const MASKED_PLACEHOLDER = '[REDACTED]';

const normalizeKey = (value: string): string => value.trim().toLowerCase();

const hashValue = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16).padStart(8, '0')}`;
};

const maskValue = (value: unknown, strategy: MaskingStrategy): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  const stringValue = String(value);

  switch (strategy) {
    case 'FULL': {
      const length = Math.max(stringValue.length, 4);
      return '•'.repeat(length);
    }
    case 'PARTIAL': {
      if (stringValue.length <= 4) {
        return '•'.repeat(Math.max(stringValue.length, 4));
      }
      const visible = stringValue.slice(-4);
      return `${'•'.repeat(Math.max(stringValue.length - 4, 4))}${visible}`;
    }
    case 'HASH':
      return hashValue(stringValue);
    case 'REDACT':
    default:
      return MASKED_PLACEHOLDER;
  }
};

const resolveMaskingDecision = (decisions: PolicyDecision[]): PolicyDecision | undefined =>
  decisions.find(decision => decision.policyId.startsWith('pii-masking-'));

const resolveMaskingStrategy = (
  fieldName: string,
  rules: MaskingRule[],
  fallbackStrategy?: MaskingStrategy
): MaskingStrategy | undefined => {
  const normalized = normalizeKey(fieldName);
  const matchedRule = rules.find(rule =>
    rule.fieldPatterns.some(pattern => normalized.includes(normalizeKey(pattern)))
  );
  return matchedRule?.maskingStrategy ?? fallbackStrategy;
};

export function applyPiiMasking(
  results: Array<Record<string, unknown>>,
  datasets: Dataset[],
  decisions: PolicyDecision[]
): MaskingResult {
  const decision = resolveMaskingDecision(decisions);
  const maskingRules = (decision?.metadata?.maskingRules as MaskingRule[] | undefined) ?? [];
  const policyLevel = decision?.policyId?.replace('pii-masking-', '').toUpperCase() ?? '';
  const fallbackStrategy = DEFAULT_MASKING_BY_LEVEL[policyLevel];

  if (!decision) {
    return { maskedResults: results, maskedFields: [] };
  }

  const shouldMask = decision.allow || decision.requiresApproval;
  if (!shouldMask) {
    return {
      maskedResults: results,
      maskedFields: [],
      policySummary: {
        policyId: decision.policyId,
        policyName: decision.policyName,
        reason: decision.reason,
      },
    };
  }

  const piiColumns = new Map<string, { name: string }>();
  datasets.forEach(dataset => {
    dataset.schema
      .filter(column => column.pii)
      .forEach(column => {
        piiColumns.set(normalizeKey(column.name), { name: column.name });
      });
  });

  if (piiColumns.size === 0) {
    return {
      maskedResults: results,
      maskedFields: [],
      policySummary: {
        policyId: decision.policyId,
        policyName: decision.policyName,
        reason: decision.reason,
      },
    };
  }

  const maskedFieldsMap = new Map<string, MaskedField>();
  const maskedResults = results.map(row => {
    const nextRow: Record<string, unknown> = { ...row };
    Object.keys(nextRow).forEach(key => {
      const piiColumn = piiColumns.get(normalizeKey(key));
      if (!piiColumn) {
        return;
      }
      const strategy = resolveMaskingStrategy(key, maskingRules, fallbackStrategy);
      if (!strategy) {
        return;
      }
      nextRow[key] = maskValue(nextRow[key], strategy);
      if (!maskedFieldsMap.has(normalizeKey(key))) {
        maskedFieldsMap.set(normalizeKey(key), {
          field: key,
          strategy,
          reason: decision.reason,
          policyId: decision.policyId,
          policyName: decision.policyName,
        });
      }
    });
    return nextRow;
  });

  return {
    maskedResults,
    maskedFields: Array.from(maskedFieldsMap.values()),
    policySummary: {
      policyId: decision.policyId,
      policyName: decision.policyName,
      reason: decision.reason,
    },
  };
}
