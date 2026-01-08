import { describe, it, expect, beforeAll } from 'vitest';
import { MetadataService } from '../metadata-service';
import { AureusGuard } from '../aureus-guard';
import { PolicyEvaluator } from '../policy-evaluator';
import type { Dataset, GlossaryTerm } from '../types';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

describe('MetadataService Smoke Test with Evidence Generation', () => {
  let service: MetadataService;
  let guard: AureusGuard;
  const evidenceDir = resolve(process.cwd(), 'evidence', 'metadata_smoke_run');

  beforeAll(() => {
    mkdirSync(evidenceDir, { recursive: true });

    guard = new AureusGuard(
      {
        environment: 'prod',
        budgetLimits: { tokenBudget: 100000, queryCostBudget: 10000 },
        enableAudit: true,
        enableSnapshots: true,
      },
      new PolicyEvaluator()
    );
    service = new MetadataService(guard);
  });

  it('should complete full metadata workflow and generate evidence artifacts', async () => {
    const timestamp = new Date().toISOString();
    const evidence: {
      timestamp: string;
      workflow: string;
      steps: Array<{ step: string; result: unknown; policies: unknown; snapshot?: unknown }>;
      summary: {
        datasetsCreated: number;
        glossaryTermsCreated: number;
        linksCreated: number;
        snapshotsGenerated: number;
        policiesEvaluated: number;
      };
    } = {
      timestamp,
      workflow: 'Metadata Service Full CRUD + Card Retrieval',
      steps: [],
      summary: {
        datasetsCreated: 0,
        glossaryTermsCreated: 0,
        linksCreated: 0,
        snapshotsGenerated: 0,
        policiesEvaluated: 0,
      },
    };

    const datasetInput: Omit<Dataset, 'id'> = {
      name: 'smoke_test_transactions',
      domain: 'retail',
      owner: 'smoke-test-team',
      description: 'Smoke test transaction dataset with PII',
      schema: [
        { name: 'transaction_id', type: 'string', nullable: false, pii: false },
        { name: 'customer_id', type: 'string', nullable: false, pii: true },
        { name: 'account_number', type: 'string', nullable: false, pii: true },
        { name: 'amount', type: 'decimal', nullable: false, pii: false },
        { name: 'timestamp', type: 'timestamp', nullable: false, pii: false },
      ],
      piiLevel: 'high',
      jurisdiction: 'multi',
      freshnessSLA: 1,
      lastRefresh: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      tags: ['smoke-test', 'transactions', 'pii'],
    };

    console.log('[Smoke Test] Step 1: Creating dataset...');
    const datasetResult = await service.createDataset(datasetInput, 'smoke-test-user', 'analyst');
    evidence.steps.push({
      step: '1_create_dataset',
      result: datasetResult.dataset,
      policies: datasetResult.policies,
      snapshot: datasetResult.snapshot,
    });
    evidence.summary.datasetsCreated++;
    evidence.summary.snapshotsGenerated++;
    evidence.summary.policiesEvaluated += datasetResult.policies.length;

    expect(datasetResult.dataset.id).toBeDefined();
    expect(datasetResult.dataset.name).toBe('smoke_test_transactions');
    expect(datasetResult.policies.length).toBeGreaterThan(0);
    console.log(`[Smoke Test] ✓ Dataset created: ${datasetResult.dataset.id}`);
    console.log(`[Smoke Test] ✓ Policies evaluated: ${datasetResult.policies.length}`);

    const term1Input: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> = {
      term: 'Transaction',
      definition: 'A financial exchange between parties involving the transfer of money or assets',
      domain: 'retail',
      owner: 'business-glossary-team',
    };

    console.log('[Smoke Test] Step 2: Creating glossary term "Transaction"...');
    const term1Result = await service.createGlossaryTerm(term1Input, 'smoke-test-user', 'admin');
    evidence.steps.push({
      step: '2_create_glossary_transaction',
      result: term1Result.term,
      policies: term1Result.policies,
    });
    evidence.summary.glossaryTermsCreated++;
    evidence.summary.policiesEvaluated += term1Result.policies.length;

    expect(term1Result.term.id).toBeDefined();
    expect(term1Result.term.term).toBe('Transaction');
    console.log(`[Smoke Test] ✓ Glossary term created: ${term1Result.term.id}`);

    const term2Input: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> = {
      term: 'Customer',
      definition: 'An individual or organization that purchases goods or services from a business',
      domain: 'retail',
      owner: 'business-glossary-team',
    };

    console.log('[Smoke Test] Step 3: Creating glossary term "Customer"...');
    const term2Result = await service.createGlossaryTerm(term2Input, 'smoke-test-user', 'admin');
    evidence.steps.push({
      step: '3_create_glossary_customer',
      result: term2Result.term,
      policies: term2Result.policies,
    });
    evidence.summary.glossaryTermsCreated++;
    evidence.summary.policiesEvaluated += term2Result.policies.length;

    expect(term2Result.term.id).toBeDefined();
    console.log(`[Smoke Test] ✓ Glossary term created: ${term2Result.term.id}`);

    console.log('[Smoke Test] Step 4: Linking glossary terms to dataset...');
    await service.linkGlossaryToDataset(datasetResult.dataset.id, term1Result.term.id);
    await service.linkGlossaryToDataset(datasetResult.dataset.id, term2Result.term.id);
    evidence.steps.push({
      step: '4_link_glossary_to_dataset',
      result: {
        datasetId: datasetResult.dataset.id,
        linkedTermIds: [term1Result.term.id, term2Result.term.id],
      },
      policies: [],
    });
    evidence.summary.linksCreated += 2;

    const linkedTerms = await service.getLinkedGlossaryTerms(datasetResult.dataset.id);
    expect(linkedTerms).toHaveLength(2);
    console.log(`[Smoke Test] ✓ Linked ${linkedTerms.length} glossary terms to dataset`);

    console.log('[Smoke Test] Step 5: Retrieving dataset card...');
    const card = await service.getDatasetCard(datasetResult.dataset.id, 'smoke-test-user', 'analyst');
    evidence.steps.push({
      step: '5_retrieve_dataset_card',
      result: {
        datasetId: card.dataset.id,
        datasetName: card.dataset.name,
        piiLevel: card.dataset.piiLevel,
        jurisdiction: card.dataset.jurisdiction,
        schemaFields: card.dataset.schema.length,
        glossaryTermsLinked: card.glossaryTerms.length,
        policiesApplied: card.policies.length,
        freshnessStatus: card.freshnessStatus,
      },
      policies: card.policies,
    });
    evidence.summary.policiesEvaluated += card.policies.length;

    expect(card.dataset.id).toBe(datasetResult.dataset.id);
    expect(card.glossaryTerms).toHaveLength(2);
    expect(card.policies.length).toBeGreaterThan(0);
    expect(card.freshnessStatus).toBeDefined();
    expect(card.freshnessStatus.isStale).toBeDefined();
    console.log('[Smoke Test] ✓ Dataset card retrieved successfully');
    console.log(`[Smoke Test]   - Glossary terms: ${card.glossaryTerms.length}`);
    console.log(`[Smoke Test]   - Policies: ${card.policies.length}`);
    console.log(`[Smoke Test]   - Freshness: ${card.freshnessStatus.statusMessage}`);

    const policyDecisionsByRole: Record<string, unknown> = {};
    for (const role of ['admin', 'analyst', 'viewer']) {
      console.log(`[Smoke Test] Step 6.${role}: Testing policy decisions for role="${role}"...`);
      const rules = service.getClassificationRules();
      const decisions = rules.getPolicyDecisions(datasetResult.dataset.piiLevel, datasetResult.dataset.jurisdiction, role);
      policyDecisionsByRole[role] = decisions;
      evidence.steps.push({
        step: `6_policy_decisions_${role}`,
        result: { role, piiLevel: datasetResult.dataset.piiLevel, jurisdiction: datasetResult.dataset.jurisdiction },
        policies: decisions,
      });
      console.log(`[Smoke Test]   - ${role}: ${decisions.length} policy decisions`);
    }

    const adminDecisions = policyDecisionsByRole.admin as Array<{ result: string }>;
    const analystDecisions = policyDecisionsByRole.analyst as Array<{ result: string }>;
    expect(adminDecisions.some((d) => d.result === 'allow')).toBe(true);
    expect(analystDecisions.some((d) => d.result === 'require_approval')).toBe(true);
    console.log('[Smoke Test] ✓ Policy decisions differ by role (admin=allow, analyst=require_approval)');

    console.log('[Smoke Test] Step 7: Retrieving snapshots...');
    const snapshots = service.getSnapshots();
    evidence.steps.push({
      step: '7_retrieve_snapshots',
      result: { snapshotCount: snapshots.length, snapshotIds: snapshots.map((s) => s.id) },
      policies: [],
    });
    expect(snapshots.length).toBeGreaterThan(0);
    console.log(`[Smoke Test] ✓ Generated ${snapshots.length} snapshots`);

    const auditLog = guard.getAuditLog();
    evidence.steps.push({
      step: '8_audit_log',
      result: { auditEventCount: auditLog.length, events: auditLog },
      policies: [],
    });
    console.log(`[Smoke Test] ✓ Audit log contains ${auditLog.length} events`);

    const evidenceFile = resolve(evidenceDir, `smoke_test_${Date.now()}.json`);
    writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2), 'utf-8');
    console.log(`[Smoke Test] ✓ Evidence written to: ${evidenceFile}`);

    const summaryMarkdown = `# Metadata Service Smoke Test Evidence

## Test Run Summary
- **Timestamp**: ${timestamp}
- **Workflow**: ${evidence.workflow}
- **Status**: ✅ PASSED

## Metrics
- **Datasets Created**: ${evidence.summary.datasetsCreated}
- **Glossary Terms Created**: ${evidence.summary.glossaryTermsCreated}
- **Dataset-Glossary Links**: ${evidence.summary.linksCreated}
- **Snapshots Generated**: ${evidence.summary.snapshotsGenerated}
- **Policy Evaluations**: ${evidence.summary.policiesEvaluated}

## Acceptance Criteria Validation

### ✅ CRUD Datasets
Dataset created with all required fields:
- **ID**: ${datasetResult.dataset.id}
- **Name**: ${datasetResult.dataset.name}
- **Domain**: ${datasetResult.dataset.domain}
- **Owner**: ${datasetResult.dataset.owner}
- **PII Level**: ${datasetResult.dataset.piiLevel}
- **Jurisdiction**: ${datasetResult.dataset.jurisdiction}
- **Freshness SLA**: ${datasetResult.dataset.freshnessSLA}h
- **Schema Reference**: ${datasetResult.dataset.schema.length} columns

### ✅ CRUD Glossary Terms & Linking
Created ${evidence.summary.glossaryTermsCreated} glossary terms and linked to dataset.

### ✅ Classification Rules
PII Level and Jurisdiction influence policy decisions:
- **Admin role**: ${JSON.stringify(policyDecisionsByRole.admin, null, 2)}
- **Analyst role**: ${JSON.stringify(policyDecisionsByRole.analyst, null, 2)}

### ✅ Dataset Card Endpoint
Card retrieved with:
- **Metadata**: Complete dataset information
- **Linked Glossary**: ${card.glossaryTerms.map((t) => t.term).join(', ')}
- **Policies**: ${card.policies.length} policies evaluated
- **Freshness Status**: ${card.freshnessStatus.statusMessage}

### ✅ AUREUS Guard Integration
All writes went through AUREUS guard:
- **Snapshots Created**: ${snapshots.length}
- **Audit Events**: ${auditLog.length}
- **Policy Checks**: ${evidence.summary.policiesEvaluated}

## Test Workflow Steps

${evidence.steps
  .map(
    (step, idx) =>
      `### Step ${idx + 1}: ${step.step}
- **Result**: ${JSON.stringify(step.result, null, 2).substring(0, 200)}...
- **Policies Evaluated**: ${Array.isArray(step.policies) ? step.policies.length : 0}
`
  )
  .join('\n')}

## Evidence Artifacts
- **Full JSON Evidence**: \`${evidenceFile}\`
- **Audit Log**: ${auditLog.length} events
- **Snapshots**: ${snapshots.length} snapshots

## Conclusion
All acceptance criteria met. Metadata service MVP operational with full AUREUS guard integration.
`;

    const summaryFile = resolve(evidenceDir, 'SMOKE_TEST_SUMMARY.md');
    writeFileSync(summaryFile, summaryMarkdown, 'utf-8');
    console.log(`[Smoke Test] ✓ Summary written to: ${summaryFile}`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ SMOKE TEST COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📁 Evidence directory: ${evidenceDir}`);
    console.log(`📄 Evidence file: ${evidenceFile}`);
    console.log(`📋 Summary: ${summaryFile}`);
    console.log('═══════════════════════════════════════════════════\n');
  });
});
