export * from './types'
export { creditRiskPack } from './credit-risk'
export { amlFccPack } from './aml-fcc'
export { financeReportingPack } from './finance-reporting'

import { creditRiskPack } from './credit-risk'
import { amlFccPack } from './aml-fcc'
import { financeReportingPack } from './finance-reporting'
import type { DomainPack } from './types'

export const allDomainPacks: DomainPack[] = [
  creditRiskPack,
  amlFccPack,
  financeReportingPack,
]

export function getDomainPack(domain: string): DomainPack | undefined {
  return allDomainPacks.find((pack) => pack.domain === domain)
}

export function getAllDomains(): string[] {
  return allDomainPacks.map((pack) => pack.domain)
}
