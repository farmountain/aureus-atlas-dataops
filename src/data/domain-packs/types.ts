export type PIILevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
export type Jurisdiction = 'US' | 'EU' | 'APAC' | 'GLOBAL'
export type FreshnessSLA = 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface ColumnSpec {
  name: string
  type: string
  description: string
  nullable: boolean
  pii?: boolean
}

export interface DatasetSpec {
  id: string
  name: string
  description: string
  domain: string
  owner: string
  piiLevel: PIILevel
  jurisdiction: Jurisdiction
  freshnessSLA: FreshnessSLA
  columns: ColumnSpec[]
  sampleRowCount: number
}

export interface GlossaryTerm {
  term: string
  definition: string
  domain: string
  synonyms?: string[]
  relatedDatasets?: string[]
}

export interface PolicyRule {
  id: string
  name: string
  description: string
  scope: 'dataset' | 'domain' | 'global'
  targetDatasets?: string[]
  conditions: {
    piiLevel?: PIILevel[]
    jurisdiction?: Jurisdiction[]
    roles?: string[]
  }
  actions: {
    allow?: string[]
    deny?: string[]
    require_approval?: boolean
    mask_columns?: string[]
  }
}

export interface NLQuestion {
  question: string
  expectedIntent: {
    measures: string[]
    dimensions?: string[]
    filters?: Record<string, string>
    timeRange?: string
  }
  expectedDatasets: string[]
  requiresApproval: boolean
}

export interface DomainPack {
  domain: string
  description: string
  datasets: DatasetSpec[]
  glossary: GlossaryTerm[]
  policies: PolicyRule[]
  sampleQuestions: NLQuestion[]
  metadata: {
    version: string
    created: string
    author: string
    tags: string[]
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
