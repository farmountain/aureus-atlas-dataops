import { describe, it, expect } from 'vitest';
import {
  validateDatasetContract,
  validateDQRules,
  validatePolicies,
  validateSLAs,
  validateAllSpecs,
  type DatasetContractSpec,
  type DQRuleSpec,
  type PolicySpec,
  type SLASpec,
  type ConfigDrafts
} from '../config-schemas';

describe('Config Schema Validators', () => {
  describe('validateDatasetContract', () => {
    it('should pass validation for valid contract', () => {
      const contract: DatasetContractSpec = {
        name: 'test_dataset',
        domain: 'credit_risk',
        owner: 'test@bank.com',
        description: 'Test dataset',
        schema: [
          {
            name: 'id',
            type: 'string',
            nullable: false,
            pii: false,
            description: 'ID column'
          }
        ],
        piiLevel: 'low',
        jurisdiction: 'US',
        freshnessSLA: 24,
        tags: ['test']
      };

      const result = validateDatasetContract(contract);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing name', () => {
      const contract: DatasetContractSpec = {
        name: '',
        domain: 'credit_risk',
        owner: 'test@bank.com',
        description: 'Test dataset',
        schema: [],
        piiLevel: 'low',
        jurisdiction: 'US',
        freshnessSLA: 24,
        tags: []
      };

      const result = validateDatasetContract(contract);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should fail validation for invalid owner email', () => {
      const contract: DatasetContractSpec = {
        name: 'test_dataset',
        domain: 'credit_risk',
        owner: 'invalid-email',
        description: 'Test dataset',
        schema: [{ name: 'id', type: 'string', nullable: false, pii: false }],
        piiLevel: 'low',
        jurisdiction: 'US',
        freshnessSLA: 24,
        tags: []
      };

      const result = validateDatasetContract(contract);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'owner')).toBe(true);
    });

    it('should fail validation for empty schema', () => {
      const contract: DatasetContractSpec = {
        name: 'test_dataset',
        domain: 'credit_risk',
        owner: 'test@bank.com',
        description: 'Test dataset',
        schema: [],
        piiLevel: 'low',
        jurisdiction: 'US',
        freshnessSLA: 24,
        tags: []
      };

      const result = validateDatasetContract(contract);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'schema')).toBe(true);
    });

    it('should warn when PIILevel is high but no PII columns', () => {
      const contract: DatasetContractSpec = {
        name: 'test_dataset',
        domain: 'credit_risk',
        owner: 'test@bank.com',
        description: 'Test dataset',
        schema: [
          { name: 'id', type: 'string', nullable: false, pii: false }
        ],
        piiLevel: 'high',
        jurisdiction: 'US',
        freshnessSLA: 24,
        tags: []
      };

      const result = validateDatasetContract(contract);
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.field === 'piiLevel')).toBe(true);
    });
  });

  describe('validateDQRules', () => {
    it('should pass validation for valid rules', () => {
      const rules: DQRuleSpec[] = [
        {
          ruleName: 'id_not_null',
          ruleType: 'completeness',
          description: 'ID must not be null',
          column: 'id',
          condition: 'id IS NOT NULL',
          threshold: 100,
          severity: 'error',
          enabled: true
        }
      ];

      const result = validateDQRules(rules);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing rule name', () => {
      const rules: DQRuleSpec[] = [
        {
          ruleName: '',
          ruleType: 'completeness',
          description: 'Test',
          condition: 'test',
          threshold: 100,
          severity: 'error',
          enabled: true
        }
      ];

      const result = validateDQRules(rules);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Rule name'))).toBe(true);
    });

    it('should fail validation for invalid threshold', () => {
      const rules: DQRuleSpec[] = [
        {
          ruleName: 'test_rule',
          ruleType: 'completeness',
          description: 'Test',
          condition: 'test',
          threshold: 150,
          severity: 'error',
          enabled: true
        }
      ];

      const result = validateDQRules(rules);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Threshold'))).toBe(true);
    });
  });

  describe('validatePolicies', () => {
    it('should pass validation for valid policies', () => {
      const policies: PolicySpec[] = [
        {
          policyId: 'test_policy',
          policyName: 'Test Policy',
          policyType: 'access',
          description: 'Test policy',
          scope: { domains: ['credit_risk'] },
          condition: 'test condition',
          action: 'allow',
          effectiveDate: new Date().toISOString(),
          priority: 100
        }
      ];

      const result = validatePolicies(policies);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for require_approval without approvers', () => {
      const policies: PolicySpec[] = [
        {
          policyId: 'test_policy',
          policyName: 'Test Policy',
          policyType: 'access',
          description: 'Test policy',
          scope: {},
          condition: 'test',
          action: 'require_approval',
          effectiveDate: new Date().toISOString(),
          priority: 100
        }
      ];

      const result = validatePolicies(policies);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Approvers'))).toBe(true);
    });
  });

  describe('validateSLAs', () => {
    it('should pass validation for valid SLAs', () => {
      const slas: SLASpec[] = [
        {
          slaName: 'Test SLA',
          datasetName: 'test_dataset',
          metrics: {
            freshness: {
              target: 24,
              unit: 'hours',
              measurement: 'last_update_age'
            }
          },
          alerting: {
            channels: ['email'],
            recipients: ['test@bank.com'],
            threshold: 90
          },
          owner: 'test@bank.com',
          reviewCadence: 'monthly'
        }
      ];

      const result = validateSLAs(slas);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing metrics', () => {
      const slas: SLASpec[] = [
        {
          slaName: 'Test SLA',
          datasetName: 'test_dataset',
          metrics: {},
          alerting: {
            channels: ['email'],
            recipients: ['test@bank.com'],
            threshold: 90
          },
          owner: 'test@bank.com',
          reviewCadence: 'monthly'
        }
      ];

      const result = validateSLAs(slas);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('metric'))).toBe(true);
    });
  });

  describe('validateAllSpecs', () => {
    it('should validate complete config drafts', () => {
      const drafts: ConfigDrafts = {
        datasetContract: {
          name: 'test_dataset',
          domain: 'credit_risk',
          owner: 'test@bank.com',
          description: 'Test',
          schema: [{ name: 'id', type: 'string', nullable: false, pii: false }],
          piiLevel: 'low',
          jurisdiction: 'US',
          freshnessSLA: 24,
          tags: []
        },
        dqRules: [
          {
            ruleName: 'test_rule',
            ruleType: 'completeness',
            description: 'Test',
            condition: 'test',
            threshold: 100,
            severity: 'error',
            enabled: true
          }
        ],
        policies: [
          {
            policyId: 'test_policy',
            policyName: 'Test Policy',
            policyType: 'access',
            description: 'Test',
            scope: {},
            condition: 'test',
            action: 'allow',
            effectiveDate: new Date().toISOString(),
            priority: 100
          }
        ],
        slas: [
          {
            slaName: 'Test SLA',
            datasetName: 'test_dataset',
            metrics: {
              freshness: {
                target: 24,
                unit: 'hours',
                measurement: 'last_update_age'
              }
            },
            alerting: {
              channels: ['email'],
              recipients: ['test@bank.com'],
              threshold: 90
            },
            owner: 'test@bank.com',
            reviewCadence: 'monthly'
          }
        ]
      };

      const result = validateAllSpecs(drafts);
      expect(result.valid).toBe(true);
    });

    it('should aggregate errors from all spec types', () => {
      const drafts: ConfigDrafts = {
        datasetContract: {
          name: '',
          domain: 'credit_risk',
          owner: 'invalid',
          description: 'Test',
          schema: [],
          piiLevel: 'low',
          jurisdiction: 'US',
          freshnessSLA: 24,
          tags: []
        },
        dqRules: [
          {
            ruleName: '',
            ruleType: 'completeness',
            description: 'Test',
            condition: '',
            threshold: 150,
            severity: 'error',
            enabled: true
          }
        ]
      };

      const result = validateAllSpecs(drafts);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
