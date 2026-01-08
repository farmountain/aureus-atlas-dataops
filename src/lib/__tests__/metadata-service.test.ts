import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataService } from '../metadata-service';
import { AureusGuard } from '../aureus-guard';
import { PolicyEvaluator } from '../policy-evaluator';
import type { Dataset, GlossaryTerm } from '../types';

describe('MetadataService', () => {
  let service: MetadataService;
  let guard: AureusGuard;

  beforeEach(() => {
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

  describe('CRUD Datasets', () => {
    it('should create a dataset with all required fields', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'test_transactions',
        domain: 'retail',
        owner: 'data-team',
        description: 'Test transaction dataset',
        schema: [
          { name: 'id', type: 'string', nullable: false, pii: false },
          { name: 'customer_id', type: 'string', nullable: false, pii: true },
          { name: 'amount', type: 'decimal', nullable: false, pii: false },
        ],
        piiLevel: 'high',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date().toISOString(),
        tags: ['transactions', 'retail'],
      };

      const result = await service.createDataset(datasetInput, 'admin-user', 'admin');

      expect(result.dataset.id).toBeDefined();
      expect(result.dataset.name).toBe('test_transactions');
      expect(result.dataset.domain).toBe('retail');
      expect(result.dataset.owner).toBe('data-team');
      expect(result.dataset.piiLevel).toBe('high');
      expect(result.dataset.jurisdiction).toBe('US');
      expect(result.dataset.freshnessSLA).toBe(24);
      expect(result.dataset.schema).toHaveLength(3);
      expect(result.snapshot).toBeDefined();
      expect(result.policies).toBeDefined();
    });

    it('should retrieve a dataset by ID', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'test_loans',
        domain: 'credit_risk',
        owner: 'risk-team',
        description: 'Loan portfolio dataset',
        schema: [{ name: 'loan_id', type: 'string', nullable: false, pii: false }],
        piiLevel: 'low',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date().toISOString(),
        tags: ['loans'],
      };

      const created = await service.createDataset(datasetInput, 'admin-user', 'admin');
      const retrieved = await service.getDataset(created.dataset.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.dataset.id);
      expect(retrieved?.name).toBe('test_loans');
    });

    it('should update a dataset', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'test_dataset',
        domain: 'finance',
        owner: 'finance-team',
        description: 'Original description',
        schema: [{ name: 'id', type: 'string', nullable: false, pii: false }],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date().toISOString(),
        tags: [],
      };

      const created = await service.createDataset(datasetInput, 'admin-user', 'admin');
      const updated = await service.updateDataset(
        created.dataset.id,
        { description: 'Updated description', piiLevel: 'low' },
        'admin-user',
        'admin'
      );

      expect(updated.dataset.description).toBe('Updated description');
      expect(updated.dataset.piiLevel).toBe('low');
      expect(updated.snapshot).toBeDefined();
    });

    it('should delete a dataset', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'test_delete',
        domain: 'ops',
        owner: 'ops-team',
        description: 'Dataset to delete',
        schema: [],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date().toISOString(),
        tags: [],
      };

      const created = await service.createDataset(datasetInput, 'admin-user', 'admin');
      const deleted = await service.deleteDataset(created.dataset.id, 'admin-user', 'admin');

      expect(deleted.deleted).toBe(true);
      expect(deleted.snapshot).toBeDefined();

      const retrieved = await service.getDataset(created.dataset.id);
      expect(retrieved).toBeUndefined();
    });

    it('should list all datasets', async () => {
      const dataset1: Omit<Dataset, 'id'> = {
        name: 'dataset_1',
        domain: 'retail',
        owner: 'team-1',
        description: 'First dataset',
        schema: [],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date().toISOString(),
        tags: [],
      };

      const dataset2: Omit<Dataset, 'id'> = {
        name: 'dataset_2',
        domain: 'finance',
        owner: 'team-2',
        description: 'Second dataset',
        schema: [],
        piiLevel: 'none',
        jurisdiction: 'EU',
        freshnessSLA: 48,
        lastRefresh: new Date().toISOString(),
        tags: [],
      };

      await service.createDataset(dataset1, 'admin-user', 'admin');
      await service.createDataset(dataset2, 'admin-user', 'admin');

      const all = await service.listDatasets();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('CRUD Glossary Terms', () => {
    it('should create a glossary term', async () => {
      const termInput: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> = {
        term: 'Customer',
        definition: 'A person or organization that purchases products or services',
        domain: 'retail',
        owner: 'business-team',
      };

      const result = await service.createGlossaryTerm(termInput, 'admin-user', 'admin');

      expect(result.term.id).toBeDefined();
      expect(result.term.term).toBe('Customer');
      expect(result.term.definition).toBeDefined();
      expect(result.term.createdAt).toBeDefined();
      expect(result.term.updatedAt).toBeDefined();
    });

    it('should update a glossary term', async () => {
      const termInput: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> = {
        term: 'Transaction',
        definition: 'Original definition',
        domain: 'retail',
        owner: 'business-team',
      };

      const created = await service.createGlossaryTerm(termInput, 'admin-user', 'admin');
      const updated = await service.updateGlossaryTerm(
        created.term.id,
        { definition: 'Updated definition' },
        'admin-user',
        'admin'
      );

      expect(updated.term.definition).toBe('Updated definition');
      expect(updated.term.updatedAt).not.toBe(created.term.createdAt);
    });

    it('should delete a glossary term', async () => {
      const termInput: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> = {
        term: 'Risk Rating',
        definition: 'A measure of credit risk',
        domain: 'credit_risk',
        owner: 'risk-team',
      };

      const created = await service.createGlossaryTerm(termInput, 'admin-user', 'admin');
      const deleted = await service.deleteGlossaryTerm(created.term.id, 'admin-user', 'admin');

      expect(deleted.deleted).toBe(true);

      const retrieved = await service.getGlossaryTerm(created.term.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Glossary-Dataset Linking', () => {
    it('should link glossary term to dataset', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'test_dataset',
        domain: 'retail',
        owner: 'data-team',
        description: 'Test dataset',
        schema: [],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date().toISOString(),
        tags: [],
      };

      const termInput: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> = {
        term: 'Revenue',
        definition: 'Total income from sales',
        domain: 'finance',
        owner: 'finance-team',
      };

      const dataset = await service.createDataset(datasetInput, 'admin-user', 'admin');
      const term = await service.createGlossaryTerm(termInput, 'admin-user', 'admin');

      await service.linkGlossaryToDataset(dataset.dataset.id, term.term.id);

      const linkedTerms = await service.getLinkedGlossaryTerms(dataset.dataset.id);
      expect(linkedTerms).toHaveLength(1);
      expect(linkedTerms[0].term).toBe('Revenue');
    });

    it('should unlink glossary term from dataset', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'test_dataset',
        domain: 'retail',
        owner: 'data-team',
        description: 'Test dataset',
        schema: [],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date().toISOString(),
        tags: [],
      };

      const termInput: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> = {
        term: 'Profit',
        definition: 'Revenue minus expenses',
        domain: 'finance',
        owner: 'finance-team',
      };

      const dataset = await service.createDataset(datasetInput, 'admin-user', 'admin');
      const term = await service.createGlossaryTerm(termInput, 'admin-user', 'admin');

      await service.linkGlossaryToDataset(dataset.dataset.id, term.term.id);
      await service.unlinkGlossaryFromDataset(dataset.dataset.id, term.term.id);

      const linkedTerms = await service.getLinkedGlossaryTerms(dataset.dataset.id);
      expect(linkedTerms).toHaveLength(0);
    });
  });

  describe('Classification Rules', () => {
    it('should infer PII level from schema', () => {
      const rules = service.getClassificationRules();

      const noPII = rules.inferPIILevel([
        { name: 'id', type: 'string', nullable: false, pii: false },
        { name: 'amount', type: 'decimal', nullable: false, pii: false },
      ]);
      expect(noPII).toBe('none');

      const lowPII = rules.inferPIILevel([
        { name: 'id', type: 'string', nullable: false, pii: false },
        { name: 'email', type: 'string', nullable: false, pii: true },
      ]);
      expect(lowPII).toBe('low');

      const highPII = rules.inferPIILevel([
        { name: 'id', type: 'string', nullable: false, pii: false },
        { name: 'ssn', type: 'string', nullable: false, pii: true },
        { name: 'email', type: 'string', nullable: false, pii: true },
        { name: 'phone', type: 'string', nullable: false, pii: true },
      ]);
      expect(highPII).toBe('high');
    });

    it('should infer jurisdiction from metadata', () => {
      const rules = service.getClassificationRules();

      const us = rules.inferJurisdiction({ owner: 'us-team', domain: 'aml_fcc' });
      expect(us).toBe('US');

      const eu = rules.inferJurisdiction({ owner: 'eu-team', domain: 'treasury' });
      expect(eu).toBe('EU');

      const multi = rules.inferJurisdiction({ owner: 'global-team', domain: 'retail' });
      expect(multi).toBe('multi');
    });

    it('should generate policy decisions based on PII level and jurisdiction for admin', () => {
      const rules = service.getClassificationRules();

      const decisions = rules.getPolicyDecisions('high', 'multi', 'admin');

      expect(decisions).toBeDefined();
      expect(decisions.length).toBeGreaterThan(0);

      const highPIIPolicy = decisions.find((d) => d.policyId === 'high-pii-approval');
      expect(highPIIPolicy).toBeDefined();
      expect(highPIIPolicy?.result).toBe('allow');
    });

    it('should generate policy decisions based on PII level and jurisdiction for analyst', () => {
      const rules = service.getClassificationRules();

      const decisions = rules.getPolicyDecisions('high', 'EU', 'analyst');

      expect(decisions).toBeDefined();
      expect(decisions.length).toBeGreaterThan(0);

      const highPIIPolicy = decisions.find((d) => d.policyId === 'high-pii-approval');
      expect(highPIIPolicy).toBeDefined();
      expect(highPIIPolicy?.result).toBe('require_approval');

      const jurisdictionPolicy = decisions.find((d) => d.policyId === 'cross-jurisdiction');
      expect(jurisdictionPolicy).toBeDefined();
      expect(jurisdictionPolicy?.result).toBe('require_approval');
    });
  });

  describe('Dataset Card Endpoint', () => {
    it('should return complete dataset card with all fields', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'customer_data',
        domain: 'retail',
        owner: 'retail-team',
        description: 'Customer master data',
        schema: [
          { name: 'customer_id', type: 'string', nullable: false, pii: true },
          { name: 'email', type: 'string', nullable: false, pii: true },
        ],
        piiLevel: 'high',
        jurisdiction: 'EU',
        freshnessSLA: 12,
        lastRefresh: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        tags: ['customers', 'retail'],
      };

      const termInput: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'> = {
        term: 'Customer',
        definition: 'An individual or organization that purchases goods or services',
        domain: 'retail',
        owner: 'business-team',
      };

      const dataset = await service.createDataset(datasetInput, 'admin-user', 'admin');
      const term = await service.createGlossaryTerm(termInput, 'admin-user', 'admin');
      await service.linkGlossaryToDataset(dataset.dataset.id, term.term.id);

      const card = await service.getDatasetCard(dataset.dataset.id, 'analyst-user', 'analyst');

      expect(card.dataset).toBeDefined();
      expect(card.dataset.id).toBe(dataset.dataset.id);
      expect(card.dataset.name).toBe('customer_data');
      expect(card.dataset.piiLevel).toBe('high');
      expect(card.dataset.jurisdiction).toBe('EU');

      expect(card.glossaryTerms).toBeDefined();
      expect(card.glossaryTerms).toHaveLength(1);
      expect(card.glossaryTerms[0].term).toBe('Customer');

      expect(card.policies).toBeDefined();
      expect(card.policies.length).toBeGreaterThan(0);

      expect(card.freshnessStatus).toBeDefined();
      expect(card.freshnessStatus.isStale).toBeDefined();
      expect(card.freshnessStatus.hoursSinceRefresh).toBeDefined();
      expect(card.freshnessStatus.slaHours).toBe(12);
      expect(card.freshnessStatus.statusMessage).toBeDefined();
    });

    it('should calculate freshness status correctly - stale data', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'old_data',
        domain: 'finance',
        owner: 'finance-team',
        description: 'Stale dataset',
        schema: [],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 1,
        lastRefresh: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        tags: [],
      };

      const dataset = await service.createDataset(datasetInput, 'admin-user', 'admin');
      const card = await service.getDatasetCard(dataset.dataset.id);

      expect(card.freshnessStatus.isStale).toBe(true);
      expect(card.freshnessStatus.statusMessage).toContain('STALE');
    });

    it('should calculate freshness status correctly - fresh data', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'fresh_data',
        domain: 'treasury',
        owner: 'treasury-team',
        description: 'Fresh dataset',
        schema: [],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        tags: [],
      };

      const dataset = await service.createDataset(datasetInput, 'admin-user', 'admin');
      const card = await service.getDatasetCard(dataset.dataset.id);

      expect(card.freshnessStatus.isStale).toBe(false);
      expect(card.freshnessStatus.statusMessage).toContain('FRESH');
    });
  });

  describe('AUREUS Guard Integration', () => {
    it('should create snapshots for all writes', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'snapshot_test',
        domain: 'ops',
        owner: 'ops-team',
        description: 'Test snapshot creation',
        schema: [],
        piiLevel: 'none',
        jurisdiction: 'US',
        freshnessSLA: 24,
        lastRefresh: new Date().toISOString(),
        tags: [],
      };

      const result = await service.createDataset(datasetInput, 'admin-user', 'admin');

      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.id).toBeDefined();
      expect(result.snapshot.entityType).toBe('dataset');

      const snapshots = service.getSnapshots();
      expect(snapshots.length).toBeGreaterThan(0);
    });

    it('should enforce policy checks through guard', async () => {
      const datasetInput: Omit<Dataset, 'id'> = {
        name: 'policy_test',
        domain: 'aml_fcc',
        owner: 'compliance-team',
        description: 'Test policy enforcement',
        schema: [{ name: 'customer_id', type: 'string', nullable: false, pii: true }],
        piiLevel: 'high',
        jurisdiction: 'US',
        freshnessSLA: 4,
        lastRefresh: new Date().toISOString(),
        tags: ['compliance'],
      };

      const result = await service.createDataset(datasetInput, 'analyst-user', 'analyst');

      expect(result.policies).toBeDefined();
      expect(result.policies.length).toBeGreaterThan(0);
    });
  });
});
