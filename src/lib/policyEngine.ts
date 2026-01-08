import type { Dataset, PolicyCheck, Policy } from './types';
import { SAMPLE_POLICIES } from './mockData';

export class PolicyEngine {
  private policies: Policy[] = SAMPLE_POLICIES;

  async evaluatePolicies(
    action: string,
    context: {
      datasets?: Dataset[];
      userRole?: string;
      targetEnv?: string;
    }
  ): Promise<PolicyCheck[]> {
    const checks: PolicyCheck[] = [];

    for (const policy of this.policies) {
      const result = this.evaluatePolicy(policy, action, context);
      if (result) {
        checks.push(result);
      }
    }

    return checks;
  }

  private evaluatePolicy(
    policy: Policy,
    action: string,
    context: {
      datasets?: Dataset[];
      userRole?: string;
      targetEnv?: string;
    }
  ): PolicyCheck | null {
    let applies = false;
    let result: 'allow' | 'block' | 'require_approval' = 'allow';
    let reason = '';

    if (policy.type === 'access' && action === 'query') {
      if (!context.datasets) return null;

      if (policy.id === 'pol-001') {
        const hasHighPII = context.datasets.some(ds => ds.piiLevel === 'high');
        if (hasHighPII) {
          applies = true;
          result = policy.action as 'require_approval';
          reason = `Query accesses high-PII datasets: ${context.datasets
            .filter(ds => ds.piiLevel === 'high')
            .map(ds => ds.name)
            .join(', ')}. Approval required per ${policy.name}.`;
        }
      }

      if (policy.id === 'pol-002') {
        const jurisdictions = new Set(context.datasets.map(ds => ds.jurisdiction));
        const isMultiJurisdiction = 
          jurisdictions.size > 1 || 
          context.datasets.some(ds => ds.jurisdiction === 'multi');
        
        if (isMultiJurisdiction && context.userRole !== 'admin') {
          applies = true;
          result = policy.action as 'require_approval';
          reason = `Query spans multiple jurisdictions: ${Array.from(jurisdictions).join(', ')}. Approval required per ${policy.name}.`;
        }
      }

      if (policy.id === 'pol-004') {
        const hasAMLData = context.datasets.some(ds => ds.domain === 'aml_fcc');
        if (hasAMLData) {
          applies = true;
          result = policy.action as 'require_approval';
          reason = `Query accesses AML/FCC data. Approval required per ${policy.name}.`;
        }
      }
    }

    if (policy.type === 'approval' && action === 'pipeline_deploy') {
      if (policy.id === 'pol-003' && context.targetEnv === 'production') {
        applies = true;
        result = policy.action as 'require_approval';
        reason = `Production pipeline deployment requires approval per ${policy.name}.`;
      }
    }

    if (!applies) {
      return null;
    }

    return {
      policyId: policy.id,
      policyName: policy.name,
      result,
      reason,
      evaluated: new Date().toISOString(),
    };
  }

  getBlockingPolicies(checks: PolicyCheck[]): PolicyCheck[] {
    return checks.filter(c => c.result === 'block');
  }

  requiresApproval(checks: PolicyCheck[]): boolean {
    return checks.some(c => c.result === 'require_approval');
  }

  isAllowed(checks: PolicyCheck[]): boolean {
    return checks.length === 0 || checks.every(c => c.result === 'allow');
  }
}

export const policyEngine = new PolicyEngine();
