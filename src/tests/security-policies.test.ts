import { describe, it, expect } from 'vitest';
import {
  evaluatePIIMaskingPolicy,
  evaluateCrossBorderPolicy,
  evaluatePurposeLimitationPolicy,
  PII_MASKING_POLICIES,
  CROSS_BORDER_POLICIES,
  PURPOSE_LIMITATION_POLICIES,
  type Jurisdiction,
  type PurposeTag,
} from '../lib/security-policies';
import { PolicyEvaluator } from '../lib/policy-evaluator';
import type { ActionContext } from '../lib/aureus-types';

describe('PII Masking Policy', () => {
  it('should allow LOW PII access for all roles', () => {
    const result = evaluatePIIMaskingPolicy('low', 'viewer', false);
    expect(result.allow).toBe(true);
    expect(result.requiresApproval).toBe(false);
  });

  it('should block MEDIUM PII access for viewers without justification', () => {
    const result = evaluatePIIMaskingPolicy('medium', 'viewer', false);
    expect(result.allow).toBe(false);
  });

  it('should allow MEDIUM PII access for analysts with justification', () => {
    const result = evaluatePIIMaskingPolicy('medium', 'analyst', true);
    expect(result.allow).toBe(true);
    expect(result.metadata?.maskingRules).toBeDefined();
  });

  it('should block HIGH PII access for analysts even with justification', () => {
    const result = evaluatePIIMaskingPolicy('high', 'analyst', true);
    expect(result.allow).toBe(false);
  });

  it('should allow HIGH PII access for approvers with justification', () => {
    const result = evaluatePIIMaskingPolicy('high', 'approver', true);
    expect(result.allow).toBe(true);
  });

  it('should block HIGH PII access without justification', () => {
    const result = evaluatePIIMaskingPolicy('high', 'admin', false);
    expect(result.allow).toBe(false);
    expect(result.reason).toContain('requires business justification');
  });

  it('should have appropriate masking rules for each level', () => {
    expect(PII_MASKING_POLICIES.LOW.maskingRules).toHaveLength(0);
    expect(PII_MASKING_POLICIES.MEDIUM.maskingRules.length).toBeGreaterThan(0);
    expect(PII_MASKING_POLICIES.HIGH.maskingRules.length).toBeGreaterThan(0);
  });
});

describe('Cross-Border Policy', () => {
  it('should allow same jurisdiction access', () => {
    const result = evaluateCrossBorderPolicy('US', 'US', 'analyst');
    expect(result.allow).toBe(true);
    expect(result.requiresApproval).toBe(false);
  });

  it('should require approval for EU to US transfer for non-admins', () => {
    const result = evaluateCrossBorderPolicy('EU', 'US', 'analyst');
    expect(result.allow).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.reason).toContain('Standard Contractual Clauses');
  });

  it('should allow EU to US transfer for admins', () => {
    const result = evaluateCrossBorderPolicy('EU', 'US', 'admin');
    expect(result.allow).toBe(true);
  });

  it('should block EU to APAC transfer by default', () => {
    const result = evaluateCrossBorderPolicy('EU', 'APAC', 'analyst');
    expect(result.allow).toBe(false);
  });

  it('should provide legal basis in metadata when allowed', () => {
    const result = evaluateCrossBorderPolicy('US', 'EU', 'admin');
    if (result.allow) {
      expect(result.metadata?.legalBasis).toBeDefined();
    }
  });

  it('should default to deny for undefined jurisdiction pairs', () => {
    const result = evaluateCrossBorderPolicy('US', 'GLOBAL' as Jurisdiction, 'analyst');
    expect(result.allow).toBe(false);
    expect(result.requiresApproval).toBe(true);
  });

  it('should have policies for key jurisdiction pairs', () => {
    const hasEUtoUS = CROSS_BORDER_POLICIES.some(
      p => p.sourceJurisdiction === 'EU' && p.targetJurisdiction === 'US'
    );
    const hasUStoEU = CROSS_BORDER_POLICIES.some(
      p => p.sourceJurisdiction === 'US' && p.targetJurisdiction === 'EU'
    );
    expect(hasEUtoUS).toBe(true);
    expect(hasUStoEU).toBe(true);
  });
});

describe('Purpose Limitation Policy', () => {
  it('should block access without purpose tag', () => {
    const result = evaluatePurposeLimitationPolicy(undefined, 'credit_risk', 'analyst');
    expect(result.allow).toBe(false);
    expect(result.reason).toContain('Purpose tag is required');
  });

  it('should allow CREDIT_RISK_ANALYSIS for credit_risk domain', () => {
    const result = evaluatePurposeLimitationPolicy('CREDIT_RISK_ANALYSIS', 'credit_risk', 'analyst');
    expect(result.allow).toBe(true);
  });

  it('should block CREDIT_RISK_ANALYSIS for aml_fcc domain', () => {
    const result = evaluatePurposeLimitationPolicy('CREDIT_RISK_ANALYSIS', 'aml_fcc', 'analyst');
    expect(result.allow).toBe(false);
    expect(result.reason).toContain('prohibited');
  });

  it('should allow AML_INVESTIGATION for aml_fcc domain', () => {
    const result = evaluatePurposeLimitationPolicy('AML_INVESTIGATION', 'aml_fcc', 'analyst');
    expect(result.allow).toBe(true);
  });

  it('should block MARKETING_ANALYTICS for credit_risk domain', () => {
    const result = evaluatePurposeLimitationPolicy('MARKETING_ANALYTICS', 'credit_risk', 'analyst');
    expect(result.allow).toBe(false);
  });

  it('should require consent for CUSTOMER_SERVICE purpose', () => {
    const result = evaluatePurposeLimitationPolicy('CUSTOMER_SERVICE', 'retail_channels', 'analyst');
    expect(result.allow).toBe(true);
    expect(result.metadata?.requiresConsent).toBe(true);
  });

  it('should require approval for unknown purpose tags', () => {
    const result = evaluatePurposeLimitationPolicy('UNKNOWN_PURPOSE' as PurposeTag, 'credit_risk', 'analyst');
    expect(result.allow).toBe(false);
    expect(result.requiresApproval).toBe(true);
  });

  it('should have different retention periods by purpose', () => {
    const creditRiskPolicy = PURPOSE_LIMITATION_POLICIES.find(p => p.purposeTag === 'CREDIT_RISK_ANALYSIS');
    const marketingPolicy = PURPOSE_LIMITATION_POLICIES.find(p => p.purposeTag === 'MARKETING_ANALYTICS');
    
    expect(creditRiskPolicy?.maxDataRetentionDays).toBeDefined();
    expect(marketingPolicy?.maxDataRetentionDays).toBeDefined();
    expect(creditRiskPolicy?.maxDataRetentionDays).not.toBe(marketingPolicy?.maxDataRetentionDays);
  });
});

describe('Policy Evaluator Integration', () => {
  const evaluator = new PolicyEvaluator();

  it('should evaluate all policy rules', () => {
    const context: ActionContext = {
      actionType: 'query_execute',
      actor: 'test-user',
      role: 'analyst',
      environment: 'dev',
      metadata: {
        domain: 'credit_risk',
        piiLevel: 'low',
        jurisdiction: 'US',
      },
    };

    const result = evaluator.evaluateAll(context);
    expect(result.decisions).toBeDefined();
    expect(result.decisions.length).toBeGreaterThan(0);
  });

  it('should block HIGH PII access through policy evaluator', () => {
    const context: ActionContext = {
      actionType: 'query_execute',
      actor: 'test-user',
      role: 'viewer',
      environment: 'dev',
      metadata: {
        domain: 'aml_fcc',
        piiLevel: 'high',
        jurisdiction: 'EU',
        businessJustification: false,
      },
    };

    const result = evaluator.evaluateAll(context);
    const piiDecision = result.decisions.find(d => d.policyId === 'pii-masking-enforcement');
    expect(piiDecision).toBeDefined();
    expect(piiDecision?.allow).toBe(false);
  });

  it('should enforce purpose limitation through policy evaluator', () => {
    const context: ActionContext = {
      actionType: 'query_execute',
      actor: 'test-user',
      role: 'analyst',
      environment: 'dev',
      metadata: {
        domain: 'aml_fcc',
        piiLevel: 'low',
        jurisdiction: 'US',
        purposeTag: 'MARKETING_ANALYTICS',
      },
    };

    const result = evaluator.evaluateAll(context);
    const purposeDecision = result.decisions.find(d => d.policyId === 'purpose-limitation-enforcement');
    expect(purposeDecision).toBeDefined();
    expect(purposeDecision?.allow).toBe(false);
  });

  it('should enforce cross-border restrictions through policy evaluator', () => {
    const context: ActionContext = {
      actionType: 'query_execute',
      actor: 'test-user',
      role: 'analyst',
      environment: 'dev',
      metadata: {
        domain: 'credit_risk',
        piiLevel: 'low',
        sourceJurisdiction: 'EU',
        targetJurisdiction: 'APAC',
      },
    };

    const result = evaluator.evaluateAll(context);
    const crossBorderDecision = result.decisions.find(d => d.policyId === 'cross-border-enforcement');
    expect(crossBorderDecision).toBeDefined();
    expect(crossBorderDecision?.allow).toBe(false);
  });

  it('should allow compliant queries', () => {
    const context: ActionContext = {
      actionType: 'query_execute',
      actor: 'test-user',
      role: 'analyst',
      environment: 'dev',
      metadata: {
        domain: 'credit_risk',
        piiLevel: 'low',
        jurisdiction: 'US',
        purposeTag: 'CREDIT_RISK_ANALYSIS',
        sourceJurisdiction: 'US',
        targetJurisdiction: 'US',
      },
    };

    const result = evaluator.evaluateAll(context);
    expect(result.allow || result.requiresApproval).toBe(true);
  });
});

describe('Policy Coverage', () => {
  it('should have PII masking policies for all levels', () => {
    expect(PII_MASKING_POLICIES.LOW).toBeDefined();
    expect(PII_MASKING_POLICIES.MEDIUM).toBeDefined();
    expect(PII_MASKING_POLICIES.HIGH).toBeDefined();
  });

  it('should have cross-border policies for major routes', () => {
    expect(CROSS_BORDER_POLICIES.length).toBeGreaterThan(3);
  });

  it('should have purpose limitation policies for key use cases', () => {
    const purposes: PurposeTag[] = [
      'CREDIT_RISK_ANALYSIS',
      'AML_INVESTIGATION',
      'REGULATORY_REPORTING',
      'FRAUD_DETECTION',
    ];

    for (const purpose of purposes) {
      const policy = PURPOSE_LIMITATION_POLICIES.find(p => p.purposeTag === purpose);
      expect(policy).toBeDefined();
    }
  });

  it('should have comprehensive domain coverage in purpose policies', () => {
    const allDomains = new Set<string>();
    PURPOSE_LIMITATION_POLICIES.forEach(policy => {
      policy.allowedDataDomains.forEach(domain => allDomains.add(domain));
      policy.prohibitedDataDomains.forEach(domain => allDomains.add(domain));
    });
    
    expect(allDomains.size).toBeGreaterThan(5);
  });
});
