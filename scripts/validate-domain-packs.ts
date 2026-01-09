#!/usr/bin/env tsx

import * as fs from 'fs'
import * as path from 'path'
import { allDomainPacks, type DomainPack, type ValidationResult } from '../src/data/domain-packs'

const EVIDENCE_DIR = path.join(process.cwd(), 'evidence', 'domain_pack_smoke_run')

function validateDomainPack(pack: DomainPack): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  console.log(`\n🔍 Validating ${pack.domain} pack...`)

  if (!pack.domain || pack.domain.trim() === '') {
    errors.push('Domain name is required')
  }

  if (!pack.description || pack.description.trim() === '') {
    errors.push('Domain description is required')
  }

  if (!pack.datasets || pack.datasets.length === 0) {
    errors.push('At least one dataset is required')
  } else {
    console.log(`  ✓ Found ${pack.datasets.length} datasets`)
  }

  if (!pack.glossary || pack.glossary.length === 0) {
    warnings.push('No glossary terms defined')
  } else {
    console.log(`  ✓ Found ${pack.glossary.length} glossary terms`)
  }

  if (!pack.policies || pack.policies.length === 0) {
    warnings.push('No policies defined')
  } else {
    console.log(`  ✓ Found ${pack.policies.length} policies`)
  }

  if (!pack.sampleQuestions || pack.sampleQuestions.length < 2) {
    errors.push('At least 2 sample questions are required')
  } else {
    console.log(`  ✓ Found ${pack.sampleQuestions.length} sample questions`)
  }

  if (!pack.metadata || !pack.metadata.version) {
    errors.push('Metadata with version is required')
  } else {
    console.log(`  ✓ Metadata version: ${pack.metadata.version}`)
  }

  pack.datasets.forEach((dataset) => {
    if (!dataset.id || !dataset.name) {
      errors.push(`Dataset missing id or name`)
    }
    if (!dataset.columns || dataset.columns.length === 0) {
      errors.push(`Dataset ${dataset.id} has no columns`)
    }
    if (dataset.sampleRowCount <= 0) {
      errors.push(`Dataset ${dataset.id} has invalid sampleRowCount`)
    }
  })

  pack.sampleQuestions.forEach((q) => {
    if (!q.question || !q.expectedIntent || !q.expectedDatasets) {
      errors.push(`Sample question incomplete`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

function generateEvidencePack() {
  console.log('🚀 Starting domain pack validation and evidence generation...\n')

  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
    console.log(`📁 Created evidence directory: ${EVIDENCE_DIR}\n`)
  }

  const timestamp = new Date().toISOString()
  const results: Record<string, ValidationResult> = {}
  let allValid = true

  allDomainPacks.forEach((pack) => {
    const result = validateDomainPack(pack)
    results[pack.domain] = result

    if (!result.valid) {
      allValid = false
      console.log(`  ❌ Validation failed`)
      result.errors.forEach((err) => console.log(`     ERROR: ${err}`))
    } else {
      console.log(`  ✅ Validation passed`)
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach((warn) => console.log(`     WARNING: ${warn}`))
    }
  })

  const evidenceJson = {
    timestamp,
    executionContext: 'Domain Pack Smoke Run',
    totalPacks: allDomainPacks.length,
    validationResults: results,
    allValid,
    summary: {
      totalDatasets: allDomainPacks.reduce((sum, p) => sum + p.datasets.length, 0),
      totalGlossaryTerms: allDomainPacks.reduce((sum, p) => sum + p.glossary.length, 0),
      totalPolicies: allDomainPacks.reduce((sum, p) => sum + p.policies.length, 0),
      totalSampleQuestions: allDomainPacks.reduce((sum, p) => sum + p.sampleQuestions.length, 0),
    },
    packs: allDomainPacks.map((pack) => ({
      domain: pack.domain,
      description: pack.description,
      datasetCount: pack.datasets.length,
      glossaryTermCount: pack.glossary.length,
      policyCount: pack.policies.length,
      sampleQuestionCount: pack.sampleQuestions.length,
      datasets: pack.datasets.map((ds) => ({
        id: ds.id,
        name: ds.name,
        piiLevel: ds.piiLevel,
        jurisdiction: ds.jurisdiction,
        freshnessSLA: ds.freshnessSLA,
        columnCount: ds.columns.length,
        sampleRowCount: ds.sampleRowCount,
      })),
      sampleQuestions: pack.sampleQuestions.map((q) => ({
        question: q.question,
        measures: q.expectedIntent.measures,
        datasets: q.expectedDatasets,
        requiresApproval: q.requiresApproval,
      })),
    })),
  }

  const jsonPath = path.join(EVIDENCE_DIR, 'validation_results.json')
  fs.writeFileSync(jsonPath, JSON.stringify(evidenceJson, null, 2))
  console.log(`\n📄 Written evidence JSON: ${jsonPath}`)

  const mdContent = `# Domain Pack Validation Evidence

**Timestamp**: ${timestamp}  
**Execution Context**: Domain Pack Smoke Run

## Summary

- **Total Packs**: ${evidenceJson.totalPacks}
- **All Valid**: ${allValid ? '✅ YES' : '❌ NO'}
- **Total Datasets**: ${evidenceJson.summary.totalDatasets}
- **Total Glossary Terms**: ${evidenceJson.summary.totalGlossaryTerms}
- **Total Policies**: ${evidenceJson.summary.totalPolicies}
- **Total Sample Questions**: ${evidenceJson.summary.totalSampleQuestions}

## Validation Results

${allDomainPacks
  .map((pack) => {
    const result = results[pack.domain]
    return `### ${pack.domain}

**Status**: ${result.valid ? '✅ PASSED' : '❌ FAILED'}  
**Datasets**: ${pack.datasets.length}  
**Glossary Terms**: ${pack.glossary.length}  
**Policies**: ${pack.policies.length}  
**Sample Questions**: ${pack.sampleQuestions.length}

${
  result.errors.length > 0
    ? `**Errors**:\n${result.errors.map((e) => `- ${e}`).join('\n')}\n`
    : ''
}
${
  result.warnings.length > 0
    ? `**Warnings**:\n${result.warnings.map((w) => `- ${w}`).join('\n')}\n`
    : ''
}

**Datasets**:
${pack.datasets
  .map(
    (ds) =>
      `- **${ds.name}** (${ds.id}): ${ds.columns.length} columns, ~${ds.sampleRowCount.toLocaleString()} rows, PII: ${ds.piiLevel}`
  )
  .join('\n')}

**Sample Questions**:
${pack.sampleQuestions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}
`
  })
  .join('\n---\n\n')}

## Detailed Pack Information

${allDomainPacks
  .map(
    (pack) => `### ${pack.domain}

**Description**: ${pack.description}

**Datasets**:
${pack.datasets
  .map(
    (ds) => `
#### ${ds.name}
- **ID**: ${ds.id}
- **PII Level**: ${ds.piiLevel}
- **Jurisdiction**: ${ds.jurisdiction}
- **Freshness SLA**: ${ds.freshnessSLA}
- **Columns**: ${ds.columns.length}
- **Sample Rows**: ${ds.sampleRowCount.toLocaleString()}
- **Key Columns**: ${ds.columns.slice(0, 5).map((c) => c.name).join(', ')}${ds.columns.length > 5 ? ', ...' : ''}
`
  )
  .join('\n')}

**Glossary Terms** (${pack.glossary.length}):
${pack.glossary.map((t) => `- **${t.term}**: ${t.definition.substring(0, 100)}${t.definition.length > 100 ? '...' : ''}`).join('\n')}

**Policies** (${pack.policies.length}):
${pack.policies.map((p) => `- **${p.name}**: ${p.description}`).join('\n')}

**Sample Questions**:
${pack.sampleQuestions
  .map(
    (q, i) => `
${i + 1}. **Question**: ${q.question}
   - **Measures**: ${q.expectedIntent.measures.join(', ')}
   - **Datasets**: ${q.expectedDatasets.join(', ')}
   - **Requires Approval**: ${q.requiresApproval ? 'Yes' : 'No'}
`
  )
  .join('\n')}
`
  )
  .join('\n---\n\n')}

## Conclusion

${allValid ? '✅ All domain packs validated successfully and are ready for demo mode.' : '❌ Some domain packs failed validation. Review errors above.'}

---

*Generated by validate-domain-packs.ts*
`

  const mdPath = path.join(EVIDENCE_DIR, 'validation_results.md')
  fs.writeFileSync(mdPath, mdContent)
  console.log(`📄 Written evidence markdown: ${mdPath}`)

  console.log('\n' + '='.repeat(60))
  console.log('📊 VALIDATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total Packs: ${evidenceJson.totalPacks}`)
  console.log(`All Valid: ${allValid ? '✅ YES' : '❌ NO'}`)
  console.log(`Total Datasets: ${evidenceJson.summary.totalDatasets}`)
  console.log(`Total Glossary Terms: ${evidenceJson.summary.totalGlossaryTerms}`)
  console.log(`Total Policies: ${evidenceJson.summary.totalPolicies}`)
  console.log(`Total Sample Questions: ${evidenceJson.summary.totalSampleQuestions}`)
  console.log('='.repeat(60))

  if (!allValid) {
    console.error('\n❌ Validation failed. See errors above.')
    process.exit(1)
  }

  console.log('\n✅ All domain packs validated successfully!')
  console.log(`📁 Evidence artifacts written to: ${EVIDENCE_DIR}\n`)
}

generateEvidencePack()
