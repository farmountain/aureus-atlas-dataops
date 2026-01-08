import type { Dataset, GlossaryTerm, PolicyCheck, Domain, PIILevel, Jurisdiction } from './types';
import { AureusGuard } from './aureus-guard';
import type { ActionContext, Snapshot, ActionType } from './aureus-types';

export interface DatasetCardResponse {
  dataset: Dataset;
  glossaryTerms: GlossaryTerm[];
  policies: PolicyCheck[];
  freshnessStatus: {
    isStale: boolean;
    hoursSinceRefresh: number;
    slaHours: number;
    statusMessage: string;
  };
}

export interface ClassificationRules {
  inferPIILevel(schema: Dataset['schema']): PIILevel;
  inferJurisdiction(metadata: { owner: string; domain: Domain }): Jurisdiction;
  getPolicyDecisions(piiLevel: PIILevel, jurisdiction: Jurisdiction, role: string): PolicyCheck[];
}

export interface MetadataSnapshot {
  id: string;
  timestamp: string;
  entityType: string;
  entityId: string;
  snapshotData: unknown;
}

export class MetadataService {
  private datasets: Map<string, Dataset> = new Map();
  private glossaryTerms: Map<string, GlossaryTerm> = new Map();
  private datasetGlossaryLinks: Map<string, Set<string>> = new Map();
  private aureusGuard: AureusGuard;
  private metadataSnapshots: Map<string, MetadataSnapshot> = new Map();

  constructor(aureusGuard: AureusGuard) {
    this.aureusGuard = aureusGuard;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private createMetadataSnapshot(entityType: string, entityId: string, data: unknown): MetadataSnapshot {
    const snapshot: MetadataSnapshot = {
      id: this.generateId('snap'),
      timestamp: new Date().toISOString(),
      entityType,
      entityId,
      snapshotData: data,
    };
    this.metadataSnapshots.set(snapshot.id, snapshot);
    return snapshot;
  }

  private async executeWithGuard<T>(
    action: ActionType,
    actor: string,
    role: string,
    metadata: Record<string, unknown>,
    payload: Record<string, unknown>
  ): Promise<{ result: T; policies: PolicyCheck[]; snapshot?: Snapshot }> {
    const context: ActionContext = {
      actionType: action,
      actor,
      role: role as 'admin' | 'approver' | 'analyst' | 'viewer',
      environment: 'prod',
      metadata,
    };

    const request = {
      context,
      payload,
    };

    const guardResult = await this.aureusGuard.execute(request);

    if (!guardResult.success) {
      throw new Error(`Action blocked: ${guardResult.error}`);
    }

    const snapshot = guardResult.snapshotId ? this.aureusGuard.getSnapshot(guardResult.snapshotId) : undefined;

    const evaluation = this.aureusGuard['policyEvaluator'].evaluateAll(context);
    const policies: PolicyCheck[] = evaluation.decisions.map((d) => ({
      policyId: d.policyId,
      policyName: d.policyName,
      result: d.allow ? 'allow' : d.requiresApproval ? 'require_approval' : 'block',
      reason: d.reason,
      evaluated: new Date().toISOString(),
    }));

    return {
      result: guardResult.data as T,
      policies,
      snapshot,
    };
  }

  async createDataset(
    datasetInput: Omit<Dataset, 'id'>,
    actor: string = 'system',
    role: string = 'admin'
  ): Promise<{ dataset: Dataset; snapshot: MetadataSnapshot; policies: PolicyCheck[] }> {
    const id = this.generateId('ds');
    const dataset: Dataset = { id, ...datasetInput };

    const metadataSnapshot = this.createMetadataSnapshot('dataset', id, null);

    const { result, policies } = await this.executeWithGuard<Dataset>(
      'dataset_create',
      actor,
      role,
      {
        datasetName: dataset.name,
        domain: dataset.domain,
        piiLevel: dataset.piiLevel,
        jurisdiction: dataset.jurisdiction,
      },
      { dataset }
    );

    this.datasets.set(id, dataset);

    return { dataset, snapshot: metadataSnapshot, policies };
  }

  async getDataset(id: string): Promise<Dataset | undefined> {
    return this.datasets.get(id);
  }

  async updateDataset(
    id: string,
    updates: Partial<Omit<Dataset, 'id'>>,
    actor: string = 'system',
    role: string = 'admin'
  ): Promise<{ dataset: Dataset; snapshot: MetadataSnapshot; policies: PolicyCheck[] }> {
    const existing = this.datasets.get(id);
    if (!existing) {
      throw new Error(`Dataset ${id} not found`);
    }

    const metadataSnapshot = this.createMetadataSnapshot('dataset', id, existing);

    const updated: Dataset = { ...existing, ...updates };

    const { result, policies } = await this.executeWithGuard<Dataset>(
      'dataset_update',
      actor,
      role,
      {
        datasetId: id,
        datasetName: updated.name,
        piiLevel: updated.piiLevel,
        jurisdiction: updated.jurisdiction,
      },
      { dataset: updated }
    );

    this.datasets.set(id, updated);

    return { dataset: updated, snapshot: metadataSnapshot, policies };
  }

  async deleteDataset(
    id: string,
    actor: string = 'system',
    role: string = 'admin'
  ): Promise<{ deleted: boolean; snapshot: MetadataSnapshot; policies: PolicyCheck[] }> {
    const existing = this.datasets.get(id);
    if (!existing) {
      throw new Error(`Dataset ${id} not found`);
    }

    const metadataSnapshot = this.createMetadataSnapshot('dataset', id, existing);

    const { result, policies } = await this.executeWithGuard<boolean>(
      'dataset_delete',
      actor,
      role,
      {
        datasetId: id,
        datasetName: existing.name,
        piiLevel: existing.piiLevel,
      },
      { action: 'delete', datasetId: id }
    );

    this.datasets.delete(id);
    this.datasetGlossaryLinks.delete(id);

    return { deleted: true, snapshot: metadataSnapshot, policies };
  }

  async listDatasets(): Promise<Dataset[]> {
    return Array.from(this.datasets.values());
  }

  async createGlossaryTerm(
    termInput: Omit<GlossaryTerm, 'id' | 'createdAt' | 'updatedAt'>,
    actor: string = 'system',
    role: string = 'admin'
  ): Promise<{ term: GlossaryTerm; policies: PolicyCheck[] }> {
    const id = this.generateId('term');
    const now = new Date().toISOString();
    const term: GlossaryTerm = {
      id,
      ...termInput,
      createdAt: now,
      updatedAt: now,
    };

    const { result, policies } = await this.executeWithGuard<GlossaryTerm>(
      'dataset_create',
      actor,
      role,
      { term: term.term, domain: term.domain },
      { term }
    );

    this.glossaryTerms.set(id, term);

    return { term, policies };
  }

  async getGlossaryTerm(id: string): Promise<GlossaryTerm | undefined> {
    return this.glossaryTerms.get(id);
  }

  async updateGlossaryTerm(
    id: string,
    updates: Partial<Omit<GlossaryTerm, 'id' | 'createdAt'>>,
    actor: string = 'system',
    role: string = 'admin'
  ): Promise<{ term: GlossaryTerm; policies: PolicyCheck[] }> {
    const existing = this.glossaryTerms.get(id);
    if (!existing) {
      throw new Error(`Glossary term ${id} not found`);
    }

    const updated: GlossaryTerm = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const { result, policies } = await this.executeWithGuard<GlossaryTerm>(
      'dataset_update',
      actor,
      role,
      { termId: id },
      { term: updated }
    );

    this.glossaryTerms.set(id, updated);

    return { term: updated, policies };
  }

  async deleteGlossaryTerm(
    id: string,
    actor: string = 'system',
    role: string = 'admin'
  ): Promise<{ deleted: boolean; policies: PolicyCheck[] }> {
    const existing = this.glossaryTerms.get(id);
    if (!existing) {
      throw new Error(`Glossary term ${id} not found`);
    }

    const { result, policies } = await this.executeWithGuard<boolean>(
      'dataset_delete',
      actor,
      role,
      { termId: id },
      { action: 'delete', termId: id }
    );

    this.glossaryTerms.delete(id);
    for (const [datasetId, links] of this.datasetGlossaryLinks.entries()) {
      links.delete(id);
    }

    return { deleted: true, policies };
  }

  async listGlossaryTerms(): Promise<GlossaryTerm[]> {
    return Array.from(this.glossaryTerms.values());
  }

  async linkGlossaryToDataset(datasetId: string, glossaryTermId: string): Promise<void> {
    if (!this.datasets.has(datasetId)) {
      throw new Error(`Dataset ${datasetId} not found`);
    }
    if (!this.glossaryTerms.has(glossaryTermId)) {
      throw new Error(`Glossary term ${glossaryTermId} not found`);
    }

    if (!this.datasetGlossaryLinks.has(datasetId)) {
      this.datasetGlossaryLinks.set(datasetId, new Set());
    }
    this.datasetGlossaryLinks.get(datasetId)!.add(glossaryTermId);
  }

  async unlinkGlossaryFromDataset(datasetId: string, glossaryTermId: string): Promise<void> {
    const links = this.datasetGlossaryLinks.get(datasetId);
    if (links) {
      links.delete(glossaryTermId);
    }
  }

  async getLinkedGlossaryTerms(datasetId: string): Promise<GlossaryTerm[]> {
    const links = this.datasetGlossaryLinks.get(datasetId);
    if (!links) {
      return [];
    }

    const terms: GlossaryTerm[] = [];
    for (const termId of links) {
      const term = this.glossaryTerms.get(termId);
      if (term) {
        terms.push(term);
      }
    }
    return terms;
  }

  getClassificationRules(): ClassificationRules {
    return {
      inferPIILevel(schema: Dataset['schema']): PIILevel {
        const piiFields = schema.filter((col) => col.pii);
        if (piiFields.length === 0) return 'none';
        if (piiFields.length >= 3 || piiFields.some((f) => f.name.includes('ssn'))) return 'high';
        return 'low';
      },

      inferJurisdiction(metadata: { owner: string; domain: Domain }): Jurisdiction {
        if (metadata.domain === 'aml_fcc') return 'US';
        if (metadata.domain === 'treasury' && metadata.owner.includes('eu')) return 'EU';
        return 'multi';
      },

      getPolicyDecisions(piiLevel: PIILevel, jurisdiction: Jurisdiction, role: string): PolicyCheck[] {
        const decisions: PolicyCheck[] = [];

        if (piiLevel === 'high') {
          decisions.push({
            policyId: 'high-pii-approval',
            policyName: 'High PII Access Requires Approval',
            result: role === 'admin' ? 'allow' : 'require_approval',
            reason:
              role === 'admin'
                ? 'Admin role bypasses high PII approval'
                : 'High PII access requires compliance approval',
            evaluated: new Date().toISOString(),
          });
        }

        if (jurisdiction === 'multi' || jurisdiction === 'EU') {
          decisions.push({
            policyId: 'cross-jurisdiction',
            policyName: 'Cross-Jurisdiction Data Policy',
            result: role === 'admin' ? 'allow' : 'require_approval',
            reason:
              role === 'admin'
                ? 'Admin role bypasses jurisdiction restrictions'
                : 'Cross-border data requires legal approval',
            evaluated: new Date().toISOString(),
          });
        }

        if (piiLevel === 'none' && jurisdiction === 'US' && role === 'analyst') {
          decisions.push({
            policyId: 'standard-access',
            policyName: 'Standard Data Access',
            result: 'allow',
            reason: 'No restrictions for non-PII US data',
            evaluated: new Date().toISOString(),
          });
        }

        return decisions;
      },
    };
  }

  async getDatasetCard(
    datasetId: string,
    actor: string = 'system',
    role: string = 'analyst'
  ): Promise<DatasetCardResponse> {
    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const glossaryTerms = await this.getLinkedGlossaryTerms(datasetId);

    const classificationRules = this.getClassificationRules();
    const policies = classificationRules.getPolicyDecisions(dataset.piiLevel, dataset.jurisdiction, role);

    const lastRefreshTime = new Date(dataset.lastRefresh);
    const now = new Date();
    const hoursSinceRefresh = (now.getTime() - lastRefreshTime.getTime()) / (1000 * 60 * 60);
    const isStale = hoursSinceRefresh > dataset.freshnessSLA;

    const freshnessStatus = {
      isStale,
      hoursSinceRefresh: Math.round(hoursSinceRefresh * 10) / 10,
      slaHours: dataset.freshnessSLA,
      statusMessage: isStale
        ? `STALE: Last refresh ${Math.round(hoursSinceRefresh)}h ago (SLA: ${dataset.freshnessSLA}h)`
        : `FRESH: Last refresh ${Math.round(hoursSinceRefresh)}h ago (SLA: ${dataset.freshnessSLA}h)`,
    };

    return {
      dataset,
      glossaryTerms,
      policies,
      freshnessStatus,
    };
  }

  getSnapshots(): MetadataSnapshot[] {
    return Array.from(this.metadataSnapshots.values());
  }

  getSnapshot(id: string): MetadataSnapshot | undefined {
    return this.metadataSnapshots.get(id);
  }
}
