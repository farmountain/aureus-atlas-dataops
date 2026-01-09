export interface PromptValidationResult {
  isValid: boolean;
  issues: string[];
  sanitizedInput?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions?/i,
  /disregard\s+all\s+previous/i,
  /forget\s+(everything|all|previous)/i,
  /new\s+instructions?:/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /you\s+are\s+now/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if/i,
  /SELECT\s+\*\s+FROM\s+\w+\s+WHERE\s+1\s*=\s*1/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /INSERT\s+INTO/i,
  /UPDATE\s+\w+\s+SET/i,
  /EXEC(?:UTE)?\s*\(/i,
  /eval\s*\(/i,
  /__import__\s*\(/i,
  /subprocess\./i,
  /os\.system/i,
  /exec\s*\(/i,
  /\{\{.*?\}\}/,
  /<script.*?>/i,
  /javascript:/i,
  /onerror\s*=/i,
  /onload\s*=/i,
];

const TOOL_EXECUTION_KEYWORDS = [
  'execute',
  'run',
  'invoke',
  'call',
  'trigger',
  'function',
  'command',
  'shell',
  'bash',
  'powershell',
  'cmd',
];

const SQL_KEYWORDS_IN_PROMPT = [
  'DROP',
  'DELETE',
  'TRUNCATE',
  'ALTER',
  'CREATE',
  'GRANT',
  'REVOKE',
];

export function validateUserInput(input: string, context: 'query' | 'config' | 'general'): PromptValidationResult {
  const issues: string[] = [];
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  if (!input || input.trim().length === 0) {
    return {
      isValid: false,
      issues: ['Input cannot be empty'],
      riskLevel: 'LOW',
    };
  }

  if (input.length > 10000) {
    issues.push('Input exceeds maximum length (10000 characters)');
    riskLevel = 'MEDIUM';
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      issues.push(`Potential prompt injection detected: ${pattern.source}`);
      riskLevel = 'CRITICAL';
    }
  }

  const upperInput = input.toUpperCase();
  for (const keyword of SQL_KEYWORDS_IN_PROMPT) {
    if (upperInput.includes(keyword)) {
      issues.push(`Suspicious SQL keyword detected in prompt: ${keyword}`);
      riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    }
  }

  for (const keyword of TOOL_EXECUTION_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\s+(command|script|code|tool)`, 'i');
    if (regex.test(input)) {
      issues.push(`Potential tool execution request detected: "${keyword}"`);
      riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    }
  }

  const repeatedChars = /(.)\1{50,}/;
  if (repeatedChars.test(input)) {
    issues.push('Suspicious repeated character pattern detected');
    riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';
  }

  const suspiciousEncoding = /(%[0-9a-f]{2}){10,}/i;
  if (suspiciousEncoding.test(input)) {
    issues.push('Suspicious URL encoding detected');
    riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM';
  }

  return {
    isValid: issues.length === 0,
    issues,
    sanitizedInput: sanitizeInput(input),
    riskLevel,
  };
}

function sanitizeInput(input: string): string {
  let sanitized = input.trim();
  
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  sanitized = sanitized.substring(0, 10000);
  
  return sanitized;
}

export function enforceRetrievalGrounding(
  userQuery: string,
  allowedDatasets: string[],
  allowedDomains: string[]
): PromptValidationResult {
  const issues: string[] = [];
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  const validation = validateUserInput(userQuery, 'query');
  if (!validation.isValid) {
    return validation;
  }

  if (allowedDatasets.length === 0) {
    issues.push('No datasets specified for retrieval grounding');
    riskLevel = 'HIGH';
  }

  if (allowedDomains.length === 0) {
    issues.push('No domains specified for retrieval grounding');
    riskLevel = 'MEDIUM';
  }

  return {
    isValid: issues.length === 0,
    issues,
    riskLevel,
  };
}

export function validateGeneratedSQL(sql: string, allowedTables: string[]): PromptValidationResult {
  const issues: string[] = [];
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  const upperSQL = sql.toUpperCase().trim();

  if (!upperSQL.startsWith('SELECT')) {
    issues.push('Generated SQL must be a SELECT statement');
    riskLevel = 'CRITICAL';
  }

  const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'INSERT', 'UPDATE'];
  for (const keyword of dangerousKeywords) {
    if (upperSQL.includes(keyword)) {
      issues.push(`Dangerous SQL keyword detected: ${keyword}`);
      riskLevel = 'CRITICAL';
    }
  }

  const multiStatement = /;\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/i;
  if (multiStatement.test(sql)) {
    issues.push('Multiple SQL statements detected (SQL injection risk)');
    riskLevel = 'CRITICAL';
  }

  const sqlComments = /(--)|\/\*|\*\/|#/;
  if (sqlComments.test(sql)) {
    issues.push('SQL comments detected (potential obfuscation)');
    riskLevel = 'HIGH';
  }

  if (upperSQL.includes('WHERE 1=1') || upperSQL.includes('WHERE 1 = 1')) {
    issues.push('Suspicious WHERE clause detected (WHERE 1=1)');
    riskLevel = 'HIGH';
  }

  const tablePattern = /FROM\s+([a-zA-Z0-9_]+)/gi;
  const matches = sql.matchAll(tablePattern);
  for (const match of matches) {
    const tableName = match[1].toLowerCase();
    if (!allowedTables.map(t => t.toLowerCase()).includes(tableName)) {
      issues.push(`Unauthorized table access: ${tableName}`);
      riskLevel = 'CRITICAL';
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    riskLevel,
  };
}

export function validateLLMOutput(
  output: string,
  expectedSchema?: Record<string, unknown>
): PromptValidationResult {
  const issues: string[] = [];
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  if (!output || output.trim().length === 0) {
    issues.push('LLM output is empty');
    riskLevel = 'HIGH';
    return { isValid: false, issues, riskLevel };
  }

  if (output.length > 100000) {
    issues.push('LLM output exceeds maximum length');
    riskLevel = 'MEDIUM';
  }

  if (expectedSchema) {
    try {
      const parsed = JSON.parse(output);
      
      const schemaKeys = Object.keys(expectedSchema);
      const outputKeys = Object.keys(parsed);
      
      for (const key of schemaKeys) {
        if (!outputKeys.includes(key)) {
          issues.push(`Missing expected field in LLM output: ${key}`);
          riskLevel = 'MEDIUM';
        }
      }
    } catch (error) {
      issues.push('LLM output is not valid JSON when JSON schema expected');
      riskLevel = 'HIGH';
    }
  }

  const codeExecution = /<script|javascript:|onerror=|onload=/i;
  if (codeExecution.test(output)) {
    issues.push('Potential code execution in LLM output');
    riskLevel = 'CRITICAL';
  }

  return {
    isValid: issues.length === 0,
    issues,
    riskLevel,
  };
}

export const PromptInjectionDefenses = {
  validateUserInput,
  enforceRetrievalGrounding,
  validateGeneratedSQL,
  validateLLMOutput,
};
