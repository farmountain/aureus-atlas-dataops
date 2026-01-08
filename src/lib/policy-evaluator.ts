import type { UserRole, Domain, PIILevel } from './types';
import type { ActionContext, PolicyDecision, Environment } from './aureus-types';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  evaluator: (context: ActionContext) => PolicyDecision;
}

const POLICY_RULES: PolicyRule[] = [
  {
    id: 'prod-write-admin-only',
    name: 'Production Write - Admin Only',
    description: 'Only admins can write to production',
    evaluator: (context: ActionContext): PolicyDecision => {
      const isProdWrite = context.environment === 'prod' && 
        ['dataset_create', 'dataset_update', 'dataset_delete', 'pipeline_deploy', 'policy_create', 'policy_update'].includes(context.actionType);
      
      if (isProdWrite && context.role !== 'admin') {
        return {
          allow: false,
          requiresApproval: context.role === 'approver',
          reason: 'Production writes require admin role or approver review',
          policyId: 'prod-write-admin-only',
          policyName: 'Production Write - Admin Only',
        };
      }
      
      return {
        allow: true,
        requiresApproval: false,
        reason: 'Action permitted',
        policyId: 'prod-write-admin-only',
        policyName: 'Production Write - Admin Only',
      };
    },
  },
  {
    id: 'high-pii-approval-required',
    name: 'High PII - Approval Required',
    description: 'High PII operations require approval',
    evaluator: (context: ActionContext): PolicyDecision => {
      const isHighPII = context.metadata.piiLevel === 'high';
      
      if (isHighPII && context.role !== 'admin') {
        return {
          allow: false,
          requiresApproval: true,
          reason: 'High PII access requires approval',
          policyId: 'high-pii-approval-required',
          policyName: 'High PII - Approval Required',
        };
      }
      
      return {
        allow: true,
        requiresApproval: false,
        reason: 'No high PII involved',
        policyId: 'high-pii-approval-required',
        policyName: 'High PII - Approval Required',
      };
    },
  },
  {
    id: 'cross-jurisdiction-restricted',
    name: 'Cross Jurisdiction Restricted',
    description: 'Multi-jurisdiction operations require approval',
    evaluator: (context: ActionContext): PolicyDecision => {
      const isMultiJurisdiction = context.metadata.jurisdiction === 'multi';
      
      if (isMultiJurisdiction && context.role === 'viewer') {
        return {
          allow: false,
          requiresApproval: false,
          reason: 'Viewers cannot access multi-jurisdiction data',
          policyId: 'cross-jurisdiction-restricted',
          policyName: 'Cross Jurisdiction Restricted',
        };
      }
      
      if (isMultiJurisdiction && context.role === 'analyst') {
        return {
          allow: false,
          requiresApproval: true,
          reason: 'Multi-jurisdiction access requires approval for analysts',
          policyId: 'cross-jurisdiction-restricted',
          policyName: 'Cross Jurisdiction Restricted',
        };
      }
      
      return {
        allow: true,
        requiresApproval: false,
        reason: 'Single jurisdiction or sufficient privileges',
        policyId: 'cross-jurisdiction-restricted',
        policyName: 'Cross Jurisdiction Restricted',
      };
    },
  },
  {
    id: 'pipeline-deploy-approval',
    name: 'Pipeline Deploy - Approval Required',
    description: 'Pipeline deployments to UAT/Prod require approval',
    evaluator: (context: ActionContext): PolicyDecision => {
      const isPipelineDeploy = context.actionType === 'pipeline_deploy';
      const isUatOrProd = ['uat', 'prod'].includes(context.environment);
      
      if (isPipelineDeploy && isUatOrProd && context.role !== 'admin') {
        return {
          allow: false,
          requiresApproval: true,
          reason: `Pipeline deployment to ${context.environment} requires approval`,
          policyId: 'pipeline-deploy-approval',
          policyName: 'Pipeline Deploy - Approval Required',
        };
      }
      
      return {
        allow: true,
        requiresApproval: false,
        reason: 'Dev environment or admin role',
        policyId: 'pipeline-deploy-approval',
        policyName: 'Pipeline Deploy - Approval Required',
      };
    },
  },
  {
    id: 'budget-enforcement',
    name: 'Budget Enforcement',
    description: 'Token and query cost budgets must not be exceeded',
    evaluator: (context: ActionContext): PolicyDecision => {
      const tokenEstimate = (context.metadata.tokenCostEstimate as number) || 0;
      const queryCostEstimate = (context.metadata.queryCostEstimate as number) || 0;
      
      if (tokenEstimate > 10000 || queryCostEstimate > 100) {
        return {
          allow: false,
          requiresApproval: true,
          reason: `Estimated cost exceeds budget (tokens: ${tokenEstimate}, query cost: ${queryCostEstimate})`,
          policyId: 'budget-enforcement',
          policyName: 'Budget Enforcement',
          tokenCostEstimate: tokenEstimate,
          queryCostEstimate: queryCostEstimate,
        };
      }
      
      return {
        allow: true,
        requiresApproval: false,
        reason: 'Within budget limits',
        policyId: 'budget-enforcement',
        policyName: 'Budget Enforcement',
        tokenCostEstimate: tokenEstimate,
        queryCostEstimate: queryCostEstimate,
      };
    },
  },
];

export class PolicyEvaluator {
  private rules: PolicyRule[];

  constructor(customRules?: PolicyRule[]) {
    this.rules = customRules || POLICY_RULES;
  }

  evaluate(context: ActionContext): PolicyDecision[] {
    return this.rules.map(rule => rule.evaluator(context));
  }

  evaluateAll(context: ActionContext): { allow: boolean; requiresApproval: boolean; decisions: PolicyDecision[] } {
    const decisions = this.evaluate(context);
    
    const blocked = decisions.some(d => !d.allow && !d.requiresApproval);
    const requiresApproval = decisions.some(d => d.requiresApproval);
    const allow = !blocked && !requiresApproval;
    
    console.log('[PolicyEvaluator] Decision:', { 
      allow, 
      requiresApproval, 
      blocked,
      context,
      decisions 
    });
    
    return {
      allow,
      requiresApproval,
      decisions,
    };
  }

  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
  }

  getRules(): PolicyRule[] {
    return [...this.rules];
  }
}
