# Banking Capability Domain Taxonomy

## Overview

This document defines the generic banking capability domains used throughout the AUREUS platform. These domains represent common functional areas found across all banks and financial institutions, independent of specific organizational structures.

## Domain Taxonomy

### 1. Credit Risk
**Purpose**: Manage and monitor credit exposure, loan portfolios, and counterparty risk.

**Key Capabilities**:
- Portfolio risk monitoring and reporting
- Credit exposure analysis and limits management
- Risk rating assignment and review
- Loan performance tracking (NPL, delinquency rates)
- Expected credit loss (ECL) calculation
- Concentration risk management
- Stress testing and scenario analysis

**Typical Data Assets**:
- Loan portfolios (retail, commercial, corporate)
- Credit ratings and scores
- Collateral valuations
- Exposure at default (EAD) calculations
- Loss given default (LGD) estimates
- Probability of default (PD) models

**Regulatory Context**:
- Basel III/IV capital requirements
- IFRS 9 / CECL accounting standards
- Stress testing (CCAR, DFAST)

---

### 2. Financial Crime Compliance (FCC) / Anti-Money Laundering (AML)
**Purpose**: Detect, investigate, and report suspicious activities and ensure compliance with AML/CFT regulations.

**Key Capabilities**:
- Transaction monitoring and alert generation
- Alert triage and investigation
- Customer due diligence (CDD) and enhanced due diligence (EDD)
- Sanctions screening (OFAC, UN, EU lists)
- Suspicious activity reporting (SAR/STR filing)
- Know Your Customer (KYC) processes
- Risk scoring and segmentation

**Typical Data Assets**:
- Transaction alerts and cases
- Customer risk profiles
- Sanctions lists and watchlists
- Investigation notes and outcomes
- SAR/STR filings
- Screening results (name, geography, entity)

**Regulatory Context**:
- Bank Secrecy Act (BSA)
- USA PATRIOT Act
- Financial Action Task Force (FATF) recommendations
- OFAC sanctions programs
- FinCEN regulations

---

### 3. Finance / Regulatory Reporting
**Purpose**: Produce accurate financial statements and regulatory reports in compliance with accounting standards and regulatory requirements.

**Key Capabilities**:
- Financial statement preparation (P&L, Balance Sheet, Cash Flow)
- Regulatory reporting (Call Reports, FINREP, COREP)
- Management information systems (MIS) reporting
- Reconciliation and control processes
- Chart of accounts management
- General ledger operations
- Budgeting and forecasting

**Typical Data Assets**:
- General ledger entries
- Trial balances
- Regulatory report submissions
- Reconciliation records
- Control totals and variance analysis
- Financial close schedules

**Regulatory Context**:
- GAAP / IFRS accounting standards
- Basel III Pillar 3 disclosures
- FINREP / COREP (EU)
- Federal Reserve Call Reports (FFIEC 031/041)
- Securities and Exchange Commission (SEC) filings

---

### 4. Treasury / Markets
**Purpose**: Manage liquidity, funding, trading positions, and market risk.

**Key Capabilities**:
- Liquidity coverage ratio (LCR) monitoring
- Net stable funding ratio (NSFR) tracking
- Trading book management
- Market risk measurement (VaR, stress VaR)
- Asset-liability management (ALM)
- Funding and capital planning
- Foreign exchange (FX) and interest rate risk management

**Typical Data Assets**:
- Trading positions (securities, derivatives)
- Market data (prices, rates, curves)
- Liquidity buffers and cash flows
- Funding plans and maturity profiles
- Risk sensitivities (Greeks, DV01)

**Regulatory Context**:
- Basel III liquidity requirements (LCR, NSFR)
- Dodd-Frank Act
- MiFID II (EU)
- Volcker Rule

---

### 5. Retail / Channels
**Purpose**: Manage customer accounts, transactions, and multi-channel banking experiences.

**Key Capabilities**:
- Customer account management
- Transaction processing and settlement
- Digital banking (online, mobile)
- Branch and ATM operations
- Product sales and cross-sell analytics
- Customer segmentation and profiling

**Typical Data Assets**:
- Customer accounts (checking, savings, credit cards)
- Transaction histories
- Channel usage metrics (web, mobile, branch)
- Product holdings and balances
- Customer demographics and preferences

**Regulatory Context**:
- Regulation E (Electronic Fund Transfers)
- Regulation Z (Truth in Lending)
- Fair Lending regulations
- Privacy regulations (GDPR, CCPA)

---

### 6. Operations / Service
**Purpose**: Ensure operational efficiency, service quality, and process optimization.

**Key Capabilities**:
- Operational risk monitoring
- Service level agreement (SLA) tracking
- Incident and problem management
- Process automation and optimization
- Vendor and third-party management
- Business continuity planning

**Typical Data Assets**:
- Operational loss events
- Service metrics (availability, response time)
- Incident records
- Process execution logs
- Vendor performance data

**Regulatory Context**:
- Operational risk capital requirements (Basel III)
- Third-party risk management guidance
- Business continuity regulations

---

## Cross-Domain Considerations

### Data Quality
All domains require rigorous data quality controls including:
- Completeness checks
- Accuracy validation
- Timeliness monitoring
- Consistency rules
- Integrity constraints

### Data Governance
Common governance requirements across domains:
- Data ownership and stewardship
- Access controls and authorization
- Data retention and archival policies
- Privacy and PII protection
- Audit trails and lineage tracking

### Metadata Management
Standard metadata elements:
- Dataset name, description, and purpose
- Business owner and technical contact
- Data classification (confidential, restricted, public)
- PII level (NONE, LOW, MEDIUM, HIGH)
- Jurisdiction (US, EU, APAC, etc.)
- Freshness SLA (hourly, daily, weekly)
- Schema definitions and data dictionaries

---

## Domain Pack Structure

Each domain pack in the AUREUS platform includes:

1. **Sample Datasets**: Realistic synthetic data specifications
2. **Glossary Terms**: Business terminology and definitions
3. **Policies**: Access control and usage policies
4. **Sample NL Questions**: Natural language queries with expected intents
5. **Data Quality Rules**: Validation and integrity checks
6. **SLA Specifications**: Freshness and availability requirements

---

## Usage in AUREUS Platform

The platform uses this taxonomy to:
- **Classify datasets** by domain for easier discovery
- **Apply domain-specific policies** (e.g., stricter controls for Credit Risk)
- **Generate domain-aware queries** leveraging domain glossaries
- **Enforce domain-based access controls** (role-based, attribute-based)
- **Provide domain context** to LLM-assisted features (queries, pipelines, configs)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial taxonomy definition |

---

## References

- Basel Committee on Banking Supervision (BCBS)
- Financial Action Task Force (FATF)
- International Financial Reporting Standards (IFRS)
- Generally Accepted Accounting Principles (GAAP)
- Federal Financial Institutions Examination Council (FFIEC)
