import { describe, it, expect } from 'vitest';
import { applyPiiMasking } from '../pii-masking';
import type { Dataset } from '../types';
import type { PolicyDecision } from '../aureus-types';

describe('applyPiiMasking', () => {
  it('masks high PII fields and records policy rationale', () => {
    const dataset: Dataset = {
      id: 'ds-high-pii',
      name: 'customer_profile',
      domain: 'retail',
      owner: 'retail-team',
      description: 'Customer profile data',
      schema: [
        { name: 'customer_id', type: 'string', nullable: false, pii: false },
        { name: 'email', type: 'string', nullable: false, pii: true },
        { name: 'ssn', type: 'string', nullable: true, pii: true },
        { name: 'amount', type: 'decimal', nullable: false, pii: false },
      ],
      piiLevel: 'high',
      jurisdiction: 'US',
      freshnessSLA: 24,
      lastRefresh: new Date().toISOString(),
      tags: ['pii'],
    };

    const policyDecision: PolicyDecision = {
      allow: true,
      requiresApproval: false,
      reason: 'Access granted with HIGH PII masking applied',
      policyId: 'pii-masking-high',
      policyName: 'PII Masking - HIGH',
      metadata: {
        maskingRules: [
          { fieldPatterns: ['ssn'], maskingStrategy: 'REDACT' },
          { fieldPatterns: ['email'], maskingStrategy: 'HASH' },
        ],
      },
    };

    const results = [
      { customer_id: 'CUST-001', email: 'user@example.com', ssn: '123-45-6789', amount: 5000 },
    ];

    const maskingResult = applyPiiMasking(results, [dataset], [policyDecision]);

    expect(maskingResult.maskedResults[0].ssn).toBe('[REDACTED]');
    expect(maskingResult.maskedResults[0].email).toMatch(/^hash_/);
    expect(maskingResult.maskedResults[0].amount).toBe(5000);
    expect(maskingResult.maskedFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email', strategy: 'HASH' }),
        expect.objectContaining({ field: 'ssn', strategy: 'REDACT' }),
      ])
    );
    expect(maskingResult.policySummary).toEqual({
      policyId: 'pii-masking-high',
      policyName: 'PII Masking - HIGH',
      reason: 'Access granted with HIGH PII masking applied',
    });
  });
});
