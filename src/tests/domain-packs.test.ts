import { describe, it, expect } from 'vitest'
import {
  allDomainPacks,
  getDomainPack,
  getAllDomains,
  type DomainPack,
  type DatasetSpec,
  type GlossaryTerm,
  type PolicyRule,
  type NLQuestion,
  type ValidationResult,
} from '@/data/domain-packs'

function validateDomainPack(pack: DomainPack): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!pack.domain || pack.domain.trim() === '') {
    errors.push('Domain name is required')
  }

  if (!pack.description || pack.description.trim() === '') {
    errors.push('Domain description is required')
  }

  if (!pack.datasets || pack.datasets.length === 0) {
    errors.push('At least one dataset is required')
  }

  if (!pack.glossary || pack.glossary.length === 0) {
    warnings.push('No glossary terms defined')
  }

  if (!pack.policies || pack.policies.length === 0) {
    warnings.push('No policies defined')
  }

  if (!pack.sampleQuestions || pack.sampleQuestions.length < 2) {
    errors.push('At least 2 sample questions are required')
  }

  pack.datasets.forEach((dataset) => {
    const datasetErrors = validateDataset(dataset)
    errors.push(...datasetErrors.errors)
    warnings.push(...datasetErrors.warnings)
  })

  pack.glossary.forEach((term) => {
    const termErrors = validateGlossaryTerm(term)
    errors.push(...termErrors.errors)
    warnings.push(...termErrors.warnings)
  })

  pack.policies.forEach((policy) => {
    const policyErrors = validatePolicy(policy)
    errors.push(...policyErrors.errors)
    warnings.push(...policyErrors.warnings)
  })

  pack.sampleQuestions.forEach((question) => {
    const questionErrors = validateNLQuestion(question)
    errors.push(...questionErrors.errors)
    warnings.push(...questionErrors.warnings)
  })

  if (!pack.metadata || !pack.metadata.version) {
    errors.push('Metadata with version is required')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

function validateDataset(dataset: DatasetSpec): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!dataset.id || dataset.id.trim() === '') {
    errors.push(`Dataset missing id`)
  }

  if (!dataset.name || dataset.name.trim() === '') {
    errors.push(`Dataset ${dataset.id} missing name`)
  }

  if (!dataset.domain || dataset.domain.trim() === '') {
    errors.push(`Dataset ${dataset.id} missing domain`)
  }

  if (!dataset.owner || dataset.owner.trim() === '') {
    errors.push(`Dataset ${dataset.id} missing owner`)
  }

  if (!['NONE', 'LOW', 'MEDIUM', 'HIGH'].includes(dataset.piiLevel)) {
    errors.push(`Dataset ${dataset.id} has invalid piiLevel: ${dataset.piiLevel}`)
  }

  if (!['US', 'EU', 'APAC', 'GLOBAL'].includes(dataset.jurisdiction)) {
    errors.push(`Dataset ${dataset.id} has invalid jurisdiction: ${dataset.jurisdiction}`)
  }

  if (
    !['REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'].includes(dataset.freshnessSLA)
  ) {
    errors.push(`Dataset ${dataset.id} has invalid freshnessSLA: ${dataset.freshnessSLA}`)
  }

  if (!dataset.columns || dataset.columns.length === 0) {
    errors.push(`Dataset ${dataset.id} has no columns`)
  } else {
    dataset.columns.forEach((col) => {
      if (!col.name || col.name.trim() === '') {
        errors.push(`Dataset ${dataset.id} has column with missing name`)
      }
      if (!col.type || col.type.trim() === '') {
        errors.push(`Dataset ${dataset.id} column ${col.name} missing type`)
      }
      if (!col.description || col.description.trim() === '') {
        warnings.push(`Dataset ${dataset.id} column ${col.name} missing description`)
      }
    })
  }

  if (dataset.sampleRowCount <= 0) {
    errors.push(`Dataset ${dataset.id} has invalid sampleRowCount`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validateGlossaryTerm(term: GlossaryTerm): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!term.term || term.term.trim() === '') {
    errors.push('Glossary term missing term name')
  }

  if (!term.definition || term.definition.trim() === '') {
    errors.push(`Glossary term ${term.term} missing definition`)
  }

  if (!term.domain || term.domain.trim() === '') {
    errors.push(`Glossary term ${term.term} missing domain`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validatePolicy(policy: PolicyRule): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!policy.id || policy.id.trim() === '') {
    errors.push('Policy missing id')
  }

  if (!policy.name || policy.name.trim() === '') {
    errors.push(`Policy ${policy.id} missing name`)
  }

  if (!policy.description || policy.description.trim() === '') {
    errors.push(`Policy ${policy.id} missing description`)
  }

  if (!['dataset', 'domain', 'global'].includes(policy.scope)) {
    errors.push(`Policy ${policy.id} has invalid scope: ${policy.scope}`)
  }

  if (!policy.actions) {
    errors.push(`Policy ${policy.id} missing actions`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

function validateNLQuestion(question: NLQuestion): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!question.question || question.question.trim() === '') {
    errors.push('NL Question missing question text')
  }

  if (!question.expectedIntent) {
    errors.push('NL Question missing expectedIntent')
  } else {
    if (!question.expectedIntent.measures || question.expectedIntent.measures.length === 0) {
      errors.push(`NL Question "${question.question}" missing measures in expectedIntent`)
    }
  }

  if (!question.expectedDatasets || question.expectedDatasets.length === 0) {
    errors.push(`NL Question "${question.question}" missing expectedDatasets`)
  }

  if (question.requiresApproval === undefined || question.requiresApproval === null) {
    warnings.push(`NL Question "${question.question}" missing requiresApproval flag`)
  }

  return { valid: errors.length === 0, errors, warnings }
}

describe('Domain Packs', () => {
  describe('Module Exports', () => {
    it('should export allDomainPacks', () => {
      expect(allDomainPacks).toBeDefined()
      expect(Array.isArray(allDomainPacks)).toBe(true)
      expect(allDomainPacks.length).toBeGreaterThan(0)
    })

    it('should export getDomainPack function', () => {
      expect(typeof getDomainPack).toBe('function')
    })

    it('should export getAllDomains function', () => {
      expect(typeof getAllDomains).toBe('function')
    })
  })

  describe('Domain Pack Count', () => {
    it('should have exactly 3 domain packs', () => {
      expect(allDomainPacks.length).toBe(3)
    })

    it('should include Credit Risk pack', () => {
      const pack = getDomainPack('Credit Risk')
      expect(pack).toBeDefined()
      expect(pack?.domain).toBe('Credit Risk')
    })

    it('should include AML/FCC pack', () => {
      const pack = getDomainPack('AML/FCC')
      expect(pack).toBeDefined()
      expect(pack?.domain).toBe('AML/FCC')
    })

    it('should include Finance/Reg Reporting pack', () => {
      const pack = getDomainPack('Finance/Reg Reporting')
      expect(pack).toBeDefined()
      expect(pack?.domain).toBe('Finance/Reg Reporting')
    })
  })

  describe('Domain Pack Validation', () => {
    allDomainPacks.forEach((pack) => {
      describe(`${pack.domain} Pack`, () => {
        let validationResult: ValidationResult

        it('should pass overall validation', () => {
          validationResult = validateDomainPack(pack)
          if (!validationResult.valid) {
            console.error(`Validation errors for ${pack.domain}:`, validationResult.errors)
          }
          expect(validationResult.valid).toBe(true)
          expect(validationResult.errors).toHaveLength(0)
        })

        it('should have required metadata', () => {
          expect(pack.metadata).toBeDefined()
          expect(pack.metadata.version).toBeDefined()
          expect(pack.metadata.created).toBeDefined()
          expect(pack.metadata.author).toBeDefined()
        })

        it('should have at least one dataset with synthetic demo data', () => {
          expect(pack.datasets).toBeDefined()
          expect(pack.datasets.length).toBeGreaterThan(0)
          pack.datasets.forEach((dataset) => {
            expect(dataset.sampleRowCount).toBeGreaterThan(0)
          })
        })

        it('should have glossary terms', () => {
          expect(pack.glossary).toBeDefined()
          expect(pack.glossary.length).toBeGreaterThan(0)
        })

        it('should have policies', () => {
          expect(pack.policies).toBeDefined()
          expect(pack.policies.length).toBeGreaterThan(0)
        })

        it('should have at least 2 sample NL questions', () => {
          expect(pack.sampleQuestions).toBeDefined()
          expect(pack.sampleQuestions.length).toBeGreaterThanOrEqual(2)
        })

        it('all datasets should have valid schemas', () => {
          pack.datasets.forEach((dataset) => {
            const result = validateDataset(dataset)
            if (!result.valid) {
              console.error(`Dataset ${dataset.id} validation errors:`, result.errors)
            }
            expect(result.valid).toBe(true)
          })
        })

        it('all sample questions should reference existing datasets', () => {
          const datasetIds = pack.datasets.map((d) => d.id)
          pack.sampleQuestions.forEach((q) => {
            q.expectedDatasets.forEach((dsId) => {
              expect(datasetIds).toContain(dsId)
            })
          })
        })
      })
    })
  })

  describe('Demo Mode Capabilities', () => {
    it('each pack should be runnable in demo mode', () => {
      allDomainPacks.forEach((pack) => {
        expect(pack.datasets.every((d) => d.sampleRowCount > 0)).toBe(true)
        expect(pack.sampleQuestions.length >= 2).toBe(true)
      })
    })

    it('should have synthetic data specifications', () => {
      allDomainPacks.forEach((pack) => {
        pack.datasets.forEach((dataset) => {
          expect(dataset.columns.length).toBeGreaterThan(0)
          dataset.columns.forEach((col) => {
            expect(col.name).toBeDefined()
            expect(col.type).toBeDefined()
            expect(col.nullable !== undefined).toBe(true)
          })
        })
      })
    })
  })

  describe('Sample NL Questions', () => {
    allDomainPacks.forEach((pack) => {
      describe(`${pack.domain} Questions`, () => {
        it('should have expected intents with measures', () => {
          pack.sampleQuestions.forEach((q) => {
            expect(q.expectedIntent).toBeDefined()
            expect(q.expectedIntent.measures).toBeDefined()
            expect(q.expectedIntent.measures.length).toBeGreaterThan(0)
          })
        })

        it('should specify approval requirements', () => {
          pack.sampleQuestions.forEach((q) => {
            expect(typeof q.requiresApproval).toBe('boolean')
          })
        })
      })
    })
  })

  describe('Policy Coverage', () => {
    allDomainPacks.forEach((pack) => {
      describe(`${pack.domain} Policies`, () => {
        it('should have HIGH PII protection policies where applicable', () => {
          const hasHighPII = pack.datasets.some((d) => d.piiLevel === 'HIGH')
          if (hasHighPII) {
            const hasPIIPolicy = pack.policies.some(
              (p) => p.conditions.piiLevel && p.conditions.piiLevel.includes('HIGH')
            )
            expect(hasPIIPolicy).toBe(true)
          }
        })

        it('all policies should have valid scopes', () => {
          pack.policies.forEach((policy) => {
            expect(['dataset', 'domain', 'global']).toContain(policy.scope)
          })
        })
      })
    })
  })
})
