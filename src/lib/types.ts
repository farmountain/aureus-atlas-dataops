export type Domain = 
  | "credit_risk" 
  | "aml_fcc" 
  | "finance" 
  | "treasury" 
  | "retail" 
  | "ops";

export type PIILevel = "none" | "low" | "high";

export type Jurisdiction = "US" | "EU" | "UK" | "APAC" | "multi";

export type UserRole = "analyst" | "approver" | "admin" | "viewer";

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  pii: boolean;
  description?: string;
}

export interface Dataset {
  id: string;
  name: string;
  domain: Domain;
  owner: string;
  description: string;
  schema: Column[];
  piiLevel: PIILevel;
  jurisdiction: Jurisdiction;
  freshnessSLA: number;
  lastRefresh: string;
  tags: string[];
  recordCount?: number;
}

export interface PolicyCheck {
  policyId: string;
  policyName: string;
  result: "allow" | "block" | "require_approval";
  reason: string;
  evaluated: string;
}

export interface QueryResult {
  id: string;
  question: string;
  sql: string;
  datasets: Dataset[];
  results: Record<string, unknown>[];
  executionTime: number;
  policyChecks: PolicyCheck[];
  timestamp: string;
}

export interface DataContract {
  name: string;
  domain: Domain;
  owner: string;
  description: string;
  schema: Column[];
  piiLevel: PIILevel;
  jurisdiction: Jurisdiction;
  freshnessSLA: number;
  tags: string[];
  ingestionSchedule?: string;
  validationRules?: string[];
}

export interface PipelineSpec {
  name: string;
  description: string;
  domain: Domain;
  sourceDatasets: string[];
  targetDataset: string;
  sql: string;
  tests: TestSpec[];
  dqChecks: DQCheck[];
  schedule?: string;
}

export interface TestSpec {
  name: string;
  type: "unit" | "integration";
  sampleInput: Record<string, unknown>[];
  expectedOutput: Record<string, unknown>[];
}

export interface DQCheck {
  name: string;
  type: "completeness" | "uniqueness" | "validity" | "consistency";
  rule: string;
  threshold: number;
}

export interface EvidencePack {
  id: string;
  timestamp: string;
  eventType: "query" | "onboard" | "pipeline_deploy" | "approval";
  actor: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  policyChecks: PolicyCheck[];
  tests?: TestResult[];
  artifacts: string[];
  signature: string;
}

export interface TestResult {
  testName: string;
  status: "pass" | "fail";
  message?: string;
  duration: number;
}

export interface ApprovalRequest {
  id: string;
  type: "pipeline_deploy" | "policy_change" | "pii_access" | "dataset_onboard";
  requester: string;
  timestamp: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  evidencePackId: string;
  status: "pending" | "approved" | "rejected";
  approver?: string;
  approvalTimestamp?: string;
  approvalComment?: string;
  details: Record<string, unknown>;
}

export interface Policy {
  id: string;
  name: string;
  type: "access" | "quality" | "retention" | "approval";
  condition: string;
  action: "allow" | "block" | "require_approval";
  scope: {
    domains?: Domain[];
    piiLevels?: PIILevel[];
    jurisdictions?: Jurisdiction[];
  };
  approvers?: string[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  outcome: "success" | "blocked" | "requires_approval";
  policyResults: PolicyCheck[];
  evidenceRef?: string;
}
